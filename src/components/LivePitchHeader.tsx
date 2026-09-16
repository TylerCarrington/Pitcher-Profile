import React, { useState } from 'react';
import { Player, BaseballEvent } from '../types';
import { PitchSmartBadge } from './PitchSmartBadge';
import { calculatePitchSmartStatus } from '../utils/pitchSmart';
import { User, LogOut, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';

interface LivePitchHeaderProps {
  pitcher: Player;
  event: BaseballEvent;
  balls: number;
  strikes: number;
  pitchCount: number;
  totalBalls?: number;
  totalStrikes?: number;
  // Phase 2 game mechanics
  currentInning?: number;
  currentOuts?: number;
  battersFaced?: number;
  inningsPitched?: string;
  strikeouts?: number;
  walks?: number;
  firstPitchStrikes?: number;
  firstPitchTotal?: number;
  onUpdateOuts?: (outs: number) => void;
  onEndInning?: () => void;
  onEndSession: () => void;
  onEndEvent: () => void;
}

export const LivePitchHeader: React.FC<LivePitchHeaderProps> = ({
  pitcher,
  event,
  balls,
  strikes,
  pitchCount,
  totalBalls = 0,
  totalStrikes = 0,
  currentInning = 1,
  currentOuts = 0,
  battersFaced = 0,
  inningsPitched = '0.0',
  strikeouts = 0,
  walks = 0,
  firstPitchStrikes = 0,
  firstPitchTotal = 0,
  onUpdateOuts,
  onEndInning,
  onEndSession,
  onEndEvent,
}) => {
  const [confirmingEndInning, setConfirmingEndInning] = useState(false);
  const pitchSmart = calculatePitchSmartStatus(pitchCount, pitcher.seasonAge, event.scheduledAt);
  const fpsPct = firstPitchTotal > 0 ? Math.round((firstPitchStrikes / firstPitchTotal) * 100) : 0;
  const strikePct = pitchCount > 0 ? Math.round((totalStrikes / pitchCount) * 100) : 0;
  const sbRatio = totalBalls > 0 ? (totalStrikes / totalBalls).toFixed(2) : (totalStrikes > 0 ? `${totalStrikes}:0` : '0.00');

  return (
    <header
      id="live-pitch-header"
      className="sticky top-0 z-20 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-md transition-all"
    >
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
        {/* Top Row on Mobile: Pitcher Info (Left) & End Session/Event Actions (Top Right) */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Pitcher Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              {pitcher.imageUrl ? (
                <img
                  src={pitcher.imageUrl}
                  alt={pitcher.name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800 border-2 border-emerald-500 flex items-center justify-center font-bold text-emerald-400">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 font-black text-[9px] px-1 py-0.2 rounded-full border border-slate-900 shadow">
                #{pitcher.jerseyNumber}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-sm sm:text-base tracking-tight truncate text-white">
                  {pitcher.name}
                </h2>
                <span className="text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded uppercase font-bold tracking-wider bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {pitcher.throws || 'R'}HP
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <span className="capitalize font-medium text-emerald-400 truncate">
                  {event.type === 'game' ? (event.opponent ? `vs ${event.opponent}` : 'Game') : 'Bullpen Session'}
                </span>
                {event.location && (
                  <>
                    <span className="hidden xs:inline">•</span>
                    <span className="truncate hidden xs:inline">{event.location}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Top Right Action Buttons */}
          <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
            <button
              type="button"
              id="end-session-header-btn"
              onClick={onEndSession}
              title="End pitcher's session"
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition flex items-center gap-1 active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>End Session</span>
            </button>
            <button
              type="button"
              id="end-event-header-btn"
              onClick={onEndEvent}
              title="End entire event"
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-900/60 transition flex items-center gap-1 active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden xs:inline">End Event</span>
            </button>
          </div>
        </div>

        {/* Count & Pitch Smart Glance Hub */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-3 pt-1 sm:pt-0">
          {/* Running Balls & Strikes Count */}
          <div
            id="count-display"
            className="flex items-center gap-1.5 bg-slate-950/80 px-2 sm:px-3 py-1 rounded-lg border border-slate-800"
          >
            <div className="text-right pr-1.5 sm:pr-2 border-r border-slate-800">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                Count
              </div>
              <div className="font-mono font-black text-base sm:text-xl text-emerald-400 leading-none">
                {balls} - {strikes}
              </div>
            </div>

            {/* Balls indicator dots */}
            <div className="flex flex-col gap-1 pl-0.5">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-[9px] font-bold text-slate-500 w-2.5">B</span>
                {[0, 1, 2, 3].map((idx) => (
                  <span
                    key={`b-${idx}`}
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${
                      idx < balls ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <span className="text-[9px] font-bold text-slate-500 w-2.5">S</span>
                {[0, 1, 2].map((idx) => (
                  <span
                    key={`s-${idx}`}
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${
                      idx < strikes ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Pitcher Live S:B Ratio Header Badge */}
          <div
            id="strike-ball-ratio-header-badge"
            className="flex flex-col items-center justify-center bg-slate-950/90 px-2 sm:px-3 py-1 rounded-lg border border-slate-800 text-center"
            title="Pitcher Session Strikes / Balls & S:B Ratio"
          >
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
              Strikes / Balls
            </span>
            <div className="font-mono font-bold text-xs sm:text-sm text-emerald-400 leading-tight">
              {totalStrikes} / {totalBalls} <span className="text-slate-400 font-normal text-[10px] sm:text-[11px]">({sbRatio})</span>
            </div>
          </div>

          {/* Pitch Smart Health & Count Pill */}
          <div className="flex items-center">
            <PitchSmartBadge
              pitchCount={pitchCount}
              seasonAge={pitcher.seasonAge || 12}
              eventDate={event.scheduledAt}
              playerName={pitcher.name}
            />
          </div>
        </div>
      </div>

      {/* Phase 2: Game Mechanics Dedicated Header Row */}
      {event.type === 'game' && (
        <div
          id="game-mechanics-header-row"
          className="bg-slate-950/95 border-t border-slate-800/80 px-3 sm:px-4 py-1.5 text-xs"
        >
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
            {/* Left: Inning & Manual End Inning Action */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 font-bold text-slate-200">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400">Inning</span>
                <span className="font-mono text-xs sm:text-sm text-emerald-400 font-black">{currentInning}</span>
              </div>

              {onEndInning && (
                confirmingEndInning ? (
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-amber-500/40 text-[11px]">
                    <span className="text-amber-300 font-semibold text-[10px] sm:text-[11px]">End Inning {currentInning}?</span>
                    <button
                      type="button"
                      id="confirm-end-inning-yes-btn"
                      onClick={() => {
                        onEndInning();
                        setConfirmingEndInning(false);
                      }}
                      className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      id="confirm-end-inning-no-btn"
                      onClick={() => setConfirmingEndInning(false)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    id="manual-end-inning-btn"
                    onClick={() => setConfirmingEndInning(true)}
                    title="End inning early for youth run-limit or bat-around rules"
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[10px] sm:text-[11px] font-semibold transition flex items-center gap-0.5 sm:gap-1 active:scale-95"
                  >
                    <span>End Inning</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                )
              )}
            </div>

            {/* Center: Outs Tracker with Clickable Direct Manual Adjustment */}
            <div
              id="outs-control-hub"
              className="flex items-center gap-1.5 sm:gap-2 bg-slate-900 px-2 sm:px-2.5 py-1 rounded-lg border border-slate-800"
            >
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Outs
              </span>

              {/* Visual Out Indicator Dots */}
              <div className="flex items-center gap-1 mr-0.5">
                {[0, 1].map((idx) => (
                  <span
                    key={`out-dot-${idx}`}
                    className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border transition-all ${
                      idx < currentOuts
                        ? 'bg-amber-400 border-amber-300 shadow-xs shadow-amber-400/50'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Direct Manual Outs Override */}
              {onUpdateOuts && (
                <div className="flex items-center gap-0.5 border-l border-slate-800 pl-1">
                  {[0, 1, 2].map((val) => (
                    <button
                      key={`set-out-${val}`}
                      type="button"
                      onClick={() => onUpdateOuts(val)}
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded text-[10px] sm:text-[11px] font-bold font-mono transition ${
                        currentOuts === val
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title={`Set outs directly to ${val}`}
                    >
                      {val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onUpdateOuts(Math.min(2, currentOuts + 1))}
                    disabled={currentOuts >= 2}
                    className="px-1 text-[10px] sm:text-[11px] font-bold text-slate-400 hover:text-emerald-400 disabled:opacity-30 transition"
                    title="Add 1 out (e.g., Double play, Pickoff)"
                  >
                    +1
                  </button>
                </div>
              )}
            </div>

            {/* Right: In-Game Line (FPS% and IP • BF) */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-300 font-mono text-[11px] sm:text-xs ml-auto">
              <div
                className="flex items-center gap-1 bg-slate-900/80 px-2 py-0.5 sm:py-1 rounded border border-slate-800"
                title="First-Pitch Strikes (FPS)"
              >
                <span className="text-[9px] uppercase font-sans font-bold text-slate-400">FPS</span>
                <span className="font-bold text-emerald-400">
                  {firstPitchTotal > 0 ? `${firstPitchStrikes}/${firstPitchTotal} (${fpsPct}%)` : '0/0'}
                </span>
              </div>

              <div
                className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-0.5 sm:py-1 rounded border border-slate-800"
                title="Innings Pitched & Batters Faced"
              >
                <span className="font-bold text-white">{inningsPitched} IP</span>
                <span className="text-slate-600">•</span>
                <span className="font-bold text-slate-400">{battersFaced} BF</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Alert Ticker if Near Next Rest Tier or Limit */}
      {(pitchSmart.isNearNextTier || pitchSmart.isNearMax || pitchSmart.isAtOrOverMax) && (
        <div className="bg-amber-500/15 border-t border-amber-500/30 px-4 py-1 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            {pitchSmart.isAtOrOverMax ? (
              <strong className="text-rose-300">
                DAILY MAX REACHED ({pitchSmart.dailyMax} pitches). Remove pitcher immediately per
                Pitch Smart rules.
              </strong>
            ) : pitchSmart.isNearMax ? (
              <strong>
                Approaching daily limit: only {pitchSmart.pitchesRemaining} pitch
                {pitchSmart.pitchesRemaining > 1 ? 'es' : ''} left!
              </strong>
            ) : (
              <span>
                <strong>Threshold Warning:</strong> {pitchSmart.pitchesUntilNextTier} pitch
                {pitchSmart.pitchesUntilNextTier && pitchSmart.pitchesUntilNextTier > 1 ? 'es' : ''} until entering{' '}
                {pitchSmart.nextTier?.label || 'next tier'}.
              </span>
            )}
          </span>
        </div>
      )}
    </header>
  );
};
