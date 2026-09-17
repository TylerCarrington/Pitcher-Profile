const fs = require('fs');
let code = fs.readFileSync('src/features/events/components/EventReviewSummary.tsx', 'utf8');

const lines = code.split('\n');
const getBlock = (start, end) => lines.slice(start - 1, end).join('\n');

const headerCode = getBlock(341, 394);

const newContent = `
import React from 'react';
import { Calendar, MapPin } from 'lucide-react';
import { BaseballEvent, Team } from '../../../types';

interface EventReviewHeaderProps {
  event: BaseballEvent;
  team: Team;
  formattedDate: string;
  totalOverallPitches: number;
  totalChartedPitches: number;
  totalUncountedPitches: number;
  pitchersCount: number;
}

export const EventReviewHeader: React.FC<EventReviewHeaderProps> = ({
  event,
  team,
  formattedDate,
  totalOverallPitches,
  totalChartedPitches,
  totalUncountedPitches,
  pitchersCount
}) => {
  return (
    ${headerCode.trim().replace(/^/gm, '    ')}
  );
};
`;

fs.writeFileSync('src/features/events/components/EventReviewHeader.tsx', newContent);

// Modify EventReviewSummary to use EventReviewHeader
const before = lines.slice(0, 340).join('\n');
const after = lines.slice(394).join('\n');

let newSummary = before + `
      <EventReviewHeader
        event={event}
        team={team}
        formattedDate={formattedDate}
        totalOverallPitches={totalOverallPitches}
        totalChartedPitches={totalChartedPitches}
        totalUncountedPitches={totalUncountedPitches}
        pitchersCount={pitchersList.length}
      />
` + after;

newSummary = newSummary.replace(
  "import { BullpenAdjustmentPanel } from './BullpenAdjustmentPanel';",
  "import { BullpenAdjustmentPanel } from './BullpenAdjustmentPanel';\nimport { EventReviewHeader } from './EventReviewHeader';"
);

fs.writeFileSync('src/features/events/components/EventReviewSummary.tsx', newSummary);
console.log("EventReviewHeader extracted!");
