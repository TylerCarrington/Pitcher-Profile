import { doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
export let activeCloudUnsubscribe: Unsubscribe | null = null;
export let currentCloudDocId: string | null = null;
import { db } from '../../firebase';

import { AppData, loadData, saveData, cleanForFirestore, extractCleanInviteCode, SyncStatus, getSyncStatus, subscribeToSyncStatus, notifySyncStatus, setOnDataSaved, CURRENT_COACH_KEY } from '../../store/localStore';

import { Team, Player, Coach, BaseballEvent, PitcherSession, Pitch } from '../../types';
import { getCurrentCoach } from '../auth/authService';

let isInitialSyncComplete = false;
let coachProfileTimer: any = null;

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
  if (data.deletedTeamIds && data.deletedTeamIds[team.id]) {
    return;
  }
  if (team.isDeleted || team.deletedAt) {
    return;
  }
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
    updatedAt: team.updatedAt || new Date().toISOString(),
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
    // Read remote doc if it exists to preserve concurrent pitches/sessions from other coaches
    try {
      const existingDoc = await getDoc(doc(db, 'teams', team.id));
      if (existingDoc.exists()) {
        const remoteData = existingDoc.data() as any;
        if (Array.isArray(remoteData?.pitches) && remoteData.pitches.length > 0) {
          const pitchMap = new Map<string, Pitch>();
          remoteData.pitches.forEach((rp: Pitch) => {
            if (rp && rp.id) pitchMap.set(rp.id, rp);
          });
          teamPitches.forEach((lp: Pitch) => {
            if (lp && lp.id) {
              const existing = pitchMap.get(lp.id);
              pitchMap.set(lp.id, mergeWithLWW(existing, lp));
            }
          });
          payload.pitches = Array.from(pitchMap.values());
        }
        if (Array.isArray(remoteData?.sessions) && remoteData.sessions.length > 0) {
          const sessionMap = new Map<string, PitcherSession>();
          remoteData.sessions.forEach((rs: PitcherSession) => {
            if (rs && rs.id) sessionMap.set(rs.id, rs);
          });
          teamSessions.forEach((ls: PitcherSession) => {
            if (ls && ls.id) {
              const existing = sessionMap.get(ls.id);
              sessionMap.set(ls.id, mergeWithLWW(existing, ls));
            }
          });
          payload.sessions = Array.from(sessionMap.values());
        }
      }
    } catch (readErr) {
      console.warn('Notice reading remote team doc for additive merge:', readErr);
    }

    const sanitizedPayload = cleanForFirestore(payload);
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

export async function syncCoachProfileToCloud(
  coach?: Coach | null,
  teamIdsOverride?: string[],
): Promise<void> {
  const current = coach || getCurrentCoach();
  if (!current) return;
  const docId = getCoachDocId(current);
  if (!docId) return;

  const data = loadData();
  const coachEmail = current.email?.trim().toLowerCase();
  const joinedTeamIds =
    teamIdsOverride ||
    data.teams
      .filter((t) => {
        if (t.isDeleted || t.deletedAt) return false;
        if (data.deletedTeamIds && data.deletedTeamIds[t.id]) return false;
        if (t.createdBy === current.id) return true;
        if (t.memberCoachIds && t.memberCoachIds.includes(current.id)) return true;
        if (coachEmail) {
          const creator = data.coaches.find((c) => c.id === t.createdBy);
          if (creator?.email?.toLowerCase() === coachEmail) return true;
        }
        return false;
      })
      .map((t) => t.id);

  const payload = {
    id: current.id,
    name: current.name,
    email: current.email || null,
    avatar: current.avatar || null,
    role: current.role || 'head_coach',
    joinedTeamIds,
    lastActiveAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'coaches', docId), cleanForFirestore(payload), { merge: true });
  } catch (err) {
    console.warn('Notice syncing coach profile to Firestore:', err);
  }
}

export function syncCoachProfileDebounced() {
  if (coachProfileTimer) {
    clearTimeout(coachProfileTimer);
  }
  coachProfileTimer = setTimeout(() => {
    syncCoachProfileToCloud().catch(() => {});
  }, 800);
}

