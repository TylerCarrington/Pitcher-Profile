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

const STORAGE_KEY = 'pitch_tracker_data_v2';
const CURRENT_COACH_KEY = 'pitch_tracker_current_coach_v2';
const AUTH_STATUS_KEY = 'pitch_tracker_auth_status_v2';

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

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
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

function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to persist pitch tracker data:', err);
  }
  notify();
}

// Google Authentication & Coach State
export function getIsSignedIn(): boolean {
  const status = localStorage.getItem(AUTH_STATUS_KEY);
  // Default to true for seamless first-load, but allow signing out and in
  return status !== 'signed_out';
}

export function signInWithGoogle(profile: {
  name: string;
  email: string;
  avatar?: string;
}): Coach {
  const data = loadData();
  const cleanEmail = profile.email.trim().toLowerCase();
  let coach = data.coaches.find((c) => c.email.toLowerCase() === cleanEmail);

  if (!coach) {
    coach = {
      id: `coach_g_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: profile.name.trim(),
      email: profile.email.trim(),
      avatar: profile.avatar || undefined,
      role: 'head_coach',
      googleId: `google_${Date.now()}`,
    };
    data.coaches.push(coach);
    saveData(data);
  } else {
    // Update profile details if provided
    coach.name = profile.name.trim() || coach.name;
    if (profile.avatar) coach.avatar = profile.avatar;
    saveData(data);
  }

  localStorage.setItem(CURRENT_COACH_KEY, coach.id);
  localStorage.setItem(AUTH_STATUS_KEY, 'signed_in');
  notify();
  return coach;
}

export const createCoachAccount = signInWithGoogle;

export function signOutCoach(): void {
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
  notify();
}

export function getAllCoaches(): Coach[] {
  return loadData().coaches;
}

// Teams
export function getTeamsForCoach(coachId: string): Team[] {
  if (!coachId) return [];
  const data = loadData();
  return data.teams.filter(
    (t) => t.createdBy === coachId || t.memberCoachIds.includes(coachId),
  );
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

export function joinTeamByCode(
  codeOrId: string,
  coachId: string,
): { success: boolean; team?: Team; message?: string } {
  const data = loadData();
  const cleanCode = codeOrId.trim().toUpperCase();
  const team = data.teams.find(
    (t) =>
      t.inviteCode.toUpperCase() === cleanCode ||
      t.id === codeOrId.trim() ||
      t.inviteCode.replace('-', '').toUpperCase() === cleanCode.replace('-', ''),
  );

  if (!team) {
    return {
      success: false,
      message: 'Invalid or revoked invite code. Please request an active invite code from a team coach.',
    };
  }

  if (!team.memberCoachIds.includes(coachId)) {
    team.memberCoachIds.push(coachId);
    saveData(data);
  }

  return { success: true, team };
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

  if (team.createdBy !== coachId) {
    return { success: false, error: 'Only the team creator can delete this team.' };
  }

  data.teams = data.teams.filter((t) => t.id !== teamId);
  data.players = data.players.filter((p) => p.teamId !== teamId);
  data.events = data.events.filter((e) => e.teamId !== teamId);
  // Also delete sessions and pitches for this team's events
  const eventIds = new Set(data.events.filter((e) => e.teamId === teamId).map((e) => e.id));
  data.sessions = data.sessions.filter((s) => !eventIds.has(s.eventId));
  data.pitches = data.pitches.filter((p) => !eventIds.has(p.eventId));

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
      saveData(data);
      return data.players[idx];
    }
  }

  const newPlayer: Player = {
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

  data.players.push(newPlayer);
  saveData(data);
  return newPlayer;
}

export function deletePlayer(playerId: string): void {
  const data = loadData();
  data.players = data.players.filter((p) => p.id !== playerId);
  saveData(data);
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
  }
  return event;
}

export function deleteEvent(eventId: string): void {
  const data = loadData();
  data.events = data.events.filter((e) => e.id !== eventId);
  data.sessions = data.sessions.filter((s) => s.eventId !== eventId);
  data.pitches = data.pitches.filter((p) => p.eventId !== eventId);
  saveData(data);
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
  }
  return event;
}

export function reopenEvent(eventId: string): void {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    event.status = 'in_progress';
    event.endedAt = undefined;
    saveData(data);
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
  // Complete any currently active session in this event
  data.sessions.forEach((s) => {
    if (s.eventId === eventId && s.status === 'active') {
      s.status = 'completed';
      s.endedAt = new Date().toISOString();
    }
  });

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
  return newSession;
}

export function reopenPitcherSession(sessionId: string): PitcherSession | undefined {
  const data = loadData();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return undefined;

  // Complete any other active session in this event
  data.sessions.forEach((s) => {
    if (s.eventId === session.eventId && s.id !== sessionId && s.status === 'active') {
      s.status = 'completed';
      s.endedAt = new Date().toISOString();
    }
  });

  session.status = 'active';
  session.endedAt = undefined;

  // Ensure parent event is in progress
  const event = data.events.find((e) => e.id === session.eventId);
  if (event && event.status === 'ended') {
    event.status = 'in_progress';
    event.endedAt = undefined;
  }

  saveData(data);
  return session;
}

export function endPitcherSession(sessionId: string): void {
  const data = loadData();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (session) {
    session.status = 'completed';
    session.endedAt = new Date().toISOString();
    saveData(data);
  }
}

export function deletePitcherSession(sessionId: string): void {
  const data = loadData();
  data.sessions = data.sessions.filter((s) => s.id !== sessionId);
  data.pitches = data.pitches.filter((p) => p.sessionId !== sessionId);
  saveData(data);
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

// Pitches
export function getPitchesForSession(sessionId: string): Pitch[] {
  return loadData()
    .pitches.filter((p) => p.sessionId === sessionId)
    .sort((a, b) => a.pitchNumber - b.pitchNumber);
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
}

export function deletePitch(pitchId: string, sessionId: string): void {
  const data = loadData();
  data.pitches = data.pitches.filter((p) => p.id !== pitchId);
  recalculateSessionPitches(data, sessionId);
  saveData(data);
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
