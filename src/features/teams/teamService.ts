import { Team, Coach, PitchRulePresetId } from '../../types';
import { AppData, loadData, saveData, extractCleanInviteCode } from '../../store/localStore';
import { syncSingleTeamToCloud, syncCoachProfileToCloud, syncTeamListeners, activeTeamUnsubscribes } from '../sync/syncService';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, deleteDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { getCurrentCoach } from '../auth/authService';
import { getPlayerById } from '../players/playerService';
import {
  generateTeamBaseSlug,
  getCanonicalTeamSlug,
  extractShortId,
} from '../../utils/slugUtils';

export function getMatchingCoachIdentifiers(data: AppData, coachIdOrEmail: string): Set<string> {
  const ids = new Set<string>();
  if (!coachIdOrEmail) return ids;

  const cleanInput = coachIdOrEmail.trim().toLowerCase();
  ids.add(coachIdOrEmail);
  ids.add(cleanInput);

  const foundCoach = data.coaches.find(
    (c) =>
      c.id === coachIdOrEmail ||
      c.id?.toLowerCase() === cleanInput ||
      (c.email && c.email.trim().toLowerCase() === cleanInput),
  );

  if (foundCoach) {
    if (foundCoach.id) {
      ids.add(foundCoach.id);
      ids.add(foundCoach.id.trim().toLowerCase());
    }
    if (foundCoach.email) {
      const cleanEmail = foundCoach.email.trim().toLowerCase();
      ids.add(cleanEmail);
      ids.add(`coach_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`);
    }
    if (foundCoach.googleId) {
      ids.add(foundCoach.googleId);
      ids.add(foundCoach.googleId.trim().toLowerCase());
    }
  }

  const coachEmail = foundCoach?.email?.trim().toLowerCase() || (cleanInput.includes('@') ? cleanInput : null);
  if (coachEmail) {
    data.coaches.forEach((c) => {
      if (c.email && c.email.trim().toLowerCase() === coachEmail) {
        if (c.id) {
          ids.add(c.id);
          ids.add(c.id.trim().toLowerCase());
        }
      }
    });
  }

  return ids;
}

