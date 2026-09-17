import React, { useState } from 'react';
import { calculatePitchSmartStatus, PitchSmartStatus, CumulativePitchTotals } from '../../../utils/pitchSmart';
import { PitchRulePresetId } from '../../../types';
import { Shield, AlertTriangle, Info, X, CheckCircle2 } from 'lucide-react';

interface PitchSmartBadgeProps {
  pitchCount: number;
  seasonAge?: number;
  eventDate?: string | Date;
  compact?: boolean;
  playerName?: string;
  showModalOnClick?: boolean;
  showDetails?: boolean;
  presetId?: PitchRulePresetId;
  isBullpen?: boolean;
  cumulativeTotals?: Partial<CumulativePitchTotals>;
}

export const PitchSmartBadge: React.FC<PitchSmartBadgeProps> = ({
  pitchCount,
  seasonAge = 12,
  eventDate,
  compact = false,
  playerName = 'Pitcher',
  showModalOnClick = true,
  showDetails = false,
  presetId = 'usa_pitch_smart',
  isBullpen = false,
  cumulativeTotals,
}) => {
  const [showModal, setShowModal] = useState(false);
  const status: PitchSmartStatus = calculatePitchSmartStatus(
    pitchCount,
    seasonAge,
    eventDate,
    presetId,
    cumulativeTotals,
  );

  const getStatusColor = () => {
    if (status.isAtOrOverMax || status.isAtOrOver2DayMax || status.isAtOrOver3DayMax || status.isAtOrOverSingleEventMax) {
      return isBullpen
        ? 'bg-amber-600 text-white border-amber-700'
        : 'bg-rose-600 text-white border-rose-700';
    }
    if (status.isNearMax || status.isNear2DayMax || status.isNear3DayMax || status.isNearSingleEventMax) {
      return isBullpen
        ? 'bg-amber-500 text-slate-950 border-amber-600'
        : 'bg-rose-500 text-white border-rose-600';
    }
    if (status.isNearNextTier) {
      return 'bg-amber-400 text-slate-950 border-amber-500';
    }
    if (status.restDaysRequired >= 3) return 'bg-orange-100 text-orange-900 border-orange-300';
    if (status.restDaysRequired >= 1) return 'bg-blue-100 text-blue-900 border-blue-300';
    return 'bg-emerald-100 text-emerald-900 border-emerald-300';
  };

  return (
    <>
      <button
        type="button"
        disabled={!showModalOnClick}
        onClick={() => showModalOnClick && setShowModal(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold transition text-left ${getStatusColor()} ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        } ${showModalOnClick ? 'hover:opacity-90 active:scale-98 cursor-pointer' : 'cursor-default'}`}
        title={`View ${status.preset.shortName} Guidelines`}
      >
        <Shield className="w-3.5 h-3.5 shrink-0 opacity-80" />
        <span className="font-mono font-bold">
          {pitchCount}/{status.dailyMax}
        </span>
        <span className="text-[10px] opacity-90 hidden sm:inline">
          &bull; {status.currentTier.label}
        </span>
        {status.isNearNextTier && (
          <span className="px-1 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
            +{status.pitchesUntilNextTier} to next tier
          </span>
        )}
        {status.isAtOrOverMax && (
          <span
            className={`px-1 py-0.2 rounded text-[9px] font-black uppercase ${
              isBullpen ? 'bg-amber-900 text-amber-100' : 'bg-black text-white'
            }`}
          >
            {isBullpen ? 'Bullpen Limit' : 'Limit Reached'}
          </span>
        )}
      </button>

      {/* Detailed Modal with Full Age Bracket Guidelines */}
      {showModal && (
        <div
          id="pitch-smart-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {status.preset.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {playerName} &bull; {status.bracket.ageLabel} ({seasonAge}U)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Arm Health Status Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                status.isAtOrOverMax
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : status.isNearMax || status.isNearNextTier
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                  Current Session Status
                </div>
                <div className="text-base font-black">
                  {pitchCount} of {status.dailyMax} Pitches Thrown
                </div>
                <div className="text-xs mt-0.5">{status.nextEligibleDateText}</div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold px-2 py-1 rounded-md bg-white shadow-xs border border-black/10 inline-block">
                  {status.currentTier.label}
                </span>
                <div className="text-[10px] text-slate-500 mt-1">
                  {status.pitchesRemaining} left today
                </div>
              </div>
            </div>

            {/* Visual Progress Bar to Daily Max */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Daily Pitch Count Progress</span>
                <span className="font-mono">{status.percentOfMax}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-300 ${
                    status.isAtOrOverMax
                      ? 'bg-rose-600'
                      : status.isNearMax
                      ? 'bg-rose-500'
                      : status.percentOfMax > 60
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, status.percentOfMax)}%` }}
                />
              </div>
            </div>

            {/* Active Warnings if Any */}
            {status.warningMessages.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Rule & Limit Warnings</span>
                </div>
                <div className="space-y-1 pt-1">
                  {status.warningMessages.map((msg, idx) => (
                    <p key={idx} className="text-xs text-amber-950 font-medium">
                      • {msg}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Multi-Day & Single-Event Cumulative Tournament Limits */}
            {(status.twoDayMax !== undefined || status.threeDayMax !== undefined || status.singleEventMax !== undefined) && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tournament Cumulative Limits
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {status.twoDayMax !== undefined && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-500">2-Day Rolling Max</div>
                      <div className="text-sm font-black text-slate-800">
                        {status.twoDayPitches ?? pitchCount} / {status.twoDayMax}p
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {status.twoDayRemaining !== undefined ? `${status.twoDayRemaining}p remaining` : ''}
                      </div>
                    </div>
                  )}
                  {status.threeDayMax !== undefined && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-500">3-Day Rolling Max</div>
                      <div className="text-sm font-black text-slate-800">
                        {status.threeDayPitches ?? pitchCount} / {status.threeDayMax}p
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {status.threeDayRemaining !== undefined ? `${status.threeDayRemaining}p remaining` : ''}
                      </div>
                    </div>
                  )}
                  {status.singleEventMax !== undefined && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Single-Event Ceiling</div>
                      <div className="text-sm font-black text-slate-800">
                        {status.singleEventPitches ?? pitchCount} / {status.singleEventMax}p
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {status.singleEventRemaining !== undefined ? `${status.singleEventRemaining}p remaining` : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bracket Tier Table */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Mandatory Rest Tiers ({status.bracket.ageLabel})
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                {status.bracket.tiers.map((tier) => {
                  const isCurrent =
                    pitchCount >= tier.min && pitchCount <= tier.max;
                  return (
                    <div
                      key={tier.label}
                      className={`p-2.5 flex items-center justify-between ${
                        isCurrent
                          ? 'bg-emerald-50/80 font-bold text-emerald-950'
                          : 'bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isCurrent ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span>
                          {tier.min} - {tier.max} Pitches
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${tier.badgeColor}`}
                      >
                        {tier.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Safety Guidance Note */}
            {status.bracket.warningNote && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{status.bracket.warningNote}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition"
            >
              Close Guidelines
            </button>
          </div>
        </div>
      )}
    </>
  );
};
