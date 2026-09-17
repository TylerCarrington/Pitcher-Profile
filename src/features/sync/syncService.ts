import { doc, setDoc, collection, query, where, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
export let activeCloudUnsubscribe: Unsubscribe | null = null;
export let currentCloudDocId: string | null = null;
import { db } from '../../firebase';

import { AppData, loadData, saveData, cleanForFirestore, extractCleanInviteCode, SyncStatus, getSyncStatus, subscribeToSyncStatus, notifySyncStatus, setOnDataSaved, CURRENT_COACH_KEY } from '../../store/localStore';

import { Team, Player, Coach, BaseballEvent, PitcherSession, Pitch } from '../../types';
import { getCurrentCoach } from '../auth/authService';


let isPushingToCloud = false;
let isInitialSyncComplete = false;
let cloudSaveTimer: any = null;

export function getCoachDocId(coach?: Coach | null): string | null {
  const current = coach || getCurrentCoach();
  if (!current) return null;
  if (current.email) {
    return current.email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
  return current.googleId || current.id;
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

  const sanitizedPayload = cleanForFirestore(payload);

  try {
    await setDoc(doc(db, 'teams', team.id), sanitizedPayload, { merge: true });
    if (cleanCode) {
      await setDoc(doc(db, 'invite_codes', cleanCode), sanitizedPayload, { merge: true });
      if (cleanCodeWithoutDash && cleanCodeWithoutDash !== cleanCode) {
        await setDoc(doc(db, 'invite_codes', cleanCodeWithoutDash), sanitizedPayload, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Notice writing team/invite record to Firestore:', err);
  }
}

export function syncTeamByEventId(eventId: string, data?: AppData): Promise<void> {
  const currentData = data || loadData();
  const event = currentData.events.find((e) => e.id === eventId);
  if (event?.teamId) {
    const team = currentData.teams.find((t) => t.id === event.teamId);
    if (team) {
      return syncSingleTeamToCloud(team, currentData).catch((err) =>
        console.warn('Notice on instant team cloud sync by event:', err),
      );
    }
  }
  return Promise.resolve();
}

export function syncTeamBySessionId(sessionId: string, data?: AppData): Promise<void> {
  const currentData = data || loadData();
  const session = currentData.sessions.find((s) => s.id === sessionId);
  if (session?.eventId) {
    return syncTeamByEventId(session.eventId, currentData);
  }
  return Promise.resolve();
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
      const sanitizedCoachState = cleanForFirestore({
        ...data,
        lastUpdated: new Date().toISOString(),
        updatedBy: docId,
      });
      await setDoc(coachDocRef, sanitizedCoachState, { merge: true });

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
export const activeTeamUnsubscribes = new Map<string, () => void>();

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
          if (snapshot.metadata.hasPendingWrites) {
            // Local optimistic write pending server confirmation; avoid re-echoing
            return;
          }

          if (!snapshot.exists()) {
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
            return;
          }

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
// Hook up the local store save to trigger cloud sync
setOnDataSaved(pushToFirestoreDebounced);
