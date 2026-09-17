import React, { useState } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';
import { PitcherSession } from '../../../types';

interface BullpenManualAdjustmentProps {
  session: PitcherSession;
  pitchesThrown: number;
  totalPitches: number;
  onUpdateSessionUncountedPitches: (sessionId: string, count: number) => void;
}

export const BullpenAdjustmentPanel: React.FC<BullpenManualAdjustmentProps> = ({
  session,
  pitchesThrown,
  totalPitches,
  onUpdateSessionUncountedPitches,
}) => {
  const [isAdjusting, setIsAdjusting] = useState(false);
  const uncounted = session.uncountedPitches || 0;

  if (!isAdjusting) {
    return (
      <div
        id={`bullpen-adjustment-bar-${session.id}`}
        className="flex items-center justify-between gap-2 py-1 text-xs"
      >
        <div className="flex items-center gap-1.5 text-slate-500">
          {uncounted > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              +{uncounted} uncounted side pitches ({totalPitches} total)
            </span>
          ) : (
            <span className="text-slate-400">Pitch Count: {pitchesThrown} pitches</span>
          )}
        </div>
        <button
          type="button"
          id={`open-adjust-uncounted-${session.id}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsAdjusting(true);
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition active:scale-95 cursor-pointer"
        >
          <SlidersHorizontal className="w-3 h-3 text-slate-500" />
          <span>{uncounted > 0 ? 'Adjust' : 'Adjust Pitch Count'}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      id={`bullpen-adjustment-panel-${session.id}`}
      onClick={(e) => e.stopPropagation()}
      className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 animate-in fade-in duration-150"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600 shrink-0" />
            <h5 className="font-extrabold text-xs tracking-wide text-slate-900 uppercase">
              Manual Pitch Count Adjustment
            </h5>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
            Add warm-ups or uncounted throws to count toward Pitch Smart rest-day limits.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              id={`decrement-uncounted-${session.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (uncounted > 0) {
                  onUpdateSessionUncountedPitches(session.id, uncounted - 1);
                }
              }}
              className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 active:scale-95 flex items-center justify-center font-bold text-slate-700 transition"
              title="Decrease uncounted pitches"
            >
              -
            </button>
            <input
              type="number"
              id={`input-uncounted-${session.id}`}
              min="0"
              max="150"
              value={uncounted}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onUpdateSessionUncountedPitches(session.id, isNaN(val) ? 0 : Math.max(0, val));
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-14 h-7 text-center border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            />
            <button
              type="button"
              id={`increment-uncounted-${session.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateSessionUncountedPitches(session.id, uncounted + 1);
              }}
              className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 active:scale-95 flex items-center justify-center font-bold text-slate-700 transition"
              title="Increase uncounted pitches"
            >
              +
            </button>
            <span className="text-slate-400 text-xs px-1">pitches</span>
          </div>

          <button
            type="button"
            id={`done-adjust-uncounted-${session.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setIsAdjusting(false);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>

      {uncounted > 0 && (
        <div className="text-xs font-semibold text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col sm:flex-row justify-between gap-2">
          <span>Charted Pitches: <strong className="text-slate-900">{pitchesThrown}</strong></span>
          <span>Uncounted Pitches: <strong className="text-slate-900">{uncounted}</strong></span>
          <span className="text-emerald-700">Total Safety Count: <strong className="text-emerald-900">{totalPitches}</strong></span>
        </div>
      )}
    </div>
  );
};
