import { Pitch } from '../../../types';
import { PITCH_TYPES_CONFIG } from '../../../utils/pitchSmart';

/**
 * Returns a human-friendly label for a pitch outcome.
 * Examples: "Called Strike", "Swinging Strike", "Ball", "Foul", "In Play (Out)", "In Play (Hit)"
 */
export function formatPitchOutcomeDescription(pitch: Pitch): string {
  switch (pitch.outcome) {
    case 'ball':
      return 'Ball';
    case 'strike':
      if (pitch.strikeDetail === 'called') return 'Called Strike';
      if (pitch.strikeDetail === 'swinging') return 'Swinging Strike';
      if (pitch.strikeDetail === 'foul_tip') return 'Foul Tip';
      return 'Strike';
    case 'foul':
      return 'Foul';
    case 'in_play':
      if (pitch.inPlayDetail === 'out') return 'In Play (Out)';
      if (pitch.inPlayDetail === 'safe') return 'In Play (Hit)';
      if (pitch.inPlayDetail === 'error') return 'In Play (Error)';
      if (pitch.inPlayDetail === 'hbp') return 'Hit By Pitch';
      return 'In Play';
    default:
      return pitch.outcome;
  }
}

/**
 * Returns a full descriptive string for a pitch including number, pitch type, and outcome.
 * Example: "Pitch #7: Fastball • Called Strike"
 */
export function formatPitchFullSummary(pitch: Pitch): string {
  const pitchTypeCfg =
    PITCH_TYPES_CONFIG[pitch.pitchType || 'fastball'] || PITCH_TYPES_CONFIG.fastball;
  const outcomeLabel = formatPitchOutcomeDescription(pitch);
  return `Pitch #${pitch.pitchNumber}: ${pitchTypeCfg.name} • ${outcomeLabel}`;
}
