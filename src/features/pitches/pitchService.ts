import { Pitch, PitcherSession, PitchType, PitchOutcome, StrikeSubDetail, InPlaySubDetail, PitchLocation } from '../../types';
import { AppData, loadData, saveData } from '../../store/localStore';
import { syncTeamByEventId, syncTeamBySessionId } from '../sync/syncService';
import { getSessionById } from '../sessions/sessionService';
import { getEventById } from '../events/eventService';

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
    event.updatedAt = new Date().toISOString();
  }

  const now = new Date().toISOString();
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
    timestamp: now,
    updatedAt: now,
    recordedBy: params.recordedBy,
  };

  const parentSession = data.sessions.find((s) => s.id === params.sessionId);
  if (parentSession) {
    parentSession.updatedAt = now;
  }

  data.pitches.push(newPitch);
  saveData(data);
  syncTeamByEventId(params.eventId, data);
  return newPitch;
}

export function updatePitch(pitchUpdate: Partial<Pitch> & { id: string; sessionId: string }): void {
  const data = loadData();
  const pitchIdx = data.pitches.findIndex((p) => p.id === pitchUpdate.id);
  if (pitchIdx === -1) return;

  const now = new Date().toISOString();
  data.pitches[pitchIdx] = {
    ...data.pitches[pitchIdx],
    ...pitchUpdate,
    updatedAt: now,
  };

  const parentSession = data.sessions.find((s) => s.id === pitchUpdate.sessionId);
  if (parentSession) {
    parentSession.updatedAt = now;
  }

  // Recalculate running counts for this session
  recalculateSessionPitches(data, pitchUpdate.sessionId);
  saveData(data);
  syncTeamBySessionId(pitchUpdate.sessionId, data);
}

export function deletePitch(pitchId: string, sessionId: string): void {
  const data = loadData();
  data.pitches = data.pitches.filter((p) => p.id !== pitchId);
  const parentSession = data.sessions.find((s) => s.id === sessionId);
  if (parentSession) {
    parentSession.updatedAt = new Date().toISOString();
  }
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
