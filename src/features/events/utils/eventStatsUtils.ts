import { Player, Pitch, PitcherSession } from '../../../types';

export interface PitcherEventStat {
  pitcher: Player;
  pitchesThrown: number;
  balls: number;
  strikes: number;
  pitches: Pitch[];
  session?: PitcherSession;
}

/**
 * Aggregates all pitches and pitching sessions for a given event,
 * correctly accounting for pitch outcomes, strike counts, and uncounted bullpen warmups.
 */
export function aggregateEventPitcherStats(
  teamId: string,
  players: Player[],
  allEventSessions: PitcherSession[],
  allEventPitches: Pitch[],
): PitcherEventStat[] {
  const pitcherStatsMap = new Map<string, PitcherEventStat>();

  // Pre-populate slots from sessions to account for pitchers who warmed up without live pitch logs
  allEventSessions.forEach((session) => {
    const pitcher = players.find((pl) => pl.id === session.pitcherId) || {
      id: session.pitcherId,
      name: 'Unknown Pitcher',
      jerseyNumber: '?',
      teamId,
      seasonAge: 12,
      createdAt: new Date().toISOString(),
    };
    pitcherStatsMap.set(session.pitcherId, {
      pitcher,
      pitchesThrown: 0,
      balls: 0,
      strikes: 0,
      pitches: [],
      session,
    });
  });

  // Aggregate individual pitch outcomes and count progressions
  allEventPitches.forEach((pitch) => {
    let stat = pitcherStatsMap.get(pitch.pitcherId);
    if (!stat) {
      const pitcher = players.find((pl) => pl.id === pitch.pitcherId) || {
        id: pitch.pitcherId,
        name: 'Unknown Pitcher',
        jerseyNumber: '?',
        teamId,
        seasonAge: 12,
        createdAt: new Date().toISOString(),
      };
      stat = {
        pitcher,
        pitchesThrown: 0,
        balls: 0,
        strikes: 0,
        pitches: [],
        session: allEventSessions.find((s) => s.pitcherId === pitch.pitcherId),
      };
      pitcherStatsMap.set(pitch.pitcherId, stat);
    }
    stat.pitches.push(pitch);
    stat.pitchesThrown += 1;
    if (pitch.outcome === 'ball') {
      stat.balls += 1;
    } else {
      stat.strikes += 1;
    }
  });

  return Array.from(pitcherStatsMap.values());
}
