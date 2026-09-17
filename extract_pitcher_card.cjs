const fs = require('fs');
let code = fs.readFileSync('src/features/events/components/EventReviewSummary.tsx', 'utf8');

const lines = code.split('\n');
const getBlock = (start, end) => lines.slice(start - 1, end).join('\n');

const cardCode = getBlock(379, 620);

// For PitcherReviewCard we'll need to pass in all the variables it uses:
// pitcher, pitchesThrown, balls, strikes, pitches, session (from the map)
// uncountedPitches, totalPitches, strikePercent, isExpanded, gameMetrics
// currentCoach, event, setExpandedPitcherId, onSaveNotes, onSaveUncountedPitches

const newContent = `
import React from 'react';
import { Shield, Target, Plus, Minus, Info, Users, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { PitcherSession, Pitch, BaseballEvent, Coach, Player } from '../../../types';
import { calculateGamePitchingMetrics } from '../../../storage';
import { PitchSmartBadge } from '../../players/components/PitchSmartBadge';
import { StrikeZoneHeatmap } from '../../pitches/components/StrikeZoneHeatmap';
import { PitchArsenalBreakdown } from '../../pitches/components/PitchArsenalBreakdown';
import { PitcherNotesEditor } from './EventReviewSummary';
import { BullpenAdjustmentPanel } from './BullpenAdjustmentPanel';

// Temporary mock PitcherNotesEditor since it wasn't extracted (or wait, I should extract it too)
// No, I'll let PitcherNotesEditor stay in EventReviewSummary or I'll extract it to this file

interface PitcherReviewCardProps {
  pitcher: Player;
  pitchesThrown: number;
  balls: number;
  strikes: number;
  pitches: Pitch[];
  session: PitcherSession | undefined;
  uncountedPitches: number;
  totalPitches: number;
  strikePercent: number;
  isExpanded: boolean;
  gameMetrics: ReturnType<typeof calculateGamePitchingMetrics>;
  currentCoach: Coach;
  event: BaseballEvent;
  onToggleExpand: (pitcherId: string | null) => void;
  onSaveNotes: (sessionId: string, coachId: string, notes: string) => void;
  onSaveUncountedPitches: (sessionId: string, pitcherId: string, value: number) => void;
  allCoaches: Coach[];
}

export const PitcherReviewCard: React.FC<PitcherReviewCardProps> = ({
  pitcher,
  pitchesThrown,
  balls,
  strikes,
  pitches,
  session,
  uncountedPitches,
  totalPitches,
  strikePercent,
  isExpanded,
  gameMetrics,
  currentCoach,
  event,
  onToggleExpand,
  onSaveNotes,
  onSaveUncountedPitches,
  allCoaches
}) => {
  const setExpandedPitcherId = onToggleExpand;
  return (
    ${cardCode.trim().replace(/^/gm, '    ')}
  );
};
`;

fs.writeFileSync('src/features/events/components/PitcherReviewCard.tsx', newContent);

// Modify EventReviewSummary
const before = lines.slice(0, 378).join('\n');
const after = lines.slice(620).join('\n');

let newSummary = before + `
              return (
                <PitcherReviewCard
                  key={pitcher.id}
                  pitcher={pitcher}
                  pitchesThrown={pitchesThrown}
                  balls={balls}
                  strikes={strikes}
                  pitches={pitches}
                  session={session}
                  uncountedPitches={uncountedPitches}
                  totalPitches={totalPitches}
                  strikePercent={strikePercent}
                  isExpanded={isExpanded}
                  gameMetrics={gameMetrics}
                  currentCoach={currentCoach}
                  event={event}
                  onToggleExpand={(id) => setExpandedPitcherId(isExpanded ? null : (id as string | null))}
                  onSaveNotes={onSaveNotes}
                  onSaveUncountedPitches={onSaveUncountedPitches}
                  allCoaches={getAllCoaches()}
                />
              );
` + after;

newSummary = newSummary.replace(
  "import { EventReviewHeader } from './EventReviewHeader';",
  "import { EventReviewHeader } from './EventReviewHeader';\nimport { PitcherReviewCard } from './PitcherReviewCard';\nimport { getAllCoaches } from '../../../storage';"
);

// We also need to move PitcherNotesEditor to PitcherReviewCard or export it. Let's export PitcherNotesEditor.
newSummary = newSummary.replace("const PitcherNotesEditor: React.FC<PitcherNotesEditorProps>", "export const PitcherNotesEditor: React.FC<PitcherNotesEditorProps>");

fs.writeFileSync('src/features/events/components/EventReviewSummary.tsx', newSummary);
console.log("PitcherReviewCard extracted!");
