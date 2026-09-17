import {
  Coach,
  Team,
  Player,
  BaseballEvent,
  PitcherSession,
  Pitch,
  PitchOutcome,
  PitchType,
  StrikeSubDetail,
  InPlaySubDetail,
  PitchLocation,
  PitchRulePresetId,
  SafetyWarningFlag,
} from './types';
import { db, auth } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

const STORAGE_KEY = 'pitch_tracker_data_v2';
const CURRENT_COACH_KEY = 'pitch_tracker_current_coach_v2';
const AUTH_STATUS_KEY = 'pitch_tracker_auth_status_v2';

export function extractCleanInviteCode(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  if (cleaned.includes('join=')) {
    try {
      const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
      cleaned = url.searchParams.get('join') || cleaned;
    } catch (e) {
      const match = cleaned.match(/join=([^&]+)/i);
      if (match) cleaned = decodeURIComponent(match[1]);
    }
  }
  // Strip any trailing slashes, quotes, URL query parameters or hash fragments
  cleaned = cleaned.replace(/[?#&].*$/, '').replace(/['"]/g, '').trim().toUpperCase();
  return cleaned;
}

interface AppData {
  coaches: Coach[];
  teams: Team[];
  players: Player[];
  events: BaseballEvent[];
  sessions: PitcherSession[];
  pitches: Pitch[];
}

const DEFAULT_COACHES: Coach[] = [];
const DEFAULT_TEAMS: Team[] = [];
const DEFAULT_PLAYERS: Player[] = [];
const DEFAULT_EVENTS: BaseballEvent[] = [];
const DEFAULT_SESSIONS: PitcherSession[] = [];
const DEFAULT_PITCHES: Pitch[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
let currentSyncStatus: SyncStatus = 'synced';
let lastSyncTimestamp: string | null = null;
const syncStatusListeners = new Set<(status: SyncStatus, lastSync: string | null) => void>();

const syncChannel =
  typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('pitch_tracker_sync_channel')
    : null;

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data?.type === 'DATA_UPDATED') {
      listeners.forEach((fn) => fn());
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      listeners.forEach((fn) => fn());
    }
  });
}

function notify(broadcast = true) {
  listeners.forEach((fn) => fn());
  if (broadcast && syncChannel) {
    try {
      syncChannel.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
    } catch {
      // ignore channel errors
    }
  }
}

function notifySyncStatus(status: SyncStatus) {
  currentSyncStatus = status;
  if (status === 'synced') {
    lastSyncTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  syncStatusListeners.forEach((fn) => fn(currentSyncStatus, lastSyncTimestamp));
}

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeToSyncStatus(
  listener: (status: SyncStatus, lastSync: string | null) => void,
): () => void {
  syncStatusListeners.add(listener);
  listener(currentSyncStatus, lastSyncTimestamp);
  return () => {
    syncStatusListeners.delete(listener);
  };
}

export function getSyncStatus(): { status: SyncStatus; lastSync: string | null } {
  return { status: currentSyncStatus, lastSync: lastSyncTimestamp };
}

let activeCloudUnsubscribe: Unsubscribe | null = null;
let currentCloudDocId: string | null = null;
let isPushingToCloud = false;
let isInitialSyncComplete = false;
let cloudSaveTimer: any = null;

function getCoachDocId(coach?: Coach | null): string | null {
  const current = coach || getCurrentCoach();
  if (!current) return null;
  if (current.email) {
    return current.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
  return current.googleId || current.id;
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.teams)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load pitch tracker data:', err);
  }

  const initial: AppData = {
    coaches: DEFAULT_COACHES,
    teams: DEFAULT_TEAMS,
    players: DEFAULT_PLAYERS,
    events: DEFAULT_EVENTS,
    sessions: DEFAULT_SESSIONS,
    pitches: DEFAULT_PITCHES,
  };
  saveData(initial);
  return initial;
}

function saveData(data: AppData, skipCloud = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to persist pitch tracker data locally:', err);
  }
  notify();

  if (!skipCloud) {
    pushToFirestoreDebounced(data);
  }
}

