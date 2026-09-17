import React from 'react';
import { Info, CheckCircle2, Sparkles } from 'lucide-react';
import {
  PitchOutcome,
  PitchType,
  StrikeSubDetail,
  InPlaySubDetail,
  PitchLocation,
} from '../../../types';
import { PitchOutcomeSelector } from './PitchOutcomeSelector';

export interface PitchOutcomeButtonsProps {
  eventType: 'game' | 'bullpen';
  pendingLocation: PitchLocation | null;
  pendingStrike: boolean;
  strikeSourceLocation: PitchLocation | null;
  selectedPitchType: PitchType;
  autoLogNotice: string | null;
  onRecordPitch: (outcome: PitchOutcome, strikeDetail?: StrikeSubDetail, inPlayDetail?: InPlaySubDetail) => void;
  onPendingStrikeChange: (pending: boolean, loc: PitchLocation | null) => void;
  onPitchTypeChange: (type: PitchType) => void;
  onOpenFastEntryModal: () => void;
}

export const PitchOutcomeButtons: React.FC<PitchOutcomeButtonsProps> = ({
  eventType,
  pendingLocation,
  pendingStrike,
  strikeSourceLocation,
  selectedPitchType,
  autoLogNotice,
  onRecordPitch,
  onPendingStrikeChange,
  onPitchTypeChange,
  onOpenFastEntryModal,
}) => {
  return (
    <div className="w-full max-w-sm flex flex-col justify-center space-y-3 sm:space-y-4">
      {/* Outcome Selector */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Pitch Result
          </div>
          <button
            type="button"
            id="fast-entry-info-badge-btn"
            onClick={onOpenFastEntryModal}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-2 py-0.5 rounded-full transition active:scale-95 cursor-pointer"
            title="Flagship Fast Entry guide"
          >
            <Info className="w-3 h-3 text-emerald-600" />
            <span>Fast Entry</span>
          </button>
        </div>
        <PitchOutcomeSelector
          eventType={eventType}
          currentLocation={pendingLocation}
          onRecordPitch={onRecordPitch}
          pendingStrike={pendingStrike}
          onPendingStrikeChange={(pending) => onPendingStrikeChange(pending, pendingLocation)}
          selectedPitchType={selectedPitchType}
          onPitchTypeChange={onPitchTypeChange}
        />
      </div>

      {/* Status Hint & Auto-Log Feedback */}
      {autoLogNotice ? (
        <div
          id="auto-log-strike-notice"
          className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xl py-1.5 px-3 text-center flex items-center justify-center gap-2 shadow-xs animate-in fade-in"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{autoLogNotice}</span>
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 text-center transition-colors">
          {pendingStrike && strikeSourceLocation ? (
            <span className="text-emerald-600 font-semibold flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Tap new location on grid to auto-log strike &amp; start next pitch</span>
            </span>
          ) : (
            <span>Location is optional &bull; Resets automatically after each pitch</span>
          )}
        </div>
      )}
    </div>
  );
};