export function getTeamsForCoach(coachId: string): Team[] {
  if (!coachId) return [];
  const data = loadData();
  const matchingCoachIds = getMatchingCoachIdentifiers(data, coachId);
  const currentCoach = data.coaches.find((c) => c.id === coachId);
  const coachEmail = currentCoach?.email?.trim().toLowerCase();

  return data.teams.filter((t) => {
    if (t.isDeleted || t.deletedAt) return false;
    if (data.deletedTeamIds && data.deletedTeamIds[t.id]) return false;
    if (matchingCoachIds.has(t.createdBy) || matchingCoachIds.has(t.createdBy.toLowerCase())) return true;
    if (t.memberCoachIds && t.memberCoachIds.some((id) => typeof id === 'string' && (matchingCoachIds.has(id) || matchingCoachIds.has(id.trim().toLowerCase())))) return true;
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

export function getTeamByIdOrSlug(identifier: string): Team | undefined {
  if (!identifier) return undefined;
  const data = loadData();
  const teams = data.teams.filter((t) => !t.isDeleted && !t.deletedAt && !(data.deletedTeamIds && data.deletedTeamIds[t.id]));

  // 1. Direct ID match
  const directMatch = teams.find((t) => t.id === identifier);
  if (directMatch) return directMatch;

  const cleanIdentifier = identifier.toLowerCase().trim();

  // 2. Canonical slug match
  const canonicalMatch = teams.find(
    (t) => getCanonicalTeamSlug(t, teams).toLowerCase() === cleanIdentifier
  );
  if (canonicalMatch) return canonicalMatch;

  // 3. Base slug match
  const baseMatches = teams.filter(
    (t) => generateTeamBaseSlug(t).toLowerCase() === cleanIdentifier
  );
  if (baseMatches.length === 1) return baseMatches[0];
  if (baseMatches.length > 1) {
    // Return newest team
    baseMatches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return baseMatches[0];
  }

  // 4. Short ID match
  const shortMatch = teams.find((t) => {
    const short = extractShortId(t.id);
    return Boolean(short && cleanIdentifier.endsWith(short.toLowerCase()));
  });
  if (shortMatch) return shortMatch;

  return undefined;
}

export function getCanonicalTeamSlugForTeam(team: Team): string {
  const teams = loadData().teams.filter((t) => !t.isDeleted && !t.deletedAt);
  return getCanonicalTeamSlug(team, teams);
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
    updatedAt: nowIso,
    memberCoachIds: [teamData.createdBy],
    inviteCode,
    inviteCodeCreatedAt: nowIso,
    pitchRulePresetId: teamData.pitchRulePresetId || 'usa_pitch_smart',
  };

  data.teams.push(newTeam);
  saveData(data);
  syncSingleTeamToCloud(newTeam, data).catch(() => {});
  syncTeamListeners(data.teams);
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
  team.updatedAt = new Date().toISOString();
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
  team.updatedAt = new Date().toISOString();
  
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

  const now = new Date().toISOString();
  team.inviteCode = newCode;
  team.inviteCodeCreatedAt = now;
  team.updatedAt = now;
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

  const matchingIds = getMatchingCoachIdentifiers(data, coachIdToRemove);
  if (matchingIds.has(team.createdBy) || matchingIds.has(team.createdBy.toLowerCase())) {
    return { success: false, error: 'The team creator cannot be removed from the team.' };
  }

  team.memberCoachIds = (team.memberCoachIds || []).filter(
    (id) => typeof id === 'string' && !matchingIds.has(id) && !matchingIds.has(id.trim().toLowerCase()),
  );
  const now = new Date().toISOString();
  team.updatedAt = now;

  saveData(data);

  syncSingleTeamToCloud(team).catch(() => {});
  syncCoachProfileToCloud().catch(() => {});

  return { success: true };
}

export function leaveTeam(
  teamId: string,
  coachId: string,
): { success: boolean; error?: string } {
  const data = loadData();
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, error: 'Team not found' };

  const matchingIds = getMatchingCoachIdentifiers(data, coachId);
  if (matchingIds.has(team.createdBy) || matchingIds.has(team.createdBy.toLowerCase())) {
    return {
      success: false,
      error: 'As the team creator, you cannot leave the team. You can delete the team if you wish to remove it entirely.',
    };
  }

  team.memberCoachIds = (team.memberCoachIds || []).filter(
    (id) => typeof id === 'string' && !matchingIds.has(id) && !matchingIds.has(id.trim().toLowerCase()),
  );

  const now = new Date().toISOString();
  team.updatedAt = now;

  saveData(data);

  if (activeTeamUnsubscribes.has(team.id)) {
    const unsub = activeTeamUnsubscribes.get(team.id);
    if (unsub) unsub();
    activeTeamUnsubscribes.delete(team.id);
  }

  syncSingleTeamToCloud(team).catch(() => {});
  syncCoachProfileToCloud().catch(() => {});

  return { success: true };
}

export function deleteTeam(teamId: string, coachId: string): { success: boolean; error?: string } {
  const data = loadData();
  const team = data.teams.find((t) => t.id === teamId);
  if (!team) return { success: false, error: 'Team not found' };

  // Authorization check: Only team creator (owner) or administrator can delete the team
  const requester = data.coaches.find((c) => c.id === coachId) || { id: coachId, email: coachId };
  const requesterEmail = requester.email?.trim().toLowerCase();
  const isAdmin = requesterEmail === 'tylercarringtonwa@gmail.com' || coachId === 'admin';

  const matchingIds = getMatchingCoachIdentifiers(data, coachId);
  const isCreator = matchingIds.has(team.createdBy) || matchingIds.has(team.createdBy.toLowerCase());

  if (!isAdmin && !isCreator) {
    return {
      success: false,
      error: 'Only the team creator or an administrator can delete this team.',
    };
  }

  const now = new Date().toISOString();

  // Record tombstone locally to prevent resurrection from stale caches
  data.deletedTeamIds = {
    ...(data.deletedTeamIds || {}),
    [teamId]: now,
  };

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

  // Remove invite code document from Firestore if connected
  if (team.inviteCode) {
    const cleanCode = extractCleanInviteCode(team.inviteCode);
    if (cleanCode) {
      deleteDoc(doc(db, 'invite_codes', cleanCode)).catch(() => {});
      deleteDoc(doc(db, 'invite_codes', cleanCode.replace(/-/g, ''))).catch(() => {});
    }
  }

  // Write tombstone to Firestore so all other coaches and devices receive the deletion
  setDoc(doc(db, 'teams', teamId), {
    id: teamId,
    name: team.name,
    isDeleted: true,
    deletedAt: now,
    updatedAt: now,
    lastUpdated: now,
  }).catch((err) => {
    console.warn('Notice writing team tombstone to Firestore:', err);
  });

  saveData(data);
  return { success: true };
}

// Players