import { PitcherSession, SafetyWarningFlag } from '../../types';
import { loadData, saveData } from '../../store/localStore';
import { syncTeamByEventId, syncTeamBySessionId } from '../sync/syncService';

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
  delete session.endedAt;

  // Ensure parent event is in progress
  const event = data.events.find((e) => e.id === session.eventId);
  if (event) {
    event.status = 'in_progress';
    delete event.endedAt;
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
    (f) => f && f.type === flagInput?.type && f.pitchCount === flagInput?.pitchCount,
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