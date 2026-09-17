import { Pitch, PitchType, Coach } from '../../../types';
import { PITCH_TYPES_CONFIG } from '../../../utils/pitchSmart';

export interface ArsenalStat {
  type: PitchType;
  name: string;
  abbr: string;
  color: string;
  count: number;
  usagePercent: number;
  strikeRate: number;
}

export interface PlayerOverviewStats {
  totalPitches: number;
  strikesCount: number;
  ballsCount: number;
  strikePercent: number;
  ballPercent: number;
  firstPitchStrikes: number;
  fpsPercent: number;
  inPlayOuts: number;
  inPlayHits: number;
  arsenalStats: ArsenalStat[];
}

export interface VisibleCoachNote {
  coachId: string;
  authorName: string;
  noteText: string;
  isShared: boolean;
}

/**
 * Computes seasonal overview statistics, strike percentages, first-pitch strike rates,
 * and pitch arsenal distribution for a pitcher.
 */
export function calculatePlayerOverviewStats(pitches: Pitch[]): PlayerOverviewStats {
  const totalPitches = pitches.length;
  const strikesCount = pitches.filter((p) => p.outcome !== 'ball').length;
  const ballsCount = pitches.filter((p) => p.outcome === 'ball').length;
  const strikePercent = totalPitches > 0 ? Math.round((strikesCount / totalPitches) * 100) : 0;
  const ballPercent = totalPitches > 0 ? Math.round((ballsCount / totalPitches) * 100) : 0;

  // First-Pitch Strikes calculation (0-0 counts)
  const firstPitches = pitches.filter((p) => p.ballsBefore === 0 && p.strikesBefore === 0);
  const firstPitchStrikes = firstPitches.filter((p) => p.outcome !== 'ball').length;
  const fpsPercent =
    firstPitches.length > 0 ? Math.round((firstPitchStrikes / firstPitches.length) * 100) : 0;

  // In-play outcome distribution
  const inPlayPitches = pitches.filter((p) => p.outcome === 'in_play');
  const inPlayOuts = inPlayPitches.filter((p) => p.inPlayDetail === 'out').length;
  const inPlayHits = inPlayPitches.filter((p) => p.inPlayDetail === 'safe').length;

  // Pitch type breakdown (Arsenal)
  const counts: Record<string, { count: number; strikes: number }> = {};
  pitches.forEach((p) => {
    const type = p.pitchType || 'fastball';
    if (!counts[type]) {
      counts[type] = { count: 0, strikes: 0 };
    }
    counts[type].count += 1;
    if (p.outcome !== 'ball') {
      counts[type].strikes += 1;
    }
  });

  const arsenalStats: ArsenalStat[] = Object.entries(counts)
    .map(([typeKey, data]) => {
      const config = PITCH_TYPES_CONFIG[typeKey as PitchType] || {
        name: typeKey,
        abbr: typeKey.substring(0, 2).toUpperCase(),
        color: '#64748b',
      };
      const usagePercent = totalPitches > 0 ? Math.round((data.count / totalPitches) * 100) : 0;
      const strikeRate = data.count > 0 ? Math.round((data.strikes / data.count) * 100) : 0;
      return {
        type: typeKey as PitchType,
        name: config.name,
        abbr: config.abbr,
        color: config.color,
        count: data.count,
        usagePercent,
        strikeRate,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    totalPitches,
    strikesCount,
    ballsCount,
    strikePercent,
    ballPercent,
    firstPitchStrikes,
    fpsPercent,
    inPlayOuts,
    inPlayHits,
    arsenalStats,
  };
}

/**
 * Filters and formats coach notes for a session, honoring private notes vs shared team notes.
 * Private notes are only visible to the authoring coach.
 */
export function filterVisibleCoachNotes(
  coachNotes: Record<string, string> | undefined,
  currentCoachId: string | undefined,
  coaches: Coach[],
): VisibleCoachNote[] {
  if (!coachNotes) return [];

  return Object.entries(coachNotes)
    .filter(([coachId, note]) => {
      if (typeof note !== 'string' || !note.trim()) return false;
      const isMyNote = currentCoachId && coachId === currentCoachId;
      const isShared = note.startsWith('[SHARED]');
      return isShared || isMyNote;
    })
    .map(([coachId, noteVal]) => {
      const author = coaches.find((c) => c.id === coachId);
      const rawNote = String(noteVal || '');
      const isShared = rawNote.startsWith('[SHARED]');
      const noteText = rawNote.replace(/^\[SHARED\]\s*/, '');
      return {
        coachId,
        authorName: author?.name || 'Coach',
        noteText,
        isShared,
      };
    });
}
