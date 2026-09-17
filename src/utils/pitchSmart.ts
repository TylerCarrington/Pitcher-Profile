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
  twoDayMax?: number; // 2-day cumulative maximum pitches
  threeDayMax?: number; // 3-day cumulative maximum pitches
  singleEventMax?: number; // single-event ceiling pitches (13U-18U)
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

export const TOP_TIER_BRACKETS: PitchSmartBracket[] = [
  {
    ageLabel: '8U–12U',
    minAge: 7,
    maxAge: 12,
    dailyMax: 85,
    twoDayMax: 105,
    threeDayMax: 125,
    tiers: [
      { min: 1, max: 40, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 41, max: 60, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 61, max: 85, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
    ],
    warningNote: '2-Day Max: 105 pitches • 3-Day Max: 125 pitches • Full calendar day rest • Finish at-bat permitted; rest based on final pitch count.',
  },
  {
    ageLabel: '13U–18U',
    minAge: 13,
    maxAge: 18,
    dailyMax: 105,
    twoDayMax: 125,
    singleEventMax: 150,
    tiers: [
      { min: 1, max: 40, restDays: 0, label: '0 Days Rest', badgeColor: 'bg-emerald-100 text-emerald-800' },
      { min: 41, max: 60, restDays: 1, label: '1 Day Rest', badgeColor: 'bg-blue-100 text-blue-800' },
      { min: 61, max: 85, restDays: 2, label: '2 Days Rest', badgeColor: 'bg-amber-100 text-amber-800' },
      { min: 86, max: 150, restDays: 3, label: '3 Days Rest', badgeColor: 'bg-rose-100 text-rose-800' },
    ],
    warningNote: '2-Day Max: 125 pitches • Single-Event Ceiling: 150 pitches • Full calendar day rest • Finish at-bat permitted; rest based on final pitch count.',
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
    id: 'top_tier',
    name: 'Top Tier Travel Baseball Rules',
    shortName: 'Top Tier',
    organization: 'Top Tier Baseball',
    badge: 'Top Tier',
    description: 'Tournament rules with rolling 2-day & 3-day cumulative caps, 150-pitch event ceiling (13U+), and full calendar day rest.',
    brackets: TOP_TIER_BRACKETS,
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

export interface CumulativePitchTotals {
  todayPitches: number;
  twoDayPitches: number;
  threeDayPitches: number;
  singleEventPitches: number;
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

  // Multi-day & single-event cumulative tracking
  twoDayMax?: number;
  twoDayPitches?: number;
  twoDayRemaining?: number;
  isNear2DayMax?: boolean;
  isAtOrOver2DayMax?: boolean;

  threeDayMax?: number;
  threeDayPitches?: number;
  threeDayRemaining?: number;
  isNear3DayMax?: boolean;
  isAtOrOver3DayMax?: boolean;

  singleEventMax?: number;
  singleEventPitches?: number;
  singleEventRemaining?: number;
  isNearSingleEventMax?: boolean;
  isAtOrOverSingleEventMax?: boolean;

  // Formatted active warnings for ticker/banners
  warningMessages: string[];
}

export function calculatePitchSmartStatus(
  pitchCount: number,
  seasonAge?: number,
  eventDate?: string | Date,
  presetId?: PitchRulePresetId | string,
  cumulativeTotals?: Partial<CumulativePitchTotals>,
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

  // Cumulative tracking (2-day, 3-day, single-event ceiling)
  const twoDayPitches = cumulativeTotals?.twoDayPitches ?? pitchCount;
  const threeDayPitches = cumulativeTotals?.threeDayPitches ?? pitchCount;
  const singleEventPitches = cumulativeTotals?.singleEventPitches ?? pitchCount;

  let twoDayRemaining: number | undefined;
  let isNear2DayMax = false;
  let isAtOrOver2DayMax = false;
  if (bracket.twoDayMax !== undefined) {
    twoDayRemaining = Math.max(0, bracket.twoDayMax - twoDayPitches);
    isNear2DayMax = twoDayRemaining <= 5 && twoDayRemaining > 0;
    isAtOrOver2DayMax = twoDayPitches >= bracket.twoDayMax;
  }

  let threeDayRemaining: number | undefined;
  let isNear3DayMax = false;
  let isAtOrOver3DayMax = false;
  if (bracket.threeDayMax !== undefined) {
    threeDayRemaining = Math.max(0, bracket.threeDayMax - threeDayPitches);
    isNear3DayMax = threeDayRemaining <= 5 && threeDayRemaining > 0;
    isAtOrOver3DayMax = threeDayPitches >= bracket.threeDayMax;
  }

  let singleEventRemaining: number | undefined;
  let isNearSingleEventMax = false;
  let isAtOrOverSingleEventMax = false;
  if (bracket.singleEventMax !== undefined) {
    singleEventRemaining = Math.max(0, bracket.singleEventMax - singleEventPitches);
    isNearSingleEventMax = singleEventRemaining <= 5 && singleEventRemaining > 0;
    isAtOrOverSingleEventMax = singleEventPitches >= bracket.singleEventMax;
  }

  // Generate warning messages in order of severity
  const warningMessages: string[] = [];

  if (isAtOrOverSingleEventMax && bracket.singleEventMax !== undefined) {
    warningMessages.push(
      `SINGLE-EVENT CEILING REACHED (${singleEventPitches}/${bracket.singleEventMax} pitches). Hard event ceiling per ${preset.shortName} rules.`
    );
  } else if (isAtOrOver3DayMax && bracket.threeDayMax !== undefined) {
    warningMessages.push(
      `3-DAY CUMULATIVE MAX REACHED (${threeDayPitches}/${bracket.threeDayMax} pitches). Limit reached across 3 consecutive calendar days.`
    );
  } else if (isAtOrOver2DayMax && bracket.twoDayMax !== undefined) {
    warningMessages.push(
      `2-DAY CUMULATIVE MAX REACHED (${twoDayPitches}/${bracket.twoDayMax} pitches). Limit reached across 2 consecutive calendar days.`
    );
  } else if (isAtOrOverMax) {
    warningMessages.push(
      `DAILY MAX REACHED (${dailyMax} pitches). Remove pitcher immediately per ${preset.shortName} rules.`
    );
  }

  // Approaching limits
  if (isNearSingleEventMax && bracket.singleEventMax !== undefined && singleEventRemaining !== undefined) {
    warningMessages.push(
      `Approaching single-event ceiling: only ${singleEventRemaining} pitch${singleEventRemaining > 1 ? 'es' : ''} left in this event (${singleEventPitches}/${bracket.singleEventMax}).`
    );
  }
  if (isNear3DayMax && bracket.threeDayMax !== undefined && threeDayRemaining !== undefined) {
    warningMessages.push(
      `Approaching 3-day limit: only ${threeDayRemaining} pitch${threeDayRemaining > 1 ? 'es' : ''} left across 3 days (${threeDayPitches}/${bracket.threeDayMax}).`
    );
  }
  if (isNear2DayMax && bracket.twoDayMax !== undefined && twoDayRemaining !== undefined) {
    warningMessages.push(
      `Approaching 2-day limit: only ${twoDayRemaining} pitch${twoDayRemaining > 1 ? 'es' : ''} left across 2 days (${twoDayPitches}/${bracket.twoDayMax}).`
    );
  }
  if (isNearMax) {
    warningMessages.push(
      `Approaching daily limit: only ${pitchesRemaining} pitch${pitchesRemaining > 1 ? 'es' : ''} left today (${pitchCount}/${dailyMax}).`
    );
  }

  // Near next rest tier
  if (isNearNextTier && pitchesUntilNextTier && nextTier) {
    warningMessages.push(
      `Threshold Warning: ${pitchesUntilNextTier} pitch${pitchesUntilNextTier > 1 ? 'es' : ''} until entering ${nextTier.label}.`
    );
  }

  // Calculate Next Eligible Day (Full Calendar Day Rest)
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

    twoDayMax: bracket.twoDayMax,
    twoDayPitches: bracket.twoDayMax !== undefined ? twoDayPitches : undefined,
    twoDayRemaining,
    isNear2DayMax,
    isAtOrOver2DayMax,

    threeDayMax: bracket.threeDayMax,
    threeDayPitches: bracket.threeDayMax !== undefined ? threeDayPitches : undefined,
    threeDayRemaining,
    isNear3DayMax,
    isAtOrOver3DayMax,

    singleEventMax: bracket.singleEventMax,
    singleEventPitches: bracket.singleEventMax !== undefined ? singleEventPitches : undefined,
    singleEventRemaining,
    isNearSingleEventMax,
    isAtOrOverSingleEventMax,

    warningMessages,
  };
}

/**
 * Calculates rolling cumulative pitch counts for a player across consecutive calendar days and single-event ceiling.
 */
export function calculateCumulativePitchTotals(params: {
  playerId: string;
  teamId: string;
  targetEventDate?: Date | string;
  currentEventId?: string;
  currentSessionId?: string;
  livePitchCount?: number;
  events?: BaseballEvent[];
  sessions?: PitcherSession[];
  pitches?: Pitch[];
}): CumulativePitchTotals {
  const targetDate = params.targetEventDate ? new Date(params.targetEventDate) : new Date();
  const targetMidnight = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ).getTime();

  const events = params.events || [];
  const sessions = params.sessions || [];
  const pitches = params.pitches || [];

  const teamEvents = events.filter((e) => e.teamId === params.teamId);
  const playerSessions = sessions.filter((s) => s.pitcherId === params.playerId);

  let todayPitches = 0;
  let twoDayPitches = 0;
  let threeDayPitches = 0;
  let singleEventPitches = 0;

  const countedSessionIds = new Set<string>();

  for (const event of teamEvents) {
    const eventDate = new Date(event.scheduledAt || event.createdAt);
    const eventMidnight = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
    ).getTime();

    const dayDiff = Math.round((targetMidnight - eventMidnight) / 86400000);

    // If event date is in future relative to targetDate, skip
    if (dayDiff < 0) continue;

    const eventSessions = playerSessions.filter((s) => s.eventId === event.id);
    let eventTotal = 0;

    for (const session of eventSessions) {
      countedSessionIds.add(session.id);
      if (session.id === params.currentSessionId && params.livePitchCount !== undefined) {
        eventTotal += params.livePitchCount;
      } else {
        const sessionPitchesCount = pitches.filter((p) => p.sessionId === session.id).length;
        const uncounted = session.uncountedPitches || 0;
        eventTotal += (sessionPitchesCount + uncounted);
      }
    }

    // In case currentSessionId belongs to this event but hasn't yet synced to sessions array
    if (
      event.id === params.currentEventId &&
      params.currentSessionId &&
      !countedSessionIds.has(params.currentSessionId) &&
      params.livePitchCount !== undefined
    ) {
      eventTotal += params.livePitchCount;
      countedSessionIds.add(params.currentSessionId);
    }

    if (event.id === params.currentEventId) {
      singleEventPitches += eventTotal;
    }

    if (dayDiff === 0) {
      todayPitches += eventTotal;
      twoDayPitches += eventTotal;
      threeDayPitches += eventTotal;
    } else if (dayDiff === 1) {
      twoDayPitches += eventTotal;
      threeDayPitches += eventTotal;
    } else if (dayDiff === 2) {
      threeDayPitches += eventTotal;
    }
  }

  // Fallback for brand-new session in brand-new event
  if (
    params.currentSessionId &&
    !countedSessionIds.has(params.currentSessionId) &&
    params.livePitchCount !== undefined
  ) {
    todayPitches += params.livePitchCount;
    twoDayPitches += params.livePitchCount;
    threeDayPitches += params.livePitchCount;
    singleEventPitches += params.livePitchCount;
  }

  return {
    todayPitches,
    twoDayPitches,
    threeDayPitches,
    singleEventPitches,
  };
}

