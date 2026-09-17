export interface Coach {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: 'head_coach' | 'assistant_coach';
  googleId?: string;
}

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber: string;
  seasonAge: number; // Used for pitch-limit brackets and safety rules
  imageUrl?: string;
  throws?: 'R' | 'L';
  bats?: 'R' | 'L' | 'S';
  createdAt: string;
}

export type PitchRulePresetId =
  | 'usa_pitch_smart'
  | 'usssa_travel'
  | 'cal_ripken_babe_ruth'
  | 'nfhs_high_school'
  | 'perfect_game_travel'
  | 'top_tier';

export interface SafetyWarningFlag {
  id: string;
  type: 'rest_violation' | 'approaching_limit' | 'limit_exceeded';
  message: string;
  pitchCount: number;
  threshold: number;
  timestamp: string;
  eventType: EventType;
  severity: 'soft' | 'hard'; // 'soft' for bullpen, 'hard' for game
}

export interface PlayerRestStatus {
  playerId: string;
  playerName: string;
  teamId: string;
  isEligible: boolean;
  daysRemaining: number;
  eligibleDate?: string;
  eligibleDateText: string;
  statusText: string; // "Available now" or "Available in X days"
  lastEventDate?: string;
  lastPitchCount?: number;
  lastEventType?: EventType;
  badgeVariant: 'available' | 'resting' | 'due_soon';
}

export interface Team {
  id: string;
  name: string;
  imageUrl?: string;
  createdBy: string; // Coach ID
  createdAt: string;
  memberCoachIds: string[];
  inviteCode: string;
  inviteCodeCreatedAt?: string;
  pitchRulePresetId?: PitchRulePresetId; // Phase 3 pitch rule preset
}

export type EventType = 'game' | 'bullpen';
export type EventStatus = 'in_progress' | 'ended';

export interface BaseballEvent {
  id: string;
  teamId: string;
  type: EventType;
  opponent?: string; // Optional for games
  location?: string; // Optional field/complex
  scheduledAt: string;
  status: EventStatus;
  createdBy: string; // Coach ID
  createdAt: string;
  endedAt?: string;
  // Phase 2: Game Mechanics State
  currentInning?: number; // 1, 2, 3...
  currentOuts?: number; // 0, 1, 2
  inningHalf?: 'top' | 'bottom';
}

export type PitchOutcome = 'ball' | 'strike' | 'foul' | 'in_play';
export type StrikeSubDetail = 'called' | 'swinging' | 'foul_tip';
export type InPlaySubDetail = 'safe' | 'out' | 'error' | 'hbp';

export type PitchType =
  | 'fastball'
  | 'changeup'
  | 'curveball'
  | 'slider'
  | 'cutter'
  | 'other';

export type ZoneRegion = 'strike_zone' | 'near_miss' | 'far_miss' | 'out_of_zone';

export interface PitchLocation {
  // Normalized coordinates from -1.0 to 1.0 (0,0 is exact center of strike zone)
  // x: -1 is left edge of far-miss, +1 is right edge of far-miss
  // y: -1 is top edge of far-miss, +1 is bottom edge of far-miss
  x: number;
  y: number;
  region: ZoneRegion;
  cellIndex?: number; // 1 to 9 if in 3x3 strike zone
  label?: string; // e.g., "High & Tight", "Low & Away"
}

export interface Pitch {
  id: string;
  sessionId: string;
  eventId: string;
  pitcherId: string;
  pitchNumber: number;
  pitchType?: PitchType;
  outcome: PitchOutcome;
  strikeDetail?: StrikeSubDetail;
  inPlayDetail?: InPlaySubDetail;
  location?: PitchLocation | null;
  ballsBefore: number;
  strikesBefore: number;
  ballsAfter: number;
  strikesAfter: number;
  // Phase 2: In-game tracking
  inning?: number;
  outsBefore?: number;
  outsAfter?: number;
  isFirstPitch?: boolean;
  isStrikeout?: boolean;
  isWalk?: boolean;
  timestamp: string;
  recordedBy: string; // coachId
}

export interface PitcherSession {
  id: string;
  eventId: string;
  pitcherId: string;
  status: 'active' | 'completed';
  startedAt: string;
  endedAt?: string;
  // Notes are private per coach: coachId -> private note string
  coachNotes: Record<string, string>;
  warningFlags?: SafetyWarningFlag[]; // Phase 3 flagged warnings
  uncountedPitches?: number;
}

export interface PitcherEventSummary {
  pitcherId: string;
  pitcher: Player;
  totalPitches: number;
  balls: number;
  strikes: number; // strikes + fouls + in-play
  fouls: number;
  inPlay: number;
  // Phase 3 Safety Flags
  warningFlags?: SafetyWarningFlag[];
  // Phase 2 game metrics
  battersFaced?: number;
  inningsPitched?: string; // e.g. "2.1"
  outsRecorded?: number;
  strikeouts?: number; // K
  walks?: number; // BB
  firstPitchStrikes?: number; // FPS
  firstPitchTotal?: number;
  firstPitchStrikeRate?: number; // %
}