export async function syncSingleTeamToCloud(team: Team, dataOverride?: AppData): Promise<void> {
  if (!team || !team.id) return;
  const data = dataOverride || loadData();
  const teamPlayers = data.players.filter((p) => p.teamId === team.id);
  const playerIds = new Set(teamPlayers.map((p) => p.id));
  const teamEvents = data.events.filter((e) => e.teamId === team.id);
  const eventIds = new Set(teamEvents.map((e) => e.id));
  const teamSessions = data.sessions.filter(
    (s) => eventIds.has(s.eventId) || playerIds.has(s.pitcherId),
  );
  const sessionIds = new Set(teamSessions.map((s) => s.id));
  const teamPitches = data.pitches.filter(
    (p) => sessionIds.has(p.sessionId) || eventIds.has(p.eventId) || playerIds.has(p.pitcherId),
  );

  const creator = data.coaches.find((c) => c.id === team.createdBy);
  const cleanCode = team.inviteCode ? extractCleanInviteCode(team.inviteCode) : null;
  const cleanCodeWithoutDash = cleanCode ? cleanCode.replace(/-/g, '') : null;

  const payload = {
    id: team.id,
    name: team.name,
    imageUrl: team.imageUrl || null,
    createdBy: team.createdBy,
    creatorEmail: creator?.email || null,
    creatorName: creator?.name || null,
    createdAt: team.createdAt,
    memberCoachIds: team.memberCoachIds || [],
    inviteCode: team.inviteCode,
    inviteCodeCreatedAt: team.inviteCodeCreatedAt,
    pitchRulePresetId: team.pitchRulePresetId || 'usa_pitch_smart',
    players: teamPlayers,
    events: teamEvents,
    sessions: teamSessions,
    pitches: teamPitches,
    lastUpdated: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'teams', team.id), payload, { merge: true });
    if (cleanCode) {
      await setDoc(doc(db, 'invite_codes', cleanCode), payload, { merge: true });
      if (cleanCodeWithoutDash && cleanCodeWithoutDash !== cleanCode) {
        await setDoc(doc(db, 'invite_codes', cleanCodeWithoutDash), payload, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Notice writing team/invite record to Firestore:', err);
  }
}

export function syncTeamByEventId(eventId: string, data?: AppData): void {
  const currentData = data || loadData();
  const event = currentData.events.find((e) => e.id === eventId);
  if (event?.teamId) {
    const team = currentData.teams.find((t) => t.id === event.teamId);
    if (team) {
      syncSingleTeamToCloud(team, currentData).catch((err) =>
        console.warn('Notice on instant team cloud sync by event:', err),
      );
    }
  }
}

export function syncTeamBySessionId(sessionId: string, data?: AppData): void {
  const currentData = data || loadData();
  const session = currentData.sessions.find((s) => s.id === sessionId);
  if (session?.eventId) {
    syncTeamByEventId(session.eventId, currentData);
  }
}

async function syncTeamAndInvitesToFirestore(teams: Team[], players?: Player[], coaches?: Coach[]) {
  const currentData = loadData();
  for (const team of teams) {
    if (!team || !team.id) continue;
    await syncSingleTeamToCloud(team, {
      coaches: coaches || currentData.coaches,
      teams: currentData.teams,
      players: players || currentData.players,
      events: currentData.events,
      sessions: currentData.sessions,
      pitches: currentData.pitches,
    });
  }
}

async function pushToFirestoreDebounced(data: AppData) {
  if (!isInitialSyncComplete) {
    // Skip saving back to Firestore during the initial sync loading phase
    return;
  }

  if (cloudSaveTimer) {
    clearTimeout(cloudSaveTimer);
  }

  cloudSaveTimer = setTimeout(async () => {
    const docId = currentCloudDocId || getCoachDocId();
    if (!docId) return;

    try {
      notifySyncStatus('syncing');
      isPushingToCloud = true;
      const coachDocRef = doc(db, 'coaches', docId, 'state', 'current');
      await setDoc(
        coachDocRef,
        {
          ...data,
          lastUpdated: new Date().toISOString(),
          updatedBy: docId,
        },
        { merge: true },
      );

      // Also publish teams and active invite codes to the shared directory
      await syncTeamAndInvitesToFirestore(data.teams, data.players, data.coaches);

      notifySyncStatus('synced');
    } catch (err) {
      console.warn('Firestore cloud sync notice (will retry or operate offline):', err);
      notifySyncStatus('offline');
    } finally {
      isPushingToCloud = false;
    }
  }, 400);
}

// Merge remote cloud state with local state
function mergeAppData(local: AppData, remote: any): AppData {
  if (!remote || typeof remote !== 'object') return local;

  const mergeById = <T extends { id: string }>(localArr: T[] = [], remoteArr: any[] = []): T[] => {
    if (!Array.isArray(remoteArr)) return localArr;
    const map = new Map<string, T>();
    localArr.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    remoteArr.forEach((item) => {
      if (item && item.id) {
        // remote replaces or creates
        map.set(item.id, { ...(map.get(item.id) || {}), ...item });
      }
    });
    return Array.from(map.values());
  };

  const mergeCoaches = (localCoaches: Coach[] = [], remoteCoaches: any[] = []): Coach[] => {
    if (!Array.isArray(remoteCoaches)) return localCoaches;
    const map = new Map<string, Coach>();
    localCoaches.forEach((c) => {
      if (c && (c.id || c.email)) map.set((c.email || c.id).toLowerCase(), c);
    });
    remoteCoaches.forEach((c) => {
      if (c && (c.id || c.email)) {
        const key = (c.email || c.id).toLowerCase();
        map.set(key, { ...(map.get(key) || {}), ...c });
      }
    });
    return Array.from(map.values());
  };

  return {
    coaches: mergeCoaches(local.coaches, remote.coaches),
    teams: mergeById<Team>(local.teams, remote.teams),
    players: mergeById<Player>(local.players, remote.players),
    events: mergeById<BaseballEvent>(local.events, remote.events),
    sessions: mergeById<PitcherSession>(local.sessions, remote.sessions),
    pitches: mergeById<Pitch>(local.pitches, remote.pitches),
  };
}

// Active listeners for real-time multi-coach team data syncing
const activeTeamUnsubscribes = new Map<string, () => void>();

export function syncTeamListeners(teams: Team[]): void {
  const currentTeamIds = new Set(teams.filter((t) => Boolean(t && t.id)).map((t) => t.id));

  // Clean up listeners for removed teams
  for (const [teamId, unsub] of activeTeamUnsubscribes.entries()) {
    if (!currentTeamIds.has(teamId)) {
      unsub();
      activeTeamUnsubscribes.delete(teamId);
    }
  }

  // Attach listener for each team
  for (const team of teams) {
    if (!team || !team.id || activeTeamUnsubscribes.has(team.id)) continue;

    try {
      const unsub = onSnapshot(
        doc(db, 'teams', team.id),
        (snapshot) => {
          if (!snapshot.exists()) {
            if (!isPushingToCloud) {
              const localData = loadData();
              const teamEvents = localData.events.filter((e) => e.teamId === team.id);
              const eventIds = new Set(teamEvents.map((e) => e.id));

              localData.teams = localData.teams.filter((t) => t.id !== team.id);
              localData.players = localData.players.filter((p) => p.teamId !== team.id);
              localData.events = localData.events.filter((e) => e.teamId !== team.id);
              localData.sessions = localData.sessions.filter((s) => !eventIds.has(s.eventId));
              localData.pitches = localData.pitches.filter((p) => !eventIds.has(p.eventId));

              saveData(localData, true);

              if (activeTeamUnsubscribes.has(team.id)) {
                const unsubFn = activeTeamUnsubscribes.get(team.id);
                if (unsubFn) unsubFn();
                activeTeamUnsubscribes.delete(team.id);
              }
            }
            return;
          }

          if (snapshot.exists() && !isPushingToCloud) {
            const remoteTeam = snapshot.data() as any;
            if (remoteTeam && remoteTeam.id) {
              const localData = loadData();

              // Merge team
              const tIdx = localData.teams.findIndex((t) => t.id === remoteTeam.id);
              const mergedTeam: Team = {
                id: remoteTeam.id,
                name: remoteTeam.name || team.name,
                imageUrl: remoteTeam.imageUrl || undefined,
                createdBy: remoteTeam.createdBy || team.createdBy,
                createdAt: remoteTeam.createdAt || team.createdAt,
                memberCoachIds: Array.isArray(remoteTeam.memberCoachIds)
                  ? remoteTeam.memberCoachIds
                  : team.memberCoachIds,
                inviteCode: remoteTeam.inviteCode || team.inviteCode,
                inviteCodeCreatedAt: remoteTeam.inviteCodeCreatedAt || team.inviteCodeCreatedAt,
                pitchRulePresetId:
                  remoteTeam.pitchRulePresetId || team.pitchRulePresetId || 'usa_pitch_smart',
              };
              if (tIdx >= 0) {
                localData.teams[tIdx] = mergedTeam;
              } else {
                localData.teams.push(mergedTeam);
              }

              // Merge players: replace team's roster with authoritative remote list
              if (Array.isArray(remoteTeam.players)) {
                const otherPlayers = localData.players.filter((p) => p.teamId !== remoteTeam.id);
                const validRemotePlayers = remoteTeam.players.filter((p: Player) => Boolean(p && p.id));
                localData.players = [...otherPlayers, ...validRemotePlayers];
              }

              // Merge events: replace team's events with authoritative remote list
              if (Array.isArray(remoteTeam.events)) {
                const otherEvents = localData.events.filter((e) => e.teamId !== remoteTeam.id);
                const validRemoteEvents = remoteTeam.events.filter((e: BaseballEvent) => Boolean(e && e.id));
                localData.events = [...otherEvents, ...validRemoteEvents];
              }

              // Merge sessions for events/players/sessions of this team
              if (Array.isArray(remoteTeam.sessions)) {
                const teamEventIds = new Set<string>();
                (remoteTeam.events || []).forEach((e: BaseballEvent) => { if (e?.id) teamEventIds.add(e.id); });
                (remoteTeam.sessions || []).forEach((s: PitcherSession) => { if (s?.eventId) teamEventIds.add(s.eventId); });

                const teamPlayerIds = new Set<string>();
                (remoteTeam.players || []).forEach((p: Player) => { if (p?.id) teamPlayerIds.add(p.id); });
                (remoteTeam.sessions || []).forEach((s: PitcherSession) => { if (s?.pitcherId) teamPlayerIds.add(s.pitcherId); });

                const teamSessionIds = new Set<string>();
                (remoteTeam.sessions || []).forEach((s: PitcherSession) => { if (s?.id) teamSessionIds.add(s.id); });

                const otherSessions = localData.sessions.filter(
                  (s) => !teamEventIds.has(s.eventId) && !teamPlayerIds.has(s.pitcherId) && !teamSessionIds.has(s.id),
                );
                const validRemoteSessions = remoteTeam.sessions.filter((s: PitcherSession) => Boolean(s && s.id));
                localData.sessions = [...otherSessions, ...validRemoteSessions];
              }

              // Merge pitches for events/players/sessions of this team
              if (Array.isArray(remoteTeam.pitches)) {
                const teamEventIds = new Set<string>();
                (remoteTeam.events || []).forEach((e: BaseballEvent) => { if (e?.id) teamEventIds.add(e.id); });
                (remoteTeam.sessions || []).forEach((s: PitcherSession) => { if (s?.eventId) teamEventIds.add(s.eventId); });
                (remoteTeam.pitches || []).forEach((pi: Pitch) => { if (pi?.eventId) teamEventIds.add(pi.eventId); });

                const teamPlayerIds = new Set<string>();
                (remoteTeam.players || []).forEach((p: Player) => { if (p?.id) teamPlayerIds.add(p.id); });
                (remoteTeam.sessions || []).forEach((s: PitcherSession) => { if (s?.pitcherId) teamPlayerIds.add(s.pitcherId); });
                (remoteTeam.pitches || []).forEach((pi: Pitch) => { if (pi?.pitcherId) teamPlayerIds.add(pi.pitcherId); });

                const teamSessionIds = new Set<string>();
                (remoteTeam.sessions || []).forEach((s: PitcherSession) => { if (s?.id) teamSessionIds.add(s.id); });
                (remoteTeam.pitches || []).forEach((pi: Pitch) => { if (pi?.sessionId) teamSessionIds.add(pi.sessionId); });

                const otherPitches = localData.pitches.filter(
                  (pi) =>
                    !teamEventIds.has(pi.eventId) &&
                    !teamPlayerIds.has(pi.pitcherId) &&
                    !teamSessionIds.has(pi.sessionId),
                );
                const validRemotePitches = remoteTeam.pitches.filter((pi: Pitch) => Boolean(pi && pi.id));
                localData.pitches = [...otherPitches, ...validRemotePitches];
              }

              saveData(localData, true); // save locally and trigger UI notify without echoing
            }
          }
        },
        (err) => {
          console.warn(`Notice on team ${team.id} real-time sync:`, err);
        },
      );
      activeTeamUnsubscribes.set(team.id, unsub);
    } catch (e) {
      console.warn(`Failed to listen to team ${team.id}:`, e);
    }
  }
}

async function fetchAndMergeCoachTeams(coachId: string, email?: string, coachUid?: string) {
  try {
    const dbTeams: any[] = [];
    const teamIds = new Set<string>();

    const searchIds = new Set<string>([coachId]);
    if (coachUid) searchIds.add(coachUid);
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const stableId = `coach_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      searchIds.add(stableId);
    }

    const queryPromises: Promise<any>[] = [];

    searchIds.forEach((id) => {
      const q1 = query(collection(db, 'teams'), where('memberCoachIds', 'array-contains', id));
      queryPromises.push(getDocs(q1));

      const q2 = query(collection(db, 'teams'), where('createdBy', '==', id));
      queryPromises.push(getDocs(q2));
    });

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const q3 = query(collection(db, 'teams'), where('creatorEmail', '==', cleanEmail));
      queryPromises.push(getDocs(q3));
    }

    const results = await Promise.all(queryPromises);
    results.forEach((snapshot) => {
      snapshot.forEach((doc: any) => {
        if (!teamIds.has(doc.id)) {
          teamIds.add(doc.id);
          dbTeams.push(doc.data());
        }
      });
    });

    if (dbTeams.length > 0) {
      const localData = loadData();
      
      const remoteTeamsList: Team[] = [];
      const remotePlayersList: Player[] = [];
      const remoteEventsList: BaseballEvent[] = [];
      const remoteSessionsList: PitcherSession[] = [];
      const remotePitchesList: Pitch[] = [];

      dbTeams.forEach((teamData) => {
        if (!teamData || !teamData.id) return;
        
        const teamRecord: Team = {
          id: teamData.id,
          name: teamData.name,
          imageUrl: teamData.imageUrl || undefined,
          createdBy: teamData.createdBy || 'coach_creator',
          createdAt: teamData.createdAt || new Date().toISOString(),
          memberCoachIds: Array.isArray(teamData.memberCoachIds) ? teamData.memberCoachIds : [],
          inviteCode: teamData.inviteCode || undefined,
          inviteCodeCreatedAt: teamData.inviteCodeCreatedAt || undefined,
          pitchRulePresetId: teamData.pitchRulePresetId || 'usa_pitch_smart',
        };
        remoteTeamsList.push(teamRecord);

        if (Array.isArray(teamData.players)) {
          remotePlayersList.push(...teamData.players);
        }
        if (Array.isArray(teamData.events)) {
          remoteEventsList.push(...teamData.events);
        }
        if (Array.isArray(teamData.sessions)) {
          remoteSessionsList.push(...teamData.sessions);
        }
        if (Array.isArray(teamData.pitches)) {
          remotePitchesList.push(...teamData.pitches);
        }
      });

      const remoteDataObj = {
        coaches: [],
        teams: remoteTeamsList,
        players: remotePlayersList,
        events: remoteEventsList,
        sessions: remoteSessionsList,
        pitches: remotePitchesList,
      };

      const merged = mergeAppData(localData, remoteDataObj);
      saveData(merged, false); // Consolidate and repair the coach state doc
      syncTeamListeners(merged.teams);
    }
  } catch (err) {
    console.warn('Direct teams recovery check failed:', err);
  }
}

export function initCloudSync(coachEmail?: string, coachUid?: string): () => void {
  const docId = coachEmail
    ? coachEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
    : coachUid || getCoachDocId();

  if (!docId) return () => {};

  if (activeCloudUnsubscribe && currentCloudDocId === docId) {
    return activeCloudUnsubscribe;
  }

  if (activeCloudUnsubscribe) {
    activeCloudUnsubscribe();
    activeCloudUnsubscribe = null;
  }

  currentCloudDocId = docId;
  isInitialSyncComplete = false;
  notifySyncStatus('syncing');

  // Trigger parallel background recovery search of direct teams
  fetchAndMergeCoachTeams(docId, coachEmail, coachUid).catch(() => {});

  // Immediately initialize listeners for any locally known teams
  const initialData = loadData();
  if (initialData.teams.length > 0) {
    syncTeamListeners(initialData.teams);
  }

  const coachDocRef = doc(db, 'coaches', docId, 'state', 'current');

  try {
    activeCloudUnsubscribe = onSnapshot(
      coachDocRef,
      (snapshot) => {
        isInitialSyncComplete = true;
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          if (!isPushingToCloud) {
            const localData = loadData();
            const merged = mergeAppData(localData, remoteData);

            // Reconcile current coach and team memberships across devices
            const current = getCurrentCoach();
            if (current && current.email) {
              const cleanEmail = current.email.trim().toLowerCase();
              const authoritativeCoach = merged.coaches.find(
                (c) => c.email && c.email.trim().toLowerCase() === cleanEmail,
              );
              if (authoritativeCoach && authoritativeCoach.id !== current.id) {
                localStorage.setItem(CURRENT_COACH_KEY, authoritativeCoach.id);
              }

              // Ensure all teams created by or belonging to this email include this coach ID
              merged.teams.forEach((team) => {
                const creator = merged.coaches.find((c) => c.id === team.createdBy);
                if (
                  creator?.email?.toLowerCase() === cleanEmail ||
                  team.createdBy === current.id ||
                  (authoritativeCoach && team.createdBy === authoritativeCoach.id)
                ) {
                  if (!team.memberCoachIds.includes(current.id)) {
                    team.memberCoachIds.push(current.id);
                  }
                  if (authoritativeCoach && !team.memberCoachIds.includes(authoritativeCoach.id)) {
                    team.memberCoachIds.push(authoritativeCoach.id);
                  }
                }
              });
            }

            saveData(merged, true); // Save locally without echoing back to cloud
            // Ensure invite records are registered for joined/created teams
            syncTeamAndInvitesToFirestore(merged.teams, merged.players, merged.coaches).catch(() => {});
            // Maintain team listeners for all teams
            syncTeamListeners(merged.teams);
            notifySyncStatus('synced');
          }
        } else {
          // If no cloud doc exists yet, upload current local state to start
          const localData = loadData();
          if (localData.teams.length > 0 || localData.players.length > 0) {
            pushToFirestoreDebounced(localData);
          } else {
            notifySyncStatus('synced');
          }
        }
      },
      (error) => {
        console.warn('Firestore snapshot listener offline or permissions pending:', error);
        notifySyncStatus('offline');
        isInitialSyncComplete = true;
      },
    );
  } catch (e) {
    console.warn('Failed to attach Firestore sync listener:', e);
    notifySyncStatus('offline');
  }

  return () => {
    if (activeCloudUnsubscribe) {
      activeCloudUnsubscribe();
      activeCloudUnsubscribe = null;
    }
    for (const unsub of activeTeamUnsubscribes.values()) {
      unsub();
    }
    activeTeamUnsubscribes.clear();
  };
}

// Google Authentication & Coach State
export function getIsSignedIn(): boolean {
  const status = localStorage.getItem(AUTH_STATUS_KEY);
  return status !== 'signed_out';
}

export function signInWithGoogle(profile: {
  name: string;
  email: string;
  avatar?: string;
}): Coach {
  const data = loadData();
  const cleanEmail = profile.email.trim().toLowerCase();
  
  // Deterministic stable ID for email-based coaches
  const stableId = `coach_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
  
  let coach = data.coaches.find((c) => c.email.toLowerCase() === cleanEmail);

  if (!coach) {
    coach = {
      id: stableId,
      name: profile.name.trim(),
      email: profile.email.trim(),
      avatar: profile.avatar || undefined,
      role: 'head_coach',
      googleId: `google_${Date.now()}`,
    };
    data.coaches.push(coach);
  } else {
    // Update profile details if provided
    coach.name = profile.name.trim() || coach.name;
    if (profile.avatar) coach.avatar = profile.avatar;
  }

  // Ensure any teams created by or associated with this email include this coach ID
  data.teams.forEach((team) => {
    const creator = data.coaches.find((c) => c.id === team.createdBy);
    if (creator?.email?.toLowerCase() === cleanEmail || team.createdBy === coach.id) {
      if (!team.memberCoachIds.includes(coach.id)) {
        team.memberCoachIds.push(coach.id);
      }
    }
  });

  localStorage.setItem(CURRENT_COACH_KEY, coach.id);
  localStorage.setItem(AUTH_STATUS_KEY, 'signed_in');
  saveData(data);
  initCloudSync(coach.email, coach.id);
  notify();
  return coach;
}

export const createCoachAccount = signInWithGoogle;

export function signOutCoach(): void {
  if (activeCloudUnsubscribe) {
    activeCloudUnsubscribe();
    activeCloudUnsubscribe = null;
  }
  currentCloudDocId = null;
  localStorage.setItem(AUTH_STATUS_KEY, 'signed_out');
  notify();
}

export function getCurrentCoach(): Coach | null {
  const data = loadData();
  const currentId = localStorage.getItem(CURRENT_COACH_KEY);
  const found = data.coaches.find((c) => c.id === currentId);
  if (found) return found;
  return data.coaches[0] || null;
}

export function setCurrentCoachId(coachId: string): void {
  localStorage.setItem(CURRENT_COACH_KEY, coachId);
  localStorage.setItem(AUTH_STATUS_KEY, 'signed_in');
  const coach = getCurrentCoach();
  if (coach) {
    initCloudSync(coach.email, coach.id);
  }
  notify();
}

export function getAllCoaches(): Coach[] {
  return loadData().coaches;
}

// Teams
export function getTeamsForCoach(coachId: string): Team[] {
  if (!coachId) return [];
  const data = loadData();
  const currentCoach = data.coaches.find((c) => c.id === coachId);
  const coachEmail = currentCoach?.email?.trim().toLowerCase();

  // Find all coach IDs matching this coach's email to ensure seamless multi-device & legacy ID matching
  const matchingCoachIds = new Set<string>([coachId]);
  if (coachEmail) {
    data.coaches.forEach((c) => {
      if (c.email && c.email.trim().toLowerCase() === coachEmail) {
        matchingCoachIds.add(c.id);
      }
    });
  }

  return data.teams.filter((t) => {
    if (matchingCoachIds.has(t.createdBy)) return true;
    if (t.memberCoachIds && t.memberCoachIds.some((id) => matchingCoachIds.has(id))) return true;
    if (coachEmail) {
      const creator = data.coaches.find((c) => c.id === t.createdBy);
      if (creator?.email?.toLowerCase() === coachEmail) return true;
    }
    return false;
  });
}

export function getTeamById(teamId: string): Team | undefined {
  return loadData().teams.find((t) => t.id === teamId);
}

export function getTeamCoaches(teamId: string): Coach[] {
  const data = loadData();
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return [];
  return data.coaches.filter((c) => team.memberCoachIds.includes(c.id));
}

export function saveTeam(teamData: {
  name: string;
  imageUrl?: string;
  createdBy: string;
  pitchRulePresetId?: PitchRulePresetId;
}): Team {
  const data = loadData();
  const id = `team_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const inviteCode =
    teamData.name
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 5)
      .toUpperCase() +
    '-' +
    Math.floor(1000 + Math.random() * 9000);

  const nowIso = new Date().toISOString();
  const newTeam: Team = {
    id,
    name: teamData.name.trim(),
    imageUrl: teamData.imageUrl?.trim() || undefined,
    createdBy: teamData.createdBy,
    createdAt: nowIso,
    memberCoachIds: [teamData.createdBy],
    inviteCode,
    inviteCodeCreatedAt: nowIso,
    pitchRulePresetId: teamData.pitchRulePresetId || 'usa_pitch_smart',
  };

  data.teams.push(newTeam);
  saveData(data);
  syncSingleTeamToCloud(newTeam, data).catch(() => {});
  return newTeam;
}

export function updateTeamPitchPreset(
  teamId: string,
  presetId: PitchRulePresetId,
): Team | null {
  const data = loadData();
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return null;
  team.pitchRulePresetId = presetId;
  saveData(data);
  syncSingleTeamToCloud(team, data).catch(() => {});
  return team;
}

export function updateTeam(
  teamId: string,
  updates: { name: string; imageUrl?: string; pitchRulePresetId?: PitchRulePresetId }
): Team | null {
  const data = loadData();
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return null;
  
  team.name = updates.name.trim();
  if (updates.imageUrl !== undefined) {
    team.imageUrl = updates.imageUrl.trim() || undefined;
  }
  if (updates.pitchRulePresetId) {
    team.pitchRulePresetId = updates.pitchRulePresetId;
  }
  
  saveData(data);
  syncSingleTeamToCloud(team, data).catch(() => {});
  return team;
}

export function regenerateTeamInvite(
  teamId: string,
  coachId: string,
): { success: boolean; newCode?: string; error?: string } {
  const data = loadData();
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, error: 'Team not found' };

  // Any coach on the team can regenerate / revoke the join link
  if (!team.memberCoachIds.includes(coachId) && team.createdBy !== coachId) {
    return { success: false, error: 'You must be a member of this team to regenerate invite links.' };
  }

  const prefix = team.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase() || 'TEAM';
  const newCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

  team.inviteCode = newCode;
  team.inviteCodeCreatedAt = new Date().toISOString();
  saveData(data);
  syncSingleTeamToCloud(team, data).catch(() => {});
  return { success: true, newCode };
}

export function regenerateTeamInviteCode(
  teamId: string,
  coachId?: string,
): { success: boolean; newCode?: string; error?: string; team?: Team } {
  const cId = coachId || getCurrentCoach().id;
  const res = regenerateTeamInvite(teamId, cId);
  const team = getTeamById(teamId);
  return { ...res, team };
}

export async function joinTeamByCode(
  codeOrId: string,
  coachId: string,
): Promise<{ success: boolean; team?: Team; message?: string }> {
  const data = loadData();
  const cleanCode = extractCleanInviteCode(codeOrId);
  const cleanCodeWithoutDash = cleanCode.replace(/-/g, '');

  if (!cleanCode) {
    return {
      success: false,
      message: 'Please enter a valid invite code or share link.',
    };
  }

  let team = data.teams.find(
    (t) =>
      (t.inviteCode && t.inviteCode.toUpperCase() === cleanCode) ||
      t.id === cleanCode ||
      (t.inviteCode && t.inviteCode.replace(/-/g, '').toUpperCase() === cleanCodeWithoutDash),
  );

  // If found in local store, ensure coach membership is registered
  if (team) {
    if (!team.memberCoachIds.includes(coachId)) {
      team.memberCoachIds.push(coachId);
      saveData(data);
    }
    syncSingleTeamToCloud(team, data).catch(() => {});
    return { success: true, team };
  }

  // If not in local store, query cloud Firestore invite registry
  try {
    let inviteDocSnap: any = await getDoc(doc(db, 'invite_codes', cleanCode));
    if (!inviteDocSnap.exists() && cleanCode !== cleanCodeWithoutDash) {
      inviteDocSnap = await getDoc(doc(db, 'invite_codes', cleanCodeWithoutDash));
    }
    if (!inviteDocSnap.exists()) {
      inviteDocSnap = await getDoc(doc(db, 'teams', cleanCode));
    }

    // Fallback: Query collection by inviteCode field
    if (!inviteDocSnap.exists()) {
      try {
        const q1 = query(collection(db, 'teams'), where('inviteCode', '==', cleanCode));
        const q1Snap = await getDocs(q1);
        if (!q1Snap.empty) {
          inviteDocSnap = q1Snap.docs[0];
        } else if (cleanCode !== cleanCodeWithoutDash) {
          const q2 = query(collection(db, 'teams'), where('inviteCode', '==', cleanCodeWithoutDash));
          const q2Snap = await getDocs(q2);
          if (!q2Snap.empty) {
            inviteDocSnap = q2Snap.docs[0];
          }
        }
      } catch (qErr) {
        console.warn('Collection query fallback notice:', qErr);
      }
    }

    if (inviteDocSnap && inviteDocSnap.exists()) {
      const remote = inviteDocSnap.data() as any;
      if (remote && remote.id && remote.name) {
        const teamRecord: Team = {
          id: remote.id,
          name: remote.name,
          imageUrl: remote.imageUrl || undefined,
          createdBy: remote.createdBy || 'coach_creator',
          createdAt: remote.createdAt || new Date().toISOString(),
          memberCoachIds: Array.isArray(remote.memberCoachIds) ? remote.memberCoachIds : [],
          inviteCode: remote.inviteCode || cleanCode,
          inviteCodeCreatedAt: remote.inviteCodeCreatedAt || new Date().toISOString(),
          pitchRulePresetId: remote.pitchRulePresetId || 'usa_pitch_smart',
        };

        if (!teamRecord.memberCoachIds.includes(coachId)) {
          teamRecord.memberCoachIds.push(coachId);
        }

        // Add creator coach profile if available
        if (remote.creatorEmail && remote.createdBy) {
          const creatorCoach: Coach = {
            id: remote.createdBy,
            name: remote.creatorName || 'Head Coach',
            email: remote.creatorEmail,
            role: 'head_coach',
          };
          if (!data.coaches.some((c) => c.id === creatorCoach.id || (c.email && c.email.toLowerCase() === creatorCoach.email.toLowerCase()))) {
            data.coaches.push(creatorCoach);
          }
        }

        // Merge team into local storage
        const existingIdx = data.teams.findIndex((t) => t.id === teamRecord.id);
        if (existingIdx >= 0) {
          data.teams[existingIdx] = teamRecord;
        } else {
          data.teams.push(teamRecord);
        }

        // Merge team players
        if (Array.isArray(remote.players)) {
          remote.players.forEach((p: any) => {
            if (p && p.id) {
              const pIdx = data.players.findIndex((lp) => lp.id === p.id);
              if (pIdx >= 0) {
                data.players[pIdx] = { ...data.players[pIdx], ...p };
              } else {
                data.players.push(p);
              }
            }
          });
        }

        // Merge team events (games & bullpens)
        if (Array.isArray(remote.events)) {
          remote.events.forEach((e: any) => {
            if (e && e.id) {
              const eIdx = data.events.findIndex((le) => le.id === e.id);
              if (eIdx >= 0) {
                data.events[eIdx] = { ...data.events[eIdx], ...e };
              } else {
                data.events.push(e);
              }
            }
          });
        }

        // Merge team sessions
        if (Array.isArray(remote.sessions)) {
          remote.sessions.forEach((s: any) => {
            if (s && s.id) {
              const sIdx = data.sessions.findIndex((ls) => ls.id === s.id);
              if (sIdx >= 0) {
                data.sessions[sIdx] = { ...data.sessions[sIdx], ...s };
              } else {
                data.sessions.push(s);
              }
            }
          });
        }

        // Merge team pitches
        if (Array.isArray(remote.pitches)) {
          remote.pitches.forEach((pi: any) => {
            if (pi && pi.id) {
              const piIdx = data.pitches.findIndex((lpi) => lpi.id === pi.id);
              if (piIdx >= 0) {
                data.pitches[piIdx] = { ...data.pitches[piIdx], ...pi };
              } else {
                data.pitches.push(pi);
              }
            }
          });
        }

        saveData(data);
        syncTeamListeners(data.teams);

        // Update Firestore invite & team doc with joined member coach list
        try {
          await setDoc(
            doc(db, 'invite_codes', cleanCode),
            {
              memberCoachIds: teamRecord.memberCoachIds,
              lastUpdated: new Date().toISOString(),
            },
            { merge: true },
          );
          await setDoc(
            doc(db, 'teams', teamRecord.id),
            {
              memberCoachIds: teamRecord.memberCoachIds,
              lastUpdated: new Date().toISOString(),
            },
            { merge: true },
          );
        } catch (syncErr) {
          console.warn('Notice updating remote member list:', syncErr);
        }

        return { success: true, team: teamRecord };
      }
    }
  } catch (cloudErr) {
    console.warn('Firestore cloud invite code query error:', cloudErr);
  }

  return {
    success: false,
    message: 'Invalid or revoked invite code. Please request an active invite code from a team coach.',
  };
}

export function removeCoachFromTeam(
  teamId: string,
  coachIdToRemove: string,
  requesterCoachId: string,
): { success: boolean; error?: string } {
  const data = loadData();
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, error: 'Team not found' };

  // Only the team creator can remove other coaches
  if (team.createdBy !== requesterCoachId) {
    return { success: false, error: 'Only the team creator can remove other coaches.' };
  }

  if (coachIdToRemove === team.createdBy) {
    return { success: false, error: 'The team creator cannot be removed from the team.' };
  }

  team.memberCoachIds = team.memberCoachIds.filter((id) => id !== coachIdToRemove);
  saveData(data);
  return { success: true };
}

export function leaveTeam(
  teamId: string,
  coachId: string,
): { success: boolean; error?: string } {
  const data = loadData();
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, error: 'Team not found' };

  if (team.createdBy === coachId) {
    return {
      success: false,
      error: 'As the team creator, you cannot leave the team. You can delete the team if you wish to remove it entirely.',
    };
  }

  team.memberCoachIds = team.memberCoachIds.filter((id) => id !== coachId);
  saveData(data);
  return { success: true };
}

export function deleteTeam(teamId: string, coachId: string): { success: boolean; error?: string } {
  const data = loadData();
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, error: 'Team not found' };

  // Allow any staff coach to delete a team for cleanup
  // Extract event IDs before filtering out events
  const teamEvents = data.events.filter((e) => e.teamId === teamId);
  const eventIds = new Set(teamEvents.map((e) => e.id));

  data.teams = data.teams.filter((t) => t.id !== teamId);
  data.players = data.players.filter((p) => p.teamId !== teamId);
  data.events = data.events.filter((e) => e.teamId !== teamId);
  data.sessions = data.sessions.filter((s) => !eventIds.has(s.eventId));
  data.pitches = data.pitches.filter((p) => !eventIds.has(p.eventId));

  // Clean up real-time listener for this team if active
  if (activeTeamUnsubscribes.has(teamId)) {
    const unsub = activeTeamUnsubscribes.get(teamId);
    if (unsub) unsub();
    activeTeamUnsubscribes.delete(teamId);
  }

  // Remove team document and invite code document from Firestore if connected
  if (team.inviteCode) {
    const cleanCode = extractCleanInviteCode(team.inviteCode);
    if (cleanCode) {
      deleteDoc(doc(db, 'invite_codes', cleanCode)).catch(() => {});
      deleteDoc(doc(db, 'invite_codes', cleanCode.replace(/-/g, ''))).catch(() => {});
    }
  }
  deleteDoc(doc(db, 'teams', teamId)).catch(() => {});

  saveData(data);
  return { success: true };
}

// Players
export function getPlayersForTeam(teamId: string): Player[] {
  const data = loadData();
  return data.players.filter((p) => p.teamId === teamId);
}

export function getPlayerById(playerId: string): Player | undefined {
  return loadData().players.find((p) => p.id === playerId);
}

export function savePlayer(playerInput: {
  id?: string;
  teamId: string;
  name: string;
  jerseyNumber: string;
  seasonAge?: number;
  imageUrl?: string;
  throws?: 'R' | 'L';
  bats?: 'R' | 'L' | 'S';
}): Player {
  const data = loadData();
  const seasonAge = typeof playerInput.seasonAge === 'number' && !isNaN(playerInput.seasonAge)
    ? playerInput.seasonAge
    : 12;

  let savedPlayer: Player;

  if (playerInput.id) {
    const idx = data.players.findIndex((p) => p.id === playerInput.id);
    if (idx !== -1) {
      data.players[idx] = {
        ...data.players[idx],
        name: playerInput.name.trim(),
        jerseyNumber: playerInput.jerseyNumber.trim(),
        seasonAge,
        imageUrl: playerInput.imageUrl?.trim() || undefined,
        throws: playerInput.throws || data.players[idx].throws,
        bats: playerInput.bats || data.players[idx].bats,
      };
      savedPlayer = data.players[idx];
    } else {
      savedPlayer = {
        id: playerInput.id,
        teamId: playerInput.teamId,
        name: playerInput.name.trim(),
        jerseyNumber: playerInput.jerseyNumber.trim(),
        seasonAge,
        imageUrl: playerInput.imageUrl?.trim() || undefined,
        throws: playerInput.throws || 'R',
        bats: playerInput.bats || 'R',
        createdAt: new Date().toISOString(),
      };
      data.players.push(savedPlayer);
    }
  } else {
    savedPlayer = {
      id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      teamId: playerInput.teamId,
      name: playerInput.name.trim(),
      jerseyNumber: playerInput.jerseyNumber.trim(),
      seasonAge,
      imageUrl: playerInput.imageUrl?.trim() || undefined,
      throws: playerInput.throws || 'R',
      bats: playerInput.bats || 'R',
      createdAt: new Date().toISOString(),
    };
    data.players.push(savedPlayer);
  }

  saveData(data);

  // Instantly push updated team roster to Firestore so all co-coaches receive it immediately
  const team = data.teams.find((t) => t.id === playerInput.teamId);
  if (team) {
    syncSingleTeamToCloud(team).catch((err) => console.warn('Instant team player sync notice:', err));
  }

  return savedPlayer;
}

export function deletePlayer(playerId: string): void {
  const data = loadData();
  const playerToDelete = data.players.find((p) => p.id === playerId);
  const teamId = playerToDelete?.teamId;

  data.players = data.players.filter((p) => p.id !== playerId);
  saveData(data);

  if (teamId) {
    const team = data.teams.find((t) => t.id === teamId);
    if (team) {
      syncSingleTeamToCloud(team).catch((err) => console.warn('Instant player delete sync notice:', err));
    }
  }
}

// Events
export function getEventsForTeam(teamId: string): BaseballEvent[] {
  const data = loadData();
  return data.events
    .filter((e) => e.teamId === teamId)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
}

export function getEventById(eventId: string): BaseballEvent | undefined {
  return loadData().events.find((e) => e.id === eventId);
}

export function createEvent(eventInput: {
  teamId: string;
  type: 'game' | 'bullpen';
  opponent?: string;
  location?: string;
  scheduledAt?: string;
  createdBy: string;
}): BaseballEvent {
  const data = loadData();
  const newEvent: BaseballEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teamId: eventInput.teamId,
    type: eventInput.type,
    opponent: eventInput.opponent?.trim() || undefined,
    location: eventInput.location?.trim() || undefined,
    scheduledAt: eventInput.scheduledAt || new Date().toISOString(),
    status: 'in_progress',
    createdBy: eventInput.createdBy,
    createdAt: new Date().toISOString(),
    currentInning: eventInput.type === 'game' ? 1 : undefined,
    currentOuts: eventInput.type === 'game' ? 0 : undefined,
    inningHalf: eventInput.type === 'game' ? 'top' : undefined,
  };

  data.events.push(newEvent);
  saveData(data);
  const team = data.teams.find((t) => t.id === eventInput.teamId);
  if (team) {
    syncSingleTeamToCloud(team).catch(() => {});
  }
  return newEvent;
}

export function updateEventInningAndOuts(
  eventId: string,
  update: { currentInning?: number; currentOuts?: number; inningHalf?: 'top' | 'bottom' },
): BaseballEvent | undefined {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    if (update.currentInning !== undefined) {
      event.currentInning = Math.max(1, update.currentInning);
    }
    if (update.currentOuts !== undefined) {
      if (update.currentOuts >= 3) {
        event.currentInning = (event.currentInning || 1) + 1;
        event.currentOuts = 0;
      } else {
        event.currentOuts = Math.max(0, update.currentOuts);
      }
    }
    if (update.inningHalf !== undefined) {
      event.inningHalf = update.inningHalf;
    }
    saveData(data);
    syncTeamByEventId(eventId, data);
  }
  return event;
}

export function advanceEventInning(eventId: string): BaseballEvent | undefined {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    event.currentInning = (event.currentInning || 1) + 1;
    event.currentOuts = 0;
    saveData(data);
    syncTeamByEventId(eventId, data);
  }
  return event;
}

export function setEventOuts(eventId: string, outs: number): BaseballEvent | undefined {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    if (outs >= 3) {
      event.currentInning = (event.currentInning || 1) + 1;
      event.currentOuts = 0;
    } else {
      event.currentOuts = Math.max(0, outs);
    }
    saveData(data);
    syncTeamByEventId(eventId, data);
  }
  return event;
}

export function endInningManual(eventId: string): BaseballEvent | undefined {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    event.currentInning = (event.currentInning || 1) + 1;
    event.currentOuts = 0;
    saveData(data);
    syncTeamByEventId(eventId, data);
  }
  return event;
}

export function deleteEvent(eventId: string): void {
  const data = loadData();
  const targetEvent = data.events.find((e) => e.id === eventId);
  const teamId = targetEvent?.teamId;

  data.events = data.events.filter((e) => e.id !== eventId);
  data.sessions = data.sessions.filter((s) => s.eventId !== eventId);
  data.pitches = data.pitches.filter((p) => p.eventId !== eventId);
  saveData(data);

  if (teamId) {
    const team = data.teams.find((t) => t.id === teamId);
    if (team) {
      syncSingleTeamToCloud(team).catch(() => {});
    }
  }
}

export function endEvent(eventId: string): BaseballEvent | undefined {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    event.status = 'ended';
    event.endedAt = new Date().toISOString();
    // Also complete any active sessions in this event
    data.sessions.forEach((s) => {
      if (s.eventId === eventId && s.status === 'active') {
        s.status = 'completed';
        s.endedAt = new Date().toISOString();
      }
    });
    saveData(data);
    syncTeamByEventId(eventId, data);
  }
  return event;
}

export function reopenEvent(eventId: string): void {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    event.status = 'in_progress';
    event.endedAt = undefined;

    // Reactivate the most recent pitcher session if no session is active
    const eventSessions = data.sessions.filter((s) => s.eventId === eventId);
    const hasActive = eventSessions.some((s) => s.status === 'active');
    if (!hasActive && eventSessions.length > 0) {
      const sorted = [...eventSessions].sort(
        (a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime(),
      );
      if (sorted[0]) {
        sorted[0].status = 'active';
        sorted[0].endedAt = undefined;
      }
    }

    saveData(data);
    syncTeamByEventId(eventId, data);
  }
}

// Sessions
export function getSessionsForEvent(eventId: string): PitcherSession[] {
  return loadData().sessions.filter((s) => s.eventId === eventId);
}

export function getActiveSessionForEvent(eventId: string): PitcherSession | undefined {
  return loadData().sessions.find((s) => s.eventId === eventId && s.status === 'active');
}

export function startPitcherSession(eventId: string, pitcherId: string): PitcherSession {
  const data = loadData();
  const newSession: PitcherSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    eventId,
    pitcherId,
    status: 'active',
    startedAt: new Date().toISOString(),
    coachNotes: {},
  };

  data.sessions.push(newSession);
  saveData(data);
  syncTeamByEventId(eventId, data);
  return newSession;
}

export function reopenPitcherSession(sessionId: string): PitcherSession | undefined {
  const data = loadData();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return undefined;

  session.status = 'active';
  session.endedAt = undefined;

  // Ensure parent event is in progress
  const event = data.events.find((e) => e.id === session.eventId);
  if (event && event.status === 'ended') {
    event.status = 'in_progress';
    event.endedAt = undefined;
  }

  saveData(data);
  syncTeamBySessionId(sessionId, data);
  return session;
}

export function endPitcherSession(sessionId: string): void {
  const data = loadData();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (session) {
    session.status = 'completed';
    session.endedAt = new Date().toISOString();
    saveData(data);
    syncTeamBySessionId(sessionId, data);
  }
}

export function deletePitcherSession(sessionId: string): void {
  const data = loadData();
  const targetSession = data.sessions.find((s) => s.id === sessionId);
  const eventId = targetSession?.eventId;

  data.sessions = data.sessions.filter((s) => s.id !== sessionId);
  data.pitches = data.pitches.filter((p) => p.sessionId !== sessionId);
  saveData(data);

  if (eventId) {
    syncTeamByEventId(eventId, data);
  }
}

export function updateSessionNotes(sessionId: string, coachId: string, notes: string): void {
  const data = loadData();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (session) {
    if (!session.coachNotes) {
      session.coachNotes = {};
    }
    session.coachNotes[coachId] = notes;
    saveData(data);
    syncTeamBySessionId(sessionId, data);
  }
}

export function updateSessionUncountedPitches(sessionId: string, count: number): void {
  const data = loadData();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (session) {
    session.uncountedPitches = Math.max(0, count);
    saveData(data);
    syncTeamBySessionId(sessionId, data);
  }
}

export function addSessionWarningFlag(
  sessionId: string,
  flagInput: Omit<SafetyWarningFlag, 'id' | 'timestamp'>,
): SafetyWarningFlag | null {
  const data = loadData();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return null;

  if (!session.warningFlags) {
    session.warningFlags = [];
  }

  // Prevent spamming the exact same warning at the same pitch count & type
  const exists = session.warningFlags.some(
    (f) => f.type === flagInput.type && f.pitchCount === flagInput.pitchCount,
  );
  if (exists) return null;

  const newFlag: SafetyWarningFlag = {
    ...flagInput,
    id: `flag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  session.warningFlags.push(newFlag);
  saveData(data);
  syncTeamBySessionId(sessionId, data);
  return newFlag;
}

export function getSessionWarningFlags(sessionId: string): SafetyWarningFlag[] {
  const session = loadData().sessions.find((s) => s.id === sessionId);
  return session?.warningFlags || [];
}

export function getEventWarningFlags(eventId: string): SafetyWarningFlag[] {
  const sessions = loadData().sessions.filter((s) => s.eventId === eventId);
  const flags: SafetyWarningFlag[] = [];
  sessions.forEach((s) => {
    if (s.warningFlags) {
      flags.push(...s.warningFlags);
    }
  });
  return flags;
}

export function getSessionById(sessionId: string): PitcherSession | undefined {
  return loadData().sessions.find((s) => s.id === sessionId);
}

// Pitches
export function getPitchesForSession(sessionId: string): Pitch[] {
  const data = loadData();
  const session = data.sessions.find((s) => s.id === sessionId);
  const rawPitches = data.pitches.filter(
    (p) =>
      p.sessionId === sessionId ||
      (session && p.eventId === session.eventId && p.pitcherId === session.pitcherId),
  );

  const pitchMap = new Map<string, Pitch>();
  rawPitches.forEach((p) => pitchMap.set(p.id, p));

  return Array.from(pitchMap.values()).sort((a, b) => a.pitchNumber - b.pitchNumber);
}

export function getPitchesForEvent(eventId: string): Pitch[] {
  return loadData().pitches.filter((p) => p.eventId === eventId);
}

export function getPitchesForPlayer(playerId: string): Pitch[] {
  return loadData().pitches.filter((p) => p.pitcherId === playerId);
}

export function getAllPitches(): Pitch[] {
  return loadData().pitches;
}

export function getAllSessions(): PitcherSession[] {
  return loadData().sessions;
}

export function addPitchToSession(params: {
  sessionId: string;
  eventId: string;
  pitcherId: string;
  pitchType?: PitchType;
  outcome: PitchOutcome;
  strikeDetail?: StrikeSubDetail;
  inPlayDetail?: InPlaySubDetail;
  location?: PitchLocation | null;
  recordedBy: string;
}): Pitch {
  const data = loadData();
  const sessionPitches = data.pitches
    .filter((p) => p.sessionId === params.sessionId)
    .sort((a, b) => a.pitchNumber - b.pitchNumber);

  const lastPitch = sessionPitches[sessionPitches.length - 1];
  let ballsBefore = 0;
  let strikesBefore = 0;

  if (lastPitch) {
    ballsBefore = lastPitch.ballsAfter;
    strikesBefore = lastPitch.strikesAfter;
  }

  // Calculate count after
  const { ballsAfter, strikesAfter } = calculateCountAfter(
    ballsBefore,
    strikesBefore,
    params.outcome,
  );

  // Check Game Mechanics & Pitch Indicators
  const isFirstPitch = ballsBefore === 0 && strikesBefore === 0;
  const isStrikeout = strikesBefore === 2 && params.outcome === 'strike';
  const isWalk = ballsBefore === 3 && params.outcome === 'ball';
  const isOut = isStrikeout || (params.outcome === 'in_play' && params.inPlayDetail === 'out');

  const event = data.events.find((e) => e.id === params.eventId);
  const isGame = event?.type === 'game';

  let currentInning: number | undefined = undefined;
  let outsBefore: number | undefined = undefined;
  let outsAfter: number | undefined = undefined;

  if (isGame && event) {
    if (event.currentInning === undefined) event.currentInning = 1;
    if (event.currentOuts === undefined) event.currentOuts = 0;

    currentInning = event.currentInning;
    outsBefore = event.currentOuts;

    if (isOut) {
      const nextOuts = event.currentOuts + 1;
      if (nextOuts >= 3) {
        // Inning ends automatically at 3 outs
        event.currentInning = event.currentInning + 1;
        event.currentOuts = 0;
        outsAfter = 0;
      } else {
        event.currentOuts = nextOuts;
        outsAfter = nextOuts;
      }
    } else {
      outsAfter = event.currentOuts;
    }
  }

  const newPitch: Pitch = {
    id: `pitch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    sessionId: params.sessionId,
    eventId: params.eventId,
    pitcherId: params.pitcherId,
    pitchNumber: sessionPitches.length + 1,
    pitchType: params.pitchType || 'fastball',
    outcome: params.outcome,
    strikeDetail: params.strikeDetail,
    inPlayDetail: params.inPlayDetail,
    location: params.location || null,
    ballsBefore,
    strikesBefore,
    ballsAfter,
    strikesAfter,
    inning: currentInning,
    outsBefore,
    outsAfter,
    isFirstPitch,
    isStrikeout,
    isWalk,
    timestamp: new Date().toISOString(),
    recordedBy: params.recordedBy,
  };

  data.pitches.push(newPitch);
  saveData(data);
  syncTeamByEventId(params.eventId, data);
  return newPitch;
}

export function updatePitch(pitchUpdate: Partial<Pitch> & { id: string; sessionId: string }): void {
  const data = loadData();
  const pitchIdx = data.pitches.findIndex((p) => p.id === pitchUpdate.id);
  if (pitchIdx === -1) return;

  data.pitches[pitchIdx] = {
    ...data.pitches[pitchIdx],
    ...pitchUpdate,
  };

  // Recalculate running counts for this session
  recalculateSessionPitches(data, pitchUpdate.sessionId);
  saveData(data);
  syncTeamBySessionId(pitchUpdate.sessionId, data);
}

export function deletePitch(pitchId: string, sessionId: string): void {
  const data = loadData();
  data.pitches = data.pitches.filter((p) => p.id !== pitchId);
  recalculateSessionPitches(data, sessionId);
  saveData(data);
  syncTeamBySessionId(sessionId, data);
}

function calculateCountAfter(
  b: number,
  s: number,
  outcome: PitchOutcome,
): { ballsAfter: number; strikesAfter: number } {
  let balls = b;
  let strikes = s;

  if (outcome === 'ball') {
    balls = b + 1;
  } else if (outcome === 'strike') {
    strikes = s + 1;
  } else if (outcome === 'foul') {
    // A foul is a strike if strikes < 2
    if (strikes < 2) {
      strikes = strikes + 1;
    }
  } else if (outcome === 'in_play') {
    // In play completes the at-bat count resets
    balls = 0;
    strikes = 0;
    return { ballsAfter: balls, strikesAfter: strikes };
  }

  // Check if at-bat concluded (4 balls or 3 strikes)
  if (balls >= 4 || strikes >= 3) {
    return { ballsAfter: 0, strikesAfter: 0 };
  }

  return { ballsAfter: balls, strikesAfter: strikes };
}

function recalculateSessionPitches(data: AppData, sessionId: string) {
  const sessionPitches = data.pitches
    .filter((p) => p.sessionId === sessionId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let currentBalls = 0;
  let currentStrikes = 0;

  sessionPitches.forEach((p, idx) => {
    p.pitchNumber = idx + 1;
    p.ballsBefore = currentBalls;
    p.strikesBefore = currentStrikes;

    const { ballsAfter, strikesAfter } = calculateCountAfter(
      currentBalls,
      currentStrikes,
      p.outcome,
    );

    p.ballsAfter = ballsAfter;
    p.strikesAfter = strikesAfter;
    p.isFirstPitch = currentBalls === 0 && currentStrikes === 0;
    p.isStrikeout = currentStrikes === 2 && p.outcome === 'strike';
    p.isWalk = currentBalls === 3 && p.outcome === 'ball';

    currentBalls = ballsAfter;
    currentStrikes = strikesAfter;
  });
}

export function calculateGamePitchingMetrics(pitches: Pitch[]): {
  totalPitches: number;
  balls: number;
  strikes: number;
  strikeouts: number;
  walks: number;
  battersFaced: number;
  outsRecorded: number;
  inningsPitched: string;
  firstPitchStrikes: number;
  firstPitchTotal: number;
  fpsRate: number;
} {
  const totalPitches = pitches.length;
  const balls = pitches.filter((p) => p.outcome === 'ball').length;
  const strikes = pitches.filter((p) => p.outcome !== 'ball').length;

  const strikeouts = pitches.filter(
    (p) => p.isStrikeout || (p.strikesBefore === 2 && p.outcome === 'strike'),
  ).length;

  const walks = pitches.filter(
    (p) => p.isWalk || (p.ballsBefore === 3 && p.outcome === 'ball'),
  ).length;

  const inPlayOuts = pitches.filter(
    (p) => p.outcome === 'in_play' && p.inPlayDetail === 'out',
  ).length;

  const outsRecorded = strikeouts + inPlayOuts;
  const fullInnings = Math.floor(outsRecorded / 3);
  const remOuts = outsRecorded % 3;
  const inningsPitched = `${fullInnings}.${remOuts}`;

  const battersFaced = pitches.filter(
    (p) =>
      p.isStrikeout ||
      (p.strikesBefore === 2 && p.outcome === 'strike') ||
      p.isWalk ||
      (p.ballsBefore === 3 && p.outcome === 'ball') ||
      p.outcome === 'in_play',
  ).length;

  const firstPitches = pitches.filter((p) => p.ballsBefore === 0 && p.strikesBefore === 0);
  const firstPitchTotal = firstPitches.length;
  const firstPitchStrikes = firstPitches.filter((p) => p.outcome !== 'ball').length;
  const fpsRate = firstPitchTotal > 0 ? Math.round((firstPitchStrikes / firstPitchTotal) * 100) : 0;

  return {
    totalPitches,
    balls,
    strikes,
    strikeouts,
    walks,
    battersFaced,
    outsRecorded,
    inningsPitched,
    firstPitchStrikes,
    firstPitchTotal,
    fpsRate,
  };
}
