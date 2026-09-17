/**
 * USA Baseball & Little League Pitch Smart Guidelines Calculator
 * Helps coaches protect youth pitcher arm health through automated compliance tracking.
 */

import {
  PitchRulePresetId,
  Player,
  BaseballEvent,
  PitcherSession,
  Pitch,
  PlayerRestStatus,
} from '../types';

export interface RestTier {
  min: number;
  max: number; // inclusive
  restDays: number;
  label: string;
  badgeColor: string;
}

export interface PitchSmartBracket {
  ageLabel: string;
  minAge: number;
  maxAge: number;
  dailyMax: number;
  tiers: RestTier[];
  warningNote?: string;
}

export interface PitchRulePreset {
  id: PitchRulePresetId;
  name: string;
  shortName: string;
  organization: string;
  badge: string;
  description: string;
  brackets: PitchSmartBracket[];
}

export const USA_BASEBALL_BRACKETS: PitchSmartBracket[] = [
  {
    ageLabel: '7-8 Years Old',
    minAge: 7,
    maxAge: 8,
    dailyMax: 50,
    warningNote: 'Breaking pitches (curveballs/sliders) are strongly discouraged for this bracket.',
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
    ],
  },
  {
    ageLabel: '9-10 Years Old',
    minAge: 9,
    maxAge: 10,
    dailyMax: 75,
    warningNote: 'Focus on mechanics and fastball/changeup command before breaking balls.',
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 51, max: 65, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 66, max: 75, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '11-12 Years Old',
    minAge: 11,
    maxAge: 12,
    dailyMax: 85,
    warningNote: 'Ensure proper rest between tournament games; avoid pitching on consecutive days if exceeding 20 pitches.',
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 51, max: 65, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 66, max: 85, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '13-14 Years Old',
    minAge: 13,
    maxAge: 14,
    dailyMax: 95,
    warningNote: 'Transitioning to full 60\'6" distance; monitor velocity and fatigue closely.',
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 51, max: 65, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 66, max: 95, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '15-16 Years Old',
    minAge: 15,
    maxAge: 16,
    dailyMax: 95,
    tiers: [
      { min: 1, max: 30, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 31, max: 45, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 46, max: 60, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 61, max: 75, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 76, max: 95, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '17-18 Years Old',
    minAge: 17,
    maxAge: 18,
    dailyMax: 105,
    tiers: [
      { min: 1, max: 30, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 31, max: 45, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 46, max: 60, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 61, max: 80, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 81, max: 105, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
];

export const USSSA_BRACKETS: PitchSmartBracket[] = [
  {
    ageLabel: '7-8 Years Old',
    minAge: 7,
    maxAge: 8,
    dailyMax: 50,
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
    ],
  },
  {
    ageLabel: '9-10 Years Old',
    minAge: 9,
    maxAge: 10,
    dailyMax: 75,
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 51, max: 65, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 66, max: 75, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '11-12 Years Old',
    minAge: 11,
    maxAge: 12,
    dailyMax: 85,
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 51, max: 65, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 66, max: 85, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '13-14 Years Old',
    minAge: 13,
    maxAge: 14,
    dailyMax: 95,
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 51, max: 65, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 66, max: 95, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '15-18 Years Old',
    minAge: 15,
    maxAge: 18,
    dailyMax: 105,
    tiers: [
      { min: 1, max: 30, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 31, max: 45, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 46, max: 60, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 61, max: 75, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 76, max: 105, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
];

export const CAL_RIPKEN_BRACKETS: PitchSmartBracket[] = [
  {
    ageLabel: '7-8 Years Old (Rookie)',
    minAge: 7,
    maxAge: 8,
    dailyMax: 50,
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
    ],
  },
  {
    ageLabel: '9-10 Years Old (Minors)',
    minAge: 9,
    maxAge: 10,
    dailyMax: 75,
    tiers: [
      { min: 1, max: 40, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 41, max: 65, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 66, max: 75, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
    ],
  },
  {
    ageLabel: '11-12 Years Old (Majors)',
    minAge: 11,
    maxAge: 12,
    dailyMax: 85,
    tiers: [
      { min: 1, max: 40, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 41, max: 65, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 66, max: 85, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
    ],
  },
  {
    ageLabel: '13-15 Years Old (Babe Ruth)',
    minAge: 13,
    maxAge: 15,
    dailyMax: 95,
    tiers: [
      { min: 1, max: 45, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 46, max: 75, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 76, max: 95, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
    ],
  },
  {
    ageLabel: '16-18 Years Old (Senior)',
    minAge: 16,
    maxAge: 18,
    dailyMax: 105,
    tiers: [
      { min: 1, max: 45, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 46, max: 75, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 76, max: 105, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
    ],
  },
];

export const NFHS_BRACKETS: PitchSmartBracket[] = [
  {
    ageLabel: '7-12 Years Old (Prep)',
    minAge: 7,
    maxAge: 12,
    dailyMax: 85,
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 40, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 41, max: 65, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 66, max: 85, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '13-18 Years Old (High School)',
    minAge: 13,
    maxAge: 18,
    dailyMax: 105,
    tiers: [
      { min: 1, max: 30, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 31, max: 50, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 51, max: 75, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 76, max: 105, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
];

export const PERFECT_GAME_BRACKETS: PitchSmartBracket[] = [
  {
    ageLabel: '8-10 Years Old',
    minAge: 7,
    maxAge: 10,
    dailyMax: 75,
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 51, max: 65, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 66, max: 75, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '11-12 Years Old',
    minAge: 11,
    maxAge: 12,
    dailyMax: 85,
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 51, max: 65, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 66, max: 85, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '13-14 Years Old',
    minAge: 13,
    maxAge: 14,
    dailyMax: 95,
    tiers: [
      { min: 1, max: 20, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 21, max: 35, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 36, max: 50, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 51, max: 65, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 66, max: 95, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
  {
    ageLabel: '15-18 Years Old',
    minAge: 15,
    maxAge: 18,
    dailyMax: 105,
    tiers: [
      { min: 1, max: 30, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 31, max: 45, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 46, max: 60, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 61, max: 75, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-orange-100 text-orange-800' },
      { min: 76, max: 105, restDays: 4, label: '4 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
  },
];

export const PITCH_RULE_PRESETS: PitchRulePreset[] = [
  {
    id: 'usa_pitch_smart',
    name: 'USA Baseball / Little League (Official Pitch Smart)',
    shortName: 'Little League / Pitch Smart',
    organization: 'USA Baseball & Little League',
    badge: 'Standard Youth',
    description: 'Gold-standard youth safety thresholds with tiered 0 to 4 mandatory calendar rest days.',
    brackets: USA_BASEBALL_BRACKETS,
  },
  {
    id: 'usssa_travel',
    name: 'USSSA Travel Baseball Guidelines',
    shortName: 'USSSA Travel',
    organization: 'USSSA Baseball',
    badge: 'Travel Ball',
    description: 'Standard USSSA weekend tournament pitch limits based on player roster age bracket.',
    brackets: USSSA_BRACKETS,
  },
  {
    id: 'cal_ripken_babe_ruth',
    name: 'Cal Ripken / Babe Ruth Baseball',
    shortName: 'Cal Ripken / Babe Ruth',
    organization: 'Babe Ruth League, Inc.',
    badge: 'Cal Ripken',
    description: 'Higher initial pitch thresholds (40-45 pitches for 0 rest days; 2 days max rest).',
    brackets: CAL_RIPKEN_BRACKETS,
  },
  {
    id: 'nfhs_high_school',
    name: 'NFHS High School Federation Rules',
    shortName: 'NFHS High School',
    organization: 'NFHS High School',
    badge: 'High School',
    description: 'High school varsity and junior varsity 105 daily max with 1-3 calendar days rest.',
    brackets: NFHS_BRACKETS,
  },
  {
    id: 'perfect_game_travel',
    name: 'Perfect Game Tournament Series',
    shortName: 'Perfect Game',
    organization: 'Perfect Game USA',
    badge: 'Tournaments',
    description: 'Competitive tournament bracket rules for travel baseball showcases and weekend series.',
    brackets: PERFECT_GAME_BRACKETS,
  },
];

export const PITCH_SMART_BRACKETS = USA_BASEBALL_BRACKETS;

export function getPitchRulePreset(presetId?: PitchRulePresetId | string): PitchRulePreset {
  const found = PITCH_RULE_PRESETS.find((p) => p.id === presetId);
  return found || PITCH_RULE_PRESETS[0];
}

export function getPitchSmartBracket(
  seasonAge?: number,
  presetId?: PitchRulePresetId | string,
): PitchSmartBracket {
  const preset = getPitchRulePreset(presetId);
  const brackets = preset.brackets;
  const age = seasonAge ?? 12;
  const found = brackets.find((b) => age >= b.minAge && age <= b.maxAge);
  if (found) return found;
  if (age < brackets[0].minAge) return brackets[0];
  return brackets[brackets.length - 1];
}

export interface PitchSmartStatus {
  bracket: PitchSmartBracket;
  preset: PitchRulePreset;
  dailyMax: number;
  pitchCount: number;
  pitchesRemaining: number;
  restDaysRequired: number;
  currentTier: RestTier;
  nextTier: RestTier | null;
  pitchesUntilNextTier: number | null;
  isNearNextTier: boolean; // within 3 pitches of crossing rest tier
  isNearMax: boolean; // within 5 pitches of daily max
  isAtOrOverMax: boolean;
  percentOfMax: number;
  nextEligibleDateText: string;
}

export function calculatePitchSmartStatus(
  pitchCount: number,
  seasonAge?: number,
  eventDate?: string | Date,
  presetId?: PitchRulePresetId | string,
): PitchSmartStatus {
  const preset = getPitchRulePreset(presetId);
  const bracket = getPitchSmartBracket(seasonAge, presetId);
  const dailyMax = bracket.dailyMax;
  const pitchesRemaining = Math.max(0, dailyMax - pitchCount);
  const percentOfMax = Math.min(100, Math.round((pitchCount / dailyMax) * 100));

  let currentTier = bracket.tiers[0];
  let nextTier: RestTier | null = null;
  let nextTierIdx = -1;

  for (let i = 0; i < bracket.tiers.length; i++) {
    const tier = bracket.tiers[i];
    if (pitchCount >= tier.min && pitchCount <= tier.max) {
      currentTier = tier;
      nextTierIdx = i + 1;
      break;
    } else if (pitchCount > tier.max) {
      currentTier = tier;
      nextTierIdx = i + 1;
    }
  }

  if (nextTierIdx >= 0 && nextTierIdx < bracket.tiers.length) {
    nextTier = bracket.tiers[nextTierIdx];
  }

  const pitchesUntilNextTier = nextTier ? nextTier.min - pitchCount : null;
  const isNearNextTier =
    pitchesUntilNextTier !== null && pitchesUntilNextTier > 0 && pitchesUntilNextTier <= 3;
  const isNearMax = pitchesRemaining <= 5 && pitchesRemaining > 0;
  const isAtOrOverMax = pitchCount >= dailyMax;

  // Calculate Next Eligible Day
  const baseDate = eventDate ? new Date(eventDate) : new Date();
  let nextEligibleDateText = 'Eligible to Pitch (0 Days Rest)';

  if (currentTier.restDays > 0) {
    const eligibleDate = new Date(baseDate.getTime() + (currentTier.restDays + 1) * 86400000);
    const dayStr = eligibleDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    nextEligibleDateText = `Eligible on ${dayStr} (${currentTier.restDays} Day${currentTier.restDays > 1 ? 's' : ''} Rest)`;
  }

  return {
    bracket,
    preset,
    dailyMax,
    pitchCount,
    pitchesRemaining,
    restDaysRequired: currentTier.restDays,
    currentTier,
    nextTier,
    pitchesUntilNextTier,
    isNearNextTier,
    isNearMax,
    isAtOrOverMax,
    percentOfMax,
    nextEligibleDateText,
  };
}

/**
 * Calculates per-team rest-day eligibility for a given player based on their team's prior events.
 * "Limits and rest-day tracking are per team only — not aggregated across a player's other teams."
 */
export function calculatePlayerRestEligibility(params: {
  player: Player;
  teamId: string;
  teamPresetId?: PitchRulePresetId;
  events: BaseballEvent[];
  sessions: PitcherSession[];
  pitches: Pitch[];
  targetDate?: Date;
}): PlayerRestStatus {
  const { player, teamId, teamPresetId, events, sessions, pitches } = params;
  const targetDate = params.targetDate || new Date();

  // Filter team events that have occurred on or before target date
  const teamEvents = events.filter((e) => e.teamId === teamId);
  const teamSessions = sessions.filter((s) => s.pitcherId === player.id);

  // Group pitches thrown by this player per event
  const eventPitchCounts: { event: BaseballEvent; pitchCount: number; date: Date }[] = [];

  for (const event of teamEvents) {
    const eventDate = new Date(event.scheduledAt || event.createdAt);
    // Only count completed or prior events (not future events)
    if (eventDate.getTime() > targetDate.getTime() + 86400000) {
      continue;
    }

    const session = teamSessions.find((s) => s.eventId === event.id);
    if (!session) continue;

    const sessionPitches = pitches.filter((p) => p.sessionId === session.id);
    const uncounted = session.uncountedPitches || 0;
    const totalPitches = sessionPitches.length + uncounted;
    if (totalPitches > 0) {
      eventPitchCounts.push({
        event,
        pitchCount: totalPitches,
        date: eventDate,
      });
    }
  }

  if (eventPitchCounts.length === 0) {
    return {
      playerId: player.id,
      playerName: player.name,
      teamId,
      isEligible: true,
      daysRemaining: 0,
      eligibleDateText: 'Eligible to pitch',
      statusText: 'Available now',
      badgeVariant: 'available',
    };
  }

  // Sort by date descending to inspect the most recent appearance
  eventPitchCounts.sort((a, b) => b.date.getTime() - a.date.getTime());
  const lastAppearance = eventPitchCounts[0];

  const bracket = getPitchSmartBracket(player.seasonAge, teamPresetId);

  // Determine required rest days for the pitches thrown in that event
  let requiredRestDays = 0;
  for (const tier of bracket.tiers) {
    if (lastAppearance.pitchCount >= tier.min && lastAppearance.pitchCount <= tier.max) {
      requiredRestDays = tier.restDays;
      break;
    } else if (lastAppearance.pitchCount > tier.max) {
      requiredRestDays = tier.restDays;
    }
  }

  if (requiredRestDays === 0) {
    return {
      playerId: player.id,
      playerName: player.name,
      teamId,
      isEligible: true,
      daysRemaining: 0,
      lastEventDate: lastAppearance.date.toISOString(),
      lastPitchCount: lastAppearance.pitchCount,
      lastEventType: lastAppearance.event.type,
      eligibleDateText: 'Eligible to pitch (0 days rest required)',
      statusText: 'Available now',
      badgeVariant: 'available',
    };
  }

  // Calendar Day Rest Calculation:
  // Day of event = Day 0.
  // Pitcher is eligible on Day (requiredRestDays + 1)
  const eventMidnight = new Date(
    lastAppearance.date.getFullYear(),
    lastAppearance.date.getMonth(),
    lastAppearance.date.getDate(),
  );

  const eligibleMidnight = new Date(
    eventMidnight.getTime() + (requiredRestDays + 1) * 86400000,
  );

  const targetMidnight = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );

  const diffMs = eligibleMidnight.getTime() - targetMidnight.getTime();
  const daysRemaining = Math.ceil(diffMs / 86400000);

  const eligibleDateFormatted = eligibleMidnight.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (daysRemaining <= 0) {
    return {
      playerId: player.id,
      playerName: player.name,
      teamId,
      isEligible: true,
      daysRemaining: 0,
      eligibleDate: eligibleMidnight.toISOString(),
      lastEventDate: lastAppearance.date.toISOString(),
      lastPitchCount: lastAppearance.pitchCount,
      lastEventType: lastAppearance.event.type,
      eligibleDateText: `Eligible to pitch (${requiredRestDays} days rest completed)`,
      statusText: 'Available now',
      badgeVariant: 'available',
    };
  }

  return {
    playerId: player.id,
    playerName: player.name,
    teamId,
    isEligible: false,
    daysRemaining,
    eligibleDate: eligibleMidnight.toISOString(),
    lastEventDate: lastAppearance.date.toISOString(),
    lastPitchCount: lastAppearance.pitchCount,
    lastEventType: lastAppearance.event.type,
    eligibleDateText: `Not eligible until ${eligibleDateFormatted}`,
    statusText: `Available in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`,
    badgeVariant: daysRemaining === 1 ? 'due_soon' : 'resting',
  };
}

export interface PitchTypeConfig {
  type: string;
  name: string;
  abbr: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PITCH_TYPES_CONFIG: Record<string, PitchTypeConfig> = {
  fastball: {
    type: 'fastball',
    name: 'Fastball (4-Seam / 2-Seam)',
    abbr: 'FB',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
  },
  changeup: {
    type: 'changeup',
    name: 'Changeup',
    abbr: 'CH',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
    borderColor: 'border-cyan-300',
  },
  curveball: {
    type: 'curveball',
    name: 'Curveball (Breaking)',
    abbr: 'CB',
    color: 'text-violet-700',
    bgColor: 'bg-violet-100',
    borderColor: 'border-violet-300',
  },
  slider: {
    type: 'slider',
    name: 'Slider / Cutter',
    abbr: 'SL',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
  },
  other: {
    type: 'other',
    name: 'Other',
    abbr: 'OTH',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
    borderColor: 'border-slate-300',
  },
};