/**
 * Calculates per-team rest-day eligibility for a given player based on their team's prior events.
 * "Limits and rest-day tracking are per team only — not aggregated across a player's other teams."
 * Rest-day definition: A day of rest is a full calendar day, not a rolling 24-hour period.
 * Rest days owed are based on final pitch count at the end of the day/session.
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

  // Group pitches thrown by this player per calendar day (midnight timestamp)
  const dayMap = new Map<number, { date: Date; midnight: number; pitchCount: number; events: BaseballEvent[] }>();

  for (const event of teamEvents) {
    const eventDate = new Date(event.scheduledAt || event.createdAt);
    if (eventDate.getTime() > targetDate.getTime() + 86400000) {
      continue;
    }

    const session = teamSessions.find((s) => s.eventId === event.id);
    if (!session) continue;

    const sessionPitches = pitches.filter((p) => p.sessionId === session.id);
    const uncounted = session.uncountedPitches || 0;
    const totalPitches = sessionPitches.length + uncounted;
    if (totalPitches <= 0) continue;

    const midnight = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
    ).getTime();

    const existing = dayMap.get(midnight);
    if (existing) {
      existing.pitchCount += totalPitches;
      existing.events.push(event);
      if (eventDate.getTime() > existing.date.getTime()) {
        existing.date = eventDate;
      }
    } else {
      dayMap.set(midnight, {
        date: eventDate,
        midnight,
        pitchCount: totalPitches,
        events: [event],
      });
    }
  }

  const dailyAppearances = Array.from(dayMap.values());

  if (dailyAppearances.length === 0) {
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

  // Sort by date descending to inspect the most recent calendar day appearance
  dailyAppearances.sort((a, b) => b.midnight - a.midnight);
  const lastAppearance = dailyAppearances[0];

  const bracket = getPitchSmartBracket(player.seasonAge, teamPresetId);

  // Determine required rest days based on final pitch count for that calendar day
  let requiredRestDays = 0;
  for (const tier of bracket.tiers) {
    if (lastAppearance.pitchCount >= tier.min && lastAppearance.pitchCount <= tier.max) {
      requiredRestDays = tier.restDays;
      break;
    } else if (lastAppearance.pitchCount > tier.max) {
      requiredRestDays = tier.restDays;
    }
  }

  const targetMidnight = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ).getTime();

  if (requiredRestDays === 0) {
    // Check if multi-day cumulative caps apply (e.g. Top Tier 2-day or 3-day max)
    const cumulative = calculateCumulativePitchTotals({
      playerId: player.id,
      teamId,
      targetEventDate: targetDate,
      events,
      sessions,
      pitches,
    });

    if (bracket.twoDayMax !== undefined && cumulative.twoDayPitches >= bracket.twoDayMax) {
      const eligibleMidnight = new Date(targetMidnight + 86400000);
      const eligibleDateFormatted = eligibleMidnight.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return {
        playerId: player.id,
        playerName: player.name,
        teamId,
        isEligible: false,
        daysRemaining: 1,
        eligibleDate: eligibleMidnight.toISOString(),
        lastEventDate: lastAppearance.date.toISOString(),
        lastPitchCount: lastAppearance.pitchCount,
        lastEventType: lastAppearance.events[0]?.type,
        eligibleDateText: `2-Day Limit Reached (${cumulative.twoDayPitches}/${bracket.twoDayMax} pitches) • Eligible ${eligibleDateFormatted}`,
        statusText: '2-Day Cap Exceeded',
        badgeVariant: 'resting',
      };
    }

    if (bracket.threeDayMax !== undefined && cumulative.threeDayPitches >= bracket.threeDayMax) {
      const eligibleMidnight = new Date(targetMidnight + 86400000);
      const eligibleDateFormatted = eligibleMidnight.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      return {
        playerId: player.id,
        playerName: player.name,
        teamId,
        isEligible: false,
        daysRemaining: 1,
        eligibleDate: eligibleMidnight.toISOString(),
        lastEventDate: lastAppearance.date.toISOString(),
        lastPitchCount: lastAppearance.pitchCount,
        lastEventType: lastAppearance.events[0]?.type,
        eligibleDateText: `3-Day Limit Reached (${cumulative.threeDayPitches}/${bracket.threeDayMax} pitches) • Eligible ${eligibleDateFormatted}`,
        statusText: '3-Day Cap Exceeded',
        badgeVariant: 'resting',
      };
    }

    return {
      playerId: player.id,
      playerName: player.name,
      teamId,
      isEligible: true,
      daysRemaining: 0,
      lastEventDate: lastAppearance.date.toISOString(),
      lastPitchCount: lastAppearance.pitchCount,
      lastEventType: lastAppearance.events[0]?.type,
      eligibleDateText: 'Eligible to pitch (0 days rest required)',
      statusText: 'Available now',
      badgeVariant: 'available',
    };
  }

  // Calendar Day Rest Calculation:
  // Day of event = Day 0.
  // Pitcher is eligible on Day (requiredRestDays + 1) at midnight.
  const eligibleMidnight = new Date(
    lastAppearance.midnight + (requiredRestDays + 1) * 86400000,
  );

  const diffMs = eligibleMidnight.getTime() - targetMidnight;
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
      lastEventType: lastAppearance.events[0]?.type,
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
    lastEventType: lastAppearance.events[0]?.type,
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
