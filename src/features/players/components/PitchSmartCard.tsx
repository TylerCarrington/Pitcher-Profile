import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PitchSmartStatus, CumulativePitchTotals } from '../../../utils/pitchSmart';
import { PlayerRestStatus } from '../../../types';

export interface PitchSmartCardProps {
  pitchSmart: PitchSmartStatus;
  cumulativeTotals: CumulativePitchTotals;
  restStatus: PlayerRestStatus;
  seasonAge: number;
  teamName: string;
}

export const PitchSmartCard: React.FC<PitchSmartCardProps> = ({
  pitchSmart,
  cumulativeTotals,
  restStatus,
  seasonAge,
  teamName,
}) => {
  return (
    <div
      className={`p-4 rounded-xl border ${
        !restStatus.isEligible
          ? 'bg-amber-50/80 border-amber-300'
          : pitchSmart.isAtOrOverMax
          ? 'bg-rose-50 border-rose-300'
          : pitchSmart.isNearMax
          ? 'bg-amber-50 border-amber-300'
          : 'bg-emerald-50/60 border-emerald-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {!restStatus.isEligible ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : pitchSmart.isAtOrOverMax ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-slate-900">
                {pitchSmart.preset.name}
              </h4>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-900 text-emerald-400">
                {teamName}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Age Group: <span className="font-bold">{seasonAge}U</span> ({pitchSmart.bracket.ageLabel}) &bull; Daily Max:{' '}
              <span className="font-bold">{pitchSmart.dailyMax} pitches</span>
              {pitchSmart.bracket.twoDayMax && (
                <span> &bull; 2-Day Max: <span className="font-bold">{pitchSmart.bracket.twoDayMax}p</span></span>
              )}
              {pitchSmart.bracket.threeDayMax && (
                <span> &bull; 3-Day Max: <span className="font-bold">{pitchSmart.bracket.threeDayMax}p</span></span>
              )}
              {pitchSmart.bracket.singleEventMax && (
                <span> &bull; Event Ceiling: <span className="font-bold">{pitchSmart.bracket.singleEventMax}p</span></span>
              )}
            </p>
            {/* Active Warnings if Any */}
            {pitchSmart.warningMessages.length > 0 && (
              <div className="mt-2 p-2 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-950 text-xs font-semibold space-y-0.5">
                {pitchSmart.warningMessages.map((w, idx) => (
                  <div key={idx}>⚠️ {w}</div>
                ))}
              </div>
            )}
            <div className="mt-2 text-xs flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-md font-bold text-xs ${
                  restStatus.isEligible
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {restStatus.statusText}
              </span>
              <span className="text-slate-500">{restStatus.eligibleDateText}</span>
            </div>
            {restStatus.lastEventDate && (
              <p className="text-[11px] text-slate-500 mt-1">
                Last appearance on {teamName}: <strong>{restStatus.lastPitchCount} pitches</strong> thrown in{' '}
                {restStatus.lastEventType === 'game' ? 'a game' : 'bullpen'}.
              </p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-black text-slate-900 font-mono">
            {cumulativeTotals.todayPitches}{' '}
            <span className="text-xs text-slate-400 font-normal">/ {pitchSmart.dailyMax}</span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase">Today Thrown</span>
          {(pitchSmart.twoDayMax !== undefined || pitchSmart.threeDayMax !== undefined) && (
            <div className="text-[10px] text-slate-500 mt-0.5">
              {pitchSmart.twoDayMax !== undefined && (
                <div>2-Day: <strong>{cumulativeTotals.twoDayPitches}</strong> / {pitchSmart.twoDayMax}p</div>
              )}
              {pitchSmart.threeDayMax !== undefined && (
                <div>3-Day: <strong>{cumulativeTotals.threeDayPitches}</strong> / {pitchSmart.threeDayMax}p</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar towards daily limit */}
      <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            pitchSmart.isAtOrOverMax
              ? 'bg-rose-600'
              : pitchSmart.isNearMax
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(pitchSmart.percentOfMax, 100)}%` }}
        />
      </div>
    </div>
  );
};
