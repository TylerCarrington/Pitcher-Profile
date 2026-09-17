const fs = require('fs');
let code = fs.readFileSync('src/features/events/components/EventReviewSummary.tsx', 'utf8');

const lines = code.split('\n');
const getBlock = (start, end) => lines.slice(start - 1, end).join('\n');

const panelCode = getBlock(205, 357); // Including interfaces BullpenManualAdjustmentProps

const newContent = `
import React, { useState } from 'react';
import { Save, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { PitcherSession } from '../../../types';

${panelCode.replace('const BullpenManualAdjustment: React.FC', 'export const BullpenAdjustmentPanel: React.FC')}
`;

fs.writeFileSync('src/features/events/components/BullpenAdjustmentPanel.tsx', newContent);

// Remove it from EventReviewSummary
const before = lines.slice(0, 204).join('\n');
const after = lines.slice(357).join('\n');

let newSummary = before + '\n' + after;
newSummary = newSummary.replace(
  "import { EventReviewSummaryProps } from './types';",
  "import { EventReviewSummaryProps } from './types';\nimport { BullpenAdjustmentPanel } from './BullpenAdjustmentPanel';"
);

newSummary = newSummary.replace(/<BullpenManualAdjustment/g, '<BullpenAdjustmentPanel');

fs.writeFileSync('src/features/events/components/EventReviewSummary.tsx', newSummary);
console.log("BullpenAdjustmentPanel extracted!");
