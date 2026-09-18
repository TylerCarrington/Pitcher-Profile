import React from 'react';
import { Info, CheckCircle2, Sparkles, Undo2 } from 'lucide-react';
import {
  Pitch,
  PitchOutcome,
  PitchType,
  StrikeSubDetail,
  InPlaySubDetail,
  PitchLocation,
} from '../../../types';
import { PitchOutcomeSelector } from './PitchOutcomeSelector';
import { formatPitchOutcomeDescription } from '../utils/pitchFormatters';

export interface PitchOutcomeButtonsProps {
  eventType: 'game' | 'bullpen';
  pendingLocation: PitchLocation | null;
  pendingStrike: boolean;
  strikeSourceLocation: PitchLocation | null;
  selectedPitchType: PitchType;
  autoLogNotice: string | null;
  lastPitch?: Pitch | null;
  onRecordPitch: (outcome: PitchOutcome, strikeDetail?: StrikeSubDetail, inPlayDetail?: InPlaySubDetail) => void;
  onPendingStrikeChange: (pending: boolean, loc: PitchLocation | null) => void;
  onPitchTypeChange: (type: PitchType) => void;
  onOpenFastEntryModal: () => void;
  onUndoPitch?: () => void;
}

export const PitchOutcomeButtons: React.FC<PitchOutcomeButtonsProps> = ({
  eventType,
  pendingLocation,
  pendingStrike,
  strikeSourceLocation,
  selectedPitchType,
  autoLogNotice,
  lastPitch,
  onRecordPitch,
  onPendingStrikeChange,
  onPitchTypeChange,
  onOpenFastEntryModal,
  onUndoPitch,
}) => {
  return (
    <div className="w-full max-w-sm flex flex-col justify-center space-y-3 sm:space-y-4">
      {/* Outcome Selector Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Pitch Result
          </div>
          <div className="flex items-center gap-1.5">
            {lastPitch && onUndoPitch && (
              <button
                type="button"
                id="quick-undo-top-badge-btn"
                onClick={onUndoPitch}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full transition active:scale-95 cursor-pointer shadow-2xs"
                title={`Undo Pitch #${lastPitch.pitchNumber} (${formatPitchOutcomeDescription(lastPitch)})`}
              >
                <Undo2 className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Undo #{lastPitch.pitchNumber}</span>
              </button>
            )}
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

      {/* Primary Prominent Undo Action Bar */}
      {lastPitch && onUndoPitch && (
        <div className="pt-0.5">
          <button
            type="button"
            id="undo-last-pitch-btn"
            onClick={onUndoPitch}
            className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-amber-50/90 active:bg-amber-100 border border-slate-200/90 hover:border-amber-300 text-slate-700 hover:text-amber-950 text-xs font-bold transition flex items-center justify-between group shadow-2xs cursor-pointer active:scale-[0.99]"
            title={`Undo Pitch #${lastPitch.pitchNumber} (${formatPitchOutcomeDescription(lastPitch)})`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1 rounded-lg bg-white group-hover:bg-amber-100 border border-slate-200 group-hover:border-amber-300 text-slate-500 group-hover:text-amber-700 transition shrink-0 shadow-2xs">
                <Undo2 className="w-3.5 h-3.5 text-amber-600" />
              </span>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-slate-800 group-hover:text-amber-950">
                    Undo Pitch #{lastPitch.pitchNumber}
                  </span>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300 truncate">
                    {formatPitchOutcomeDescription(lastPitch)}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 group-hover:text-amber-800 shrink-0 ml-2">
              Restores {lastPitch.ballsBefore}-{lastPitch.strikesBefore} count &rsaquo;
            </div>
          </button>
        </div>
      )}

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