// Helper to resolve entity timestamp
function getEntityTimestamp(item: any): number {
  if (!item) return 0;
  const ts = item.updatedAt || item.timestamp || item.createdAt || item.startedAt || item.scheduledAt;
  if (!ts) return 0;
  const parsed = new Date(ts).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

// Last-Write-Wins (LWW) entity reconciliation
export function mergeWithLWW<T extends { id: string }>(
  localItem: T | undefined,
  remoteItem: T,
): T {
  if (!localItem) return remoteItem;
  if (!remoteItem) return localItem;

  const localTime = getEntityTimestamp(localItem);
  const remoteTime = getEntityTimestamp(remoteItem);

  // If local is strictly newer than remote, local state wins
  if (localTime > remoteTime) {
    return { ...remoteItem, ...localItem };
  }

  // Otherwise remote wins
  return { ...localItem, ...remoteItem };
}

// Merge remote cloud state with local state
export function mergeAppData(local: AppData, remote: any): AppData {
  if (!remote || typeof remote !== 'object') return local;

  // Merge deletedTeamIds maps with timestamp comparison
  const mergedDeletedTeamIds: Record<string, string> = { ...(local.deletedTeamIds || {}) };
  if (remote.deletedTeamIds && typeof remote.deletedTeamIds === 'object') {
    Object.entries(remote.deletedTeamIds).forEach(([teamId, deletedAt]) => {
      if (typeof deletedAt === 'string') {
        const existing = mergedDeletedTeamIds[teamId];
        if (!existing || new Date(deletedAt).getTime() > new Date(existing).getTime()) {
          mergedDeletedTeamIds[teamId] = deletedAt;
        }
      }
    });
  }

  // Also collect any teams explicitly marked isDeleted or deletedAt in remote.teams
  if (Array.isArray(remote.teams)) {
    remote.teams.forEach((rt: any) => {
      if (rt && rt.id && (rt.isDeleted || rt.deletedAt)) {
        const dAt = rt.deletedAt || rt.updatedAt || new Date().toISOString();
        const existing = mergedDeletedTeamIds[rt.id];
        if (!existing || new Date(dAt).getTime() > new Date(existing).getTime()) {
          mergedDeletedTeamIds[rt.id] = dAt;
        }
      }
    });
  }

  const mergeById = <T extends { id: string; deletedAt?: string; isDeleted?: boolean }>(
    localArr: T[] = [],
    remoteArr: any[] = [],
  ): T[] => {
    if (!Array.isArray(remoteArr)) return localArr;
    const map = new Map<string, T>();
    localArr.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    remoteArr.forEach((item) => {
      if (item && item.id) {
        const localItem = map.get(item.id);
        map.set(item.id, mergeWithLWW(localItem, item));
      }
    });
    return Array.from(map.values()).filter((item) => !item.isDeleted && !item.deletedAt);
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

  const mergedTeams = mergeById<Team>(local.teams, remote.teams).filter((t) => {
    if (t.isDeleted || t.deletedAt) return false;
    if (mergedDeletedTeamIds[t.id]) {
      const deletedTime = new Date(mergedDeletedTeamIds[t.id]).getTime();
      const entityTime = getEntityTimestamp(t);
      if (entityTime <= deletedTime) return false;
    }
    return true;
  });

  const mergedPlayers = mergeById<Player>(local.players, remote.players).filter((p) => {
    if (p.isDeleted || p.deletedAt) return false;
    if (mergedDeletedTeamIds[p.teamId]) return false;
    return true;
  });

  const mergedEvents = mergeById<BaseballEvent>(local.events, remote.events).filter((e) => {
    if (e.isDeleted || e.deletedAt) return false;
    if (mergedDeletedTeamIds[e.teamId]) return false;
    return true;
  });

  // Collect all event IDs that belong to deleted teams
  const deletedEventIds = new Set<string>();
  local.events.forEach((e) => {
    if (e && e.teamId && mergedDeletedTeamIds[e.teamId]) deletedEventIds.add(e.id);
  });
  if (Array.isArray(remote.events)) {
    remote.events.forEach((e: any) => {
      if (e && e.teamId && mergedDeletedTeamIds[e.teamId]) deletedEventIds.add(e.id);
    });
  }

  const mergedSessions = mergeById<PitcherSession>(local.sessions, remote.sessions).filter((s) => {
    if (s.isDeleted || s.deletedAt) return false;
    if (deletedEventIds.has(s.eventId)) return false;
    return true;
  });

  const mergedPitches = mergeById<Pitch>(local.pitches, remote.pitches).filter((pi) => {
    if ((pi as any).isDeleted || (pi as any).deletedAt) return false;
    if (deletedEventIds.has(pi.eventId)) return false;
    return true;
  });

  return {
    coaches: mergeCoaches(local.coaches, remote.coaches),
    teams: mergedTeams,
    players: mergedPlayers,
    events: mergedEvents,
    sessions: mergedSessions,
    pitches: mergedPitches,
    deletedTeamIds: mergedDeletedTeamIds,
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
            const now = new Date().toISOString();
            localData.deletedTeamIds = {
              ...(localData.deletedTeamIds || {}),
              [team.id]: now,
            };

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
          if (remoteTeam && (remoteTeam.isDeleted === true || remoteTeam.deletedAt)) {
            const localData = loadData();
            const delTs = remoteTeam.deletedAt || remoteTeam.updatedAt || new Date().toISOString();
            localData.deletedTeamIds = {
              ...(localData.deletedTeamIds || {}),
              [team.id]: delTs,
            };

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

          if (remoteTeam && remoteTeam.id) {
            const localData = loadData();

            // Check if locally marked as deleted and remote is not strictly newer
            if (localData.deletedTeamIds && localData.deletedTeamIds[remoteTeam.id]) {
              const delTs = new Date(localData.deletedTeamIds[remoteTeam.id]).getTime();
              const remoteTs = getEntityTimestamp(remoteTeam);
              if (remoteTs <= delTs) {
                return;
              }
            }

              // Merge team
              const tIdx = localData.teams.findIndex((t) => t.id === remoteTeam.id);
              const remoteTeamRecord: Team = {
                id: remoteTeam.id,
                name: remoteTeam.name || team.name,
                imageUrl: remoteTeam.imageUrl || undefined,
                createdBy: remoteTeam.createdBy || team.createdBy,
                createdAt: remoteTeam.createdAt || team.createdAt,
                updatedAt: remoteTeam.updatedAt || remoteTeam.lastUpdated,
                memberCoachIds: Array.isArray(remoteTeam.memberCoachIds)
                  ? remoteTeam.memberCoachIds
                  : team.memberCoachIds,
                inviteCode: remoteTeam.inviteCode || team.inviteCode,
                inviteCodeCreatedAt: remoteTeam.inviteCodeCreatedAt || team.inviteCodeCreatedAt,
                pitchRulePresetId:
                  remoteTeam.pitchRulePresetId || team.pitchRulePresetId || 'usa_pitch_smart',
              };
              const mergedTeam = mergeWithLWW(localData.teams[tIdx], remoteTeamRecord);
              if (tIdx >= 0) {
                localData.teams[tIdx] = mergedTeam;
              } else {
                localData.teams.push(mergedTeam);
              }

              // Merge players: merge roster with LWW
              if (Array.isArray(remoteTeam.players)) {
                const teamPlayerMap = new Map<string, Player>();
                localData.players
                  .filter((p) => p.teamId === remoteTeam.id)
                  .forEach((p) => teamPlayerMap.set(p.id, p));
                remoteTeam.players
                  .filter((p: any) => Boolean(p && p.id))
                  .forEach((rp: Player) => {
                    const existing = teamPlayerMap.get(rp.id);
                    teamPlayerMap.set(rp.id, mergeWithLWW(existing, rp));
                  });
                const otherPlayers = localData.players.filter((p) => p.teamId !== remoteTeam.id);
                localData.players = [...otherPlayers, ...Array.from(teamPlayerMap.values())];
              }

              // Merge events: merge events with LWW
              if (Array.isArray(remoteTeam.events)) {
                const teamEventMap = new Map<string, BaseballEvent>();
                localData.events
                  .filter((e) => e.teamId === remoteTeam.id)
                  .forEach((e) => teamEventMap.set(e.id, e));
                remoteTeam.events
                  .filter((e: any) => Boolean(e && e.id))
                  .forEach((re: BaseballEvent) => {
                    const existing = teamEventMap.get(re.id);
                    teamEventMap.set(re.id, mergeWithLWW(existing, re));
                  });
                const otherEvents = localData.events.filter((e) => e.teamId !== remoteTeam.id);
                localData.events = [...otherEvents, ...Array.from(teamEventMap.values())];
              }

              // Merge sessions: merge sessions with LWW
              if (Array.isArray(remoteTeam.sessions)) {
                const sessionMap = new Map<string, PitcherSession>();
                localData.sessions.forEach((s) => {
                  if (s && s.id) sessionMap.set(s.id, s);
                });
                remoteTeam.sessions
                  .filter((s: any) => Boolean(s && s.id))
                  .forEach((rs: PitcherSession) => {
                    const existing = sessionMap.get(rs.id);
                    sessionMap.set(rs.id, mergeWithLWW(existing, rs));
                  });
                localData.sessions = Array.from(sessionMap.values());
              }

              // Merge pitches: merge pitches with LWW
              if (Array.isArray(remoteTeam.pitches)) {
                const pitchMap = new Map<string, Pitch>();
                localData.pitches.forEach((pi) => {
                  if (pi && pi.id) pitchMap.set(pi.id, pi);
                });
                remoteTeam.pitches
                  .filter((pi: any) => Boolean(pi && pi.id))
                  .forEach((rpi: Pitch) => {
                    const existing = pitchMap.get(rpi.id);
                    pitchMap.set(rpi.id, mergeWithLWW(existing, rpi));
                  });
                localData.pitches = Array.from(pitchMap.values());
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

    // Also check coach metadata doc coaches/{coachId} for joinedTeamIds
    try {
      const coachDocSnap = await getDoc(doc(db, 'coaches', coachId));
      if (coachDocSnap.exists()) {
        const coachProfile = coachDocSnap.data() as any;
        if (Array.isArray(coachProfile?.joinedTeamIds)) {
          coachProfile.joinedTeamIds.forEach((tid: string) => {
            if (tid && !teamIds.has(tid)) {
              queryPromises.push(getDoc(doc(db, 'teams', tid)));
            }
          });
        }
      }
    } catch (profErr) {
      console.warn('Notice checking coach profile doc:', profErr);
    }

    const results = await Promise.all(queryPromises);
    results.forEach((res) => {
      if (res && res.docs) {
        // QuerySnapshot
        res.forEach((d: any) => {
          if (!teamIds.has(d.id)) {
            teamIds.add(d.id);
            dbTeams.push(d.data());
          }
        });
      } else if (res && typeof res.exists === 'function' && res.exists()) {
        // DocumentSnapshot
        if (!teamIds.has(res.id)) {
          teamIds.add(res.id);
          dbTeams.push(res.data());
        }
      }
    });

    const localData = loadData();

    // Backward-compatible legacy migration:
    // If no teams found in Firestore teams collection and localStore is empty,
    // check if legacy coaches/{coachId}/state/current exists.
    if (dbTeams.length === 0 && localData.teams.length === 0) {
      try {
        const legacySnap = await getDoc(doc(db, 'coaches', coachId, 'state', 'current'));
        if (legacySnap.exists()) {
          const legacyData = legacySnap.data() as any;
          if (legacyData && Array.isArray(legacyData.teams) && legacyData.teams.length > 0) {
            console.log('Migrating legacy coach state to team-first Firestore schema...');
            const merged = mergeAppData(localData, legacyData);
            saveData(merged, true);
            // Migrate each team into teams/{teamId}
            for (const team of merged.teams) {
              if (!team.isDeleted && !team.deletedAt) {
                await syncSingleTeamToCloud(team, merged);
              }
            }
            syncTeamListeners(merged.teams);
            syncCoachProfileToCloud().catch(() => {});
            return;
          }
        }
      } catch (migErr) {
        console.warn('Notice checking legacy coach state:', migErr);
      }
    }

    if (dbTeams.length > 0) {
      const remoteTeamsList: Team[] = [];
      const remotePlayersList: Player[] = [];
      const remoteEventsList: BaseballEvent[] = [];
      const remoteSessionsList: PitcherSession[] = [];
      const remotePitchesList: Pitch[] = [];

      dbTeams.forEach((teamData) => {
        if (!teamData || !teamData.id) return;

        if (teamData.isDeleted === true || teamData.deletedAt) {
          const delTs = teamData.deletedAt || teamData.updatedAt || new Date().toISOString();
          localData.deletedTeamIds = {
            ...(localData.deletedTeamIds || {}),
            [teamData.id]: delTs,
          };
          return;
        }

        if (localData.deletedTeamIds && localData.deletedTeamIds[teamData.id]) {
          const delTs = new Date(localData.deletedTeamIds[teamData.id]).getTime();
          const entityTs = getEntityTimestamp(teamData);
          if (entityTs <= delTs) {
            return;
          }
        }
        
        const teamRecord: Team = {
          id: teamData.id,
          name: teamData.name,
          imageUrl: teamData.imageUrl || undefined,
          createdBy: teamData.createdBy || 'coach_creator',
          createdAt: teamData.createdAt || new Date().toISOString(),
          updatedAt: teamData.updatedAt || teamData.lastUpdated,
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
      saveData(merged, true); // Save locally without echoing back to cloud
      syncTeamListeners(merged.teams);
      syncCoachProfileToCloud().catch(() => {});
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

  // Immediately initialize listeners for any locally known teams
  const initialData = loadData();
  if (initialData.teams.length > 0) {
    syncTeamListeners(initialData.teams);
  }

  // Fetch coach teams from authoritative Firestore teams collection (Single Source of Truth)
  fetchAndMergeCoachTeams(docId, coachEmail, coachUid)
    .catch((err) => console.warn('Notice fetching coach teams:', err))
    .finally(() => {
      isInitialSyncComplete = true;
      notifySyncStatus('synced');
    });

  // Listen to coach profile document coaches/{docId} (metadata & joinedTeamIds only)
  const coachDocRef = doc(db, 'coaches', docId);

  try {
    activeCloudUnsubscribe = onSnapshot(
      coachDocRef,
      async (snapshot) => {
        if (snapshot.metadata.hasPendingWrites) {
          return;
        }
        if (snapshot.exists()) {
          const profile = snapshot.data() as any;
          if (profile && Array.isArray(profile.joinedTeamIds)) {
            const currentData = loadData();
            const currentTeamIds = new Set(currentData.teams.map((t) => t.id));
            const hasNewTeams = profile.joinedTeamIds.some(
              (tid: string) => !currentTeamIds.has(tid) && !currentData.deletedTeamIds?.[tid],
            );
            if (hasNewTeams) {
              await fetchAndMergeCoachTeams(docId, coachEmail, coachUid);
            }
          }
        } else {
          // Initialize coach profile doc in Firestore if not yet present
          syncCoachProfileToCloud().catch(() => {});
        }
      },
      (error) => {
        console.warn('Coach profile snapshot listener offline or permissions pending:', error);
        notifySyncStatus('offline');
        isInitialSyncComplete = true;
      },
    );
  } catch (e) {
    console.warn('Failed to attach coach profile listener:', e);
    notifySyncStatus('offline');
  }

  return () => {
    stopCloudSync();
  };
}

export function stopCloudSync(): void {
  if (activeCloudUnsubscribe) {
    activeCloudUnsubscribe();
    activeCloudUnsubscribe = null;
  }
  for (const unsub of activeTeamUnsubscribes.values()) {
    unsub();
  }
  activeTeamUnsubscribes.clear();
  currentCloudDocId = null;
}

// Google Authentication & Coach State
// Hook up the local store save to sync coach profile metadata (never monolithic AppData)
setOnDataSaved(syncCoachProfileDebounced);
