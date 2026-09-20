import React, { useMemo, useState, forwardRef } from 'react';
import { Player, Pitch, PitcherSession, BaseballEvent, Team } from '../../../types';
import { PITCH_TYPES_CONFIG, calculatePitchSmartStatus } from '../../../utils/pitchSmart';
import { calculateGamePitchingMetrics } from '../../../storage';
import { Target, Activity } from 'lucide-react';

export interface SinglePlayerSessionExportCardProps {
  pitcher: Player;
  pitches: Pitch[];
  session?: PitcherSession;
  event?: BaseballEvent | null;
  team?: Team | null;
  pitchesThrown: number;
  balls: number;
  strikes: number;
  totalPitches?: number;
  strikePercent?: number;
  gameMetrics?: ReturnType<typeof calculateGamePitchingMetrics>;
  coachNotes?: { authorName: string; noteText: string }[];
  includeNotes?: boolean;
  outcomeFilter?: 'all' | 'strike' | 'ball' | 'in_play' | 'foul';
}

// Geometric boundaries in normalized [-1, 1] coordinate space
const STRIKE_X = 0.42;
const STRIKE_Y = 0.48;
const NEAR_X = 0.68;
const NEAR_Y = 0.72;
const FAR_X = 0.94;
const FAR_Y = 0.94;

interface PitchTypeStat {
  total: number;
  strikes: number;
  swings: number;
  whiffs: number;
}

export const SinglePlayerSessionExportCard = forwardRef<
  HTMLDivElement,
  SinglePlayerSessionExportCardProps
>(({
  pitcher,
  pitches,
  session,
  event,
  team,
  pitchesThrown,
  balls,
  strikes,
  totalPitches: customTotal,
  strikePercent: customStrikePercent,
  gameMetrics: customGameMetrics,
  coachNotes = [],
  includeNotes = true,
  outcomeFilter = 'all',
}, ref) => {
  const [playerImgError, setPlayerImgError] = useState(false);
  const [teamImgError, setTeamImgError] = useState(false);

  const uncountedPitches = session?.uncountedPitches ?? 0;
  const effectiveTotal = customTotal ?? (pitchesThrown + uncountedPitches);
  const effectiveStrikePercent =
    customStrikePercent ??
    (pitchesThrown > 0 ? Math.round((strikes / pitchesThrown) * 100) : 0);
  const effectiveGameMetrics =
    customGameMetrics ?? calculateGamePitchingMetrics(pitches);

  const isGame = event?.type === 'game';
  const eventDateStr = event?.scheduledAt
    ? new Date(event.scheduledAt).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  // Filtered pitches if filter applied
  const filteredPitches = useMemo(() => {
    if (outcomeFilter === 'all') return pitches;
    return pitches.filter((p) => p.outcome === outcomeFilter);
  }, [pitches, outcomeFilter]);

  const pitchesWithLocation = useMemo(() => {
    return filteredPitches.filter((p) => p.location !== null && p.location !== undefined);
  }, [filteredPitches]);

  const pitchesWithoutLocation = filteredPitches.length - pitchesWithLocation.length;

  // Compute 3x3 cell frequency and heat intensity
  const cellCounts = useMemo(() => {
    const counts = Array(9).fill(0);
    pitchesWithLocation.forEach((p) => {
      if (p.location?.region === 'strike_zone' && p.location.cellIndex) {
        const idx = p.location.cellIndex - 1;
        if (idx >= 0 && idx < 9) {
          counts[idx] += 1;
        }
      }
    });
    return counts;
  }, [pitchesWithLocation]);

  const maxCellCount = Math.max(1, ...cellCounts);

  // Advanced Pitching Analytics
  const analytics = useMemo<{
    strikeRate: number;
    zoneRate: number;
    fpsRate: number;
    whiffRate: number;
    pitchTypeCounts: Record<string, PitchTypeStat>;
  }>(() => {
    const total = pitches.length;
    if (total === 0) {
      return {
        strikeRate: 0,
        zoneRate: 0,
        fpsRate: 0,
        whiffRate: 0,
        pitchTypeCounts: {},
      };
    }

    const strikesCount = pitches.filter((p) => p.outcome !== 'ball').length;
    const inZone = pitches.filter((p) => p.location?.region === 'strike_zone').length;

    // First-pitch strikes: on 0-0 counts
    const firstPitches = pitches.filter((p) => p.ballsBefore === 0 && p.strikesBefore === 0);
    const fpsStrikes = firstPitches.filter((p) => p.outcome !== 'ball').length;
    const fpsRate = firstPitches.length > 0 ? Math.round((fpsStrikes / firstPitches.length) * 100) : 0;

    // Whiffs: swinging strikes / total swings
    const swingingStrikes = pitches.filter((p) => p.outcome === 'strike' && p.strikeDetail === 'swinging').length;
    const totalSwings = pitches.filter(
      (p) =>
        (p.outcome === 'strike' && p.strikeDetail === 'swinging') ||
        p.outcome === 'foul' ||
        p.outcome === 'in_play'
    ).length;
    const whiffRate = totalSwings > 0 ? Math.round((swingingStrikes / totalSwings) * 100) : 0;

    // Pitch Type Arsenal Breakdown with performance
    const pitchTypeCounts: Record<string, PitchTypeStat> = {};
    pitches.forEach((p) => {
      const type = p.pitchType || 'fastball';
      if (!pitchTypeCounts[type]) {
        pitchTypeCounts[type] = { total: 0, strikes: 0, swings: 0, whiffs: 0 };
      }
      pitchTypeCounts[type].total += 1;
      if (p.outcome !== 'ball') {
        pitchTypeCounts[type].strikes += 1;
      }
      const isSwing =
        (p.outcome === 'strike' && p.strikeDetail === 'swinging') ||
        p.outcome === 'foul' ||
        p.outcome === 'in_play';
      if (isSwing) {
        pitchTypeCounts[type].swings += 1;
      }
      if (p.outcome === 'strike' && p.strikeDetail === 'swinging') {
        pitchTypeCounts[type].whiffs += 1;
      }
    });

    return {
      strikeRate: Math.round((strikesCount / total) * 100),
      zoneRate: pitchesWithLocation.length > 0 ? Math.round((inZone / pitchesWithLocation.length) * 100) : 0,
      fpsRate,
      whiffRate,
      pitchTypeCounts,
    };
  }, [pitches, pitchesWithLocation.length]);

  // Pitch Smart Rest status
  const pitchSmartStatus = useMemo(() => {
    return calculatePitchSmartStatus(
      effectiveTotal,
      pitcher.seasonAge || 12,
      event?.scheduledAt,
      team?.pitchRulePresetId
    );
  }, [effectiveTotal, pitcher.seasonAge, event?.scheduledAt, team?.pitchRulePresetId]);

  const restDays = pitchSmartStatus.restDaysRequired;
  const maxDailyPitches = pitchSmartStatus.dailyMax;

  // SVG Size for the export card (fits comfortably in 2-column grid without expanding bounds)
  const svgSize = 300;
  const toSvgX = (normX: number) => ((normX + 1) / 2) * svgSize;
  const toSvgY = (normY: number) => ((normY + 1) / 2) * svgSize;

  const strikeLeft = toSvgX(-STRIKE_X);
  const strikeRight = toSvgX(STRIKE_X);
  const strikeTop = toSvgY(-STRIKE_Y);
  const strikeBottom = toSvgY(STRIKE_Y);
  const strikeWidth = strikeRight - strikeLeft;
  const strikeHeight = strikeBottom - strikeTop;

  const nearLeft = toSvgX(-NEAR_X);
  const nearTop = toSvgY(-NEAR_Y);
  const nearWidth = toSvgX(NEAR_X) - nearLeft;
  const nearHeight = toSvgY(NEAR_Y) - nearTop;

  const farLeft = toSvgX(-FAR_X);
  const farTop = toSvgY(-FAR_Y);
  const farWidth = toSvgX(FAR_X) - farLeft;
  const farHeight = toSvgY(FAR_Y) - farTop;

  const getMarkerColor = (p: Pitch) => {
    if (p.outcome === 'ball') return '#f59e0b'; // Amber
    if (p.outcome === 'strike') {
      return p.strikeDetail === 'swinging' ? '#06b6d4' : '#10b981'; // Cyan vs Emerald
    }
    if (p.outcome === 'foul') return '#8b5cf6'; // Violet
    if (p.outcome === 'in_play') return '#3b82f6'; // Blue
    return '#94a3b8';
  };

  return (
    <div
      ref={ref}
      id={`session-review-export-${pitcher.id}`}
      className="bg-white text-slate-900 w-[780px] max-w-[780px] p-8 rounded-2xl border border-slate-200 space-y-6 select-none font-sans shrink-0"
      style={{
        boxSizing: 'border-box',
        width: '780px',
        maxWidth: '780px',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          {team?.imageUrl && !teamImgError ? (
            <img
              src={team.imageUrl}
              alt={team.name}
              crossOrigin="anonymous"
              onError={() => setTeamImgError(true)}
              className="w-13 h-13 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0 bg-white"
            />
          ) : (
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-700/20 shrink-0">
              {team?.name ? team.name.substring(0, 2).toUpperCase() : '⚾'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-slate-900 whitespace-nowrap">
                {team?.name || 'Baseball Team'}
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide whitespace-nowrap shrink-0 inline-flex items-center">
                Scouting Review
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span>{isGame ? `Game vs ${event?.opponent || 'Opponent'}` : 'Bullpen Practice Session'}</span>
              <span>&bull;</span>
              <span>{eventDateStr}</span>
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 whitespace-nowrap">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            USA Baseball Pitch Smart
          </div>
          <div className="text-xs font-extrabold text-slate-700 mt-0.5 whitespace-nowrap">
            {restDays === 0 ? (
              <span className="text-emerald-600 font-bold">✓ 0 Days Rest Required</span>
            ) : (
              <span className="text-amber-600 font-bold">⚠ {restDays} {restDays === 1 ? 'Day' : 'Days'} Rest Required</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
            Limit: {maxDailyPitches} pitches/day
          </div>
        </div>
      </div>

      {/* 2. Pitcher Spotlight & Performance Summary Bar */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between gap-4">
        {/* Pitcher Info */}
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            {pitcher.imageUrl && !playerImgError ? (
              <img
                src={pitcher.imageUrl}
                alt={pitcher.name}
                crossOrigin="anonymous"
                onError={() => setPlayerImgError(true)}
                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-slate-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-sm border-2 border-white">
                #{pitcher.jerseyNumber}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full border-2 border-white shadow-xs">
              #{pitcher.jerseyNumber}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900">{pitcher.name}</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 uppercase">
                {pitcher.throws || 'R'}HP
              </span>
              {pitcher.seasonAge && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  {pitcher.seasonAge}U
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                {effectiveTotal} Total Pitches
              </span>
              {uncountedPitches > 0 && (
                <span>({pitchesThrown} charted + {uncountedPitches} bullpen)</span>
              )}
              <span>&bull;</span>
              <span>{effectiveStrikePercent}% Strike Rate</span>
            </p>
          </div>
        </div>

        {/* Count Pill Summary */}
        <div className="flex items-center gap-2.5 sm:gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-3xs text-xs shrink-0 whitespace-nowrap">
          <div className="text-center px-1 shrink-0">
            <div className="text-[9px] uppercase font-bold text-slate-400 whitespace-nowrap">Total</div>
            <div className="font-mono font-black text-base text-slate-900 whitespace-nowrap">{effectiveTotal}</div>
          </div>
          <div className="h-6 w-px bg-slate-200 shrink-0" />
          <div className="text-center px-1 shrink-0">
            <div className="text-[9px] uppercase font-bold text-emerald-600 whitespace-nowrap">Strikes</div>
            <div className="font-mono font-black text-base text-emerald-600 whitespace-nowrap">{strikes}</div>
          </div>
          <div className="h-6 w-px bg-slate-200 shrink-0" />
          <div className="text-center px-1 shrink-0">
            <div className="text-[9px] uppercase font-bold text-amber-600 whitespace-nowrap">Balls</div>
            <div className="font-mono font-black text-base text-amber-600 whitespace-nowrap">{balls}</div>
          </div>
          {isGame && (
            <>
              <div className="h-6 w-px bg-slate-200 shrink-0" />
              <div className="text-center px-1 shrink-0">
                <div className="text-[9px] uppercase font-bold text-cyan-600 whitespace-nowrap">IP</div>
                <div className="font-mono font-black text-base text-cyan-700 whitespace-nowrap">
                  {effectiveGameMetrics.inningsPitched}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200 shrink-0" />
              <div className="text-center px-1 shrink-0">
                <div className="text-[9px] uppercase font-bold text-slate-500 whitespace-nowrap">K / BB</div>
                <div className="font-mono font-black text-base text-slate-800 whitespace-nowrap">
                  {effectiveGameMetrics.strikeouts}&ndash;{effectiveGameMetrics.walks}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. Advanced Scouting Key Metric Tiles (4-up) */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Strike Rate
          </div>
          <div className="font-mono font-black text-2xl text-emerald-700 my-0.5">
            {analytics.strikeRate}%
          </div>
          <div className="text-[10px] text-slate-500">
            {pitches.filter((p) => p.outcome !== 'ball').length} of {pitches.length} pitches
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            First-Pitch Strike
          </div>
          <div className="font-mono font-black text-2xl text-slate-900 my-0.5">
            {analytics.fpsRate}%
          </div>
          <div className="text-[10px] text-slate-500">FPS% on 0-0 Count</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Zone Rate
          </div>
          <div className="font-mono font-black text-2xl text-emerald-700 my-0.5">
            {analytics.zoneRate}%
          </div>
          <div className="text-[10px] text-slate-500">In 3×3 Core Grid</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Whiff Rate
          </div>
          <div className="font-mono font-black text-2xl text-cyan-700 my-0.5">
            {analytics.whiffRate}%
          </div>
          <div className="text-[10px] text-slate-500">Misses per swing</div>
        </div>
      </div>

      {/* 4. Main Section: Visual Strike Zone & Arsenal Breakdown side-by-side or stacked */}
      <div className="grid grid-cols-12 gap-5 items-start">
        {/* Left: Strike Zone Visual & Heatmap */}
        <div className="col-span-6 flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-full flex items-center justify-between mb-2">
            <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              <span>Event Strike Zone</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-medium">
              Catcher's View
            </span>
          </div>

          <div
            className="relative rounded-2xl border border-slate-300 bg-slate-950 shadow-inner overflow-hidden"
            style={{ width: svgSize, height: svgSize }}
          >
            <svg
              viewBox={`0 0 ${svgSize} ${svgSize}`}
              className="w-full h-full select-none"
            >
              {/* Background Grid */}
              <rect width={svgSize} height={svgSize} fill="#090d16" />

              {/* Far Miss Zone */}
              <rect
                x={farLeft}
                y={farTop}
                width={farWidth}
                height={farHeight}
                rx="14"
                fill="rgba(30, 41, 59, 0.45)"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Near Miss Zone */}
              <rect
                x={nearLeft}
                y={nearTop}
                width={nearWidth}
                height={nearHeight}
                rx="10"
                fill="rgba(51, 65, 85, 0.5)"
                stroke="#64748b"
                strokeWidth="1.5"
              />

              {/* 3x3 Strike Zone Cells Heatmap Coloring */}
              {Array.from({ length: 9 }).map((_, idx) => {
                const row = Math.floor(idx / 3);
                const col = idx % 3;
                const cellW = strikeWidth / 3;
                const cellH = strikeHeight / 3;
                const x = strikeLeft + col * cellW;
                const y = strikeTop + row * cellH;
                const count = cellCounts[idx];
                const intensity = count / maxCellCount;

                return (
                  <g key={`cell-${idx}`}>
                    <rect
                      x={x}
                      y={y}
                      width={cellW}
                      height={cellH}
                      fill={
                        count > 0
                          ? `rgba(16, 185, 129, ${0.08 + intensity * 0.45})`
                          : 'rgba(16, 185, 129, 0.04)'
                      }
                      stroke="#10b981"
                      strokeWidth="0.5"
                    />
                    {count > 0 && (
                      <text
                        x={x + cellW / 2}
                        y={y + cellH / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#6ee7b7"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="ui-monospace, SFMono-Regular, monospace"
                        opacity={0.85}
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 3x3 Strike Zone Core Border */}
              <rect
                x={strikeLeft}
                y={strikeTop}
                width={strikeWidth}
                height={strikeHeight}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                rx="4"
              />

              {/* Dividing Lines */}
              <line
                x1={strikeLeft + strikeWidth / 3}
                y1={strikeTop}
                x2={strikeLeft + strikeWidth / 3}
                y2={strikeBottom}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <line
                x1={strikeLeft + (strikeWidth * 2) / 3}
                y1={strikeTop}
                x2={strikeLeft + (strikeWidth * 2) / 3}
                y2={strikeBottom}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <line
                x1={strikeLeft}
                y1={strikeTop + strikeHeight / 3}
                x2={strikeRight}
                y2={strikeTop + strikeHeight / 3}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <line
                x1={strikeLeft}
                y1={strikeTop + (strikeHeight * 2) / 3}
                x2={strikeRight}
                y2={strikeTop + (strikeHeight * 2) / 3}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />

              {/* Home Plate Outline (Bottom Perspective) */}
              <g opacity="0.65" transform={`translate(${svgSize / 2 - 20}, ${svgSize - 20}) scale(0.7)`}>
                <polygon
                  points="0,0 56,0 56,18 28,34 0,18"
                  fill="#e2e8f0"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
              </g>

              {/* Plotted Pitch Dots (Balls) */}
              {pitchesWithLocation.map((p, index) => {
                if (!p.location) return null;
                const px = toSvgX(p.location.x);
                const py = toSvgY(p.location.y);
                const markerColor = getMarkerColor(p);
                const pitchNum = p.pitchNumber ?? index + 1;

                return (
                  <g
                    key={p.id || index}
                    transform={`translate(${px}, ${py})`}
                  >
                    {/* Outer circle halo / ball matching breakdown */}
                    <circle
                      r="7"
                      fill={markerColor}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      opacity="0.95"
                    />
                    {/* Pitch sequence number inside dot */}
                    <text
                      y="0.5"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#000000"
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                    >
                      {pitchNum}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Outcome Color Legend */}
          <div className="w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10.5px] text-slate-600 mt-3 px-1 font-semibold">
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-white shrink-0" />
              <span className="whitespace-nowrap">Called Strike</span>
            </div>
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 ring-1 ring-white shrink-0" />
              <span className="whitespace-nowrap">Swinging</span>
            </div>
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-white shrink-0" />
              <span className="whitespace-nowrap">Ball</span>
            </div>
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 ring-1 ring-white shrink-0" />
              <span className="whitespace-nowrap">Foul</span>
            </div>
            <div className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-1 ring-white shrink-0" />
              <span className="whitespace-nowrap">In Play</span>
            </div>
          </div>

          {pitchesWithoutLocation > 0 && (
            <div className="text-[10px] text-slate-400 mt-2 text-center whitespace-nowrap">
              ({pitchesWithoutLocation} quick-logged pitch{pitchesWithoutLocation > 1 ? 'es' : ''} without coordinates)
            </div>
          )}
        </div>

        {/* Right: Arsenal Breakdown and Detailed Pitch Type Stats */}
        <div className="col-span-6 space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pitch Arsenal Breakdown</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-500">
                {Object.keys(analytics.pitchTypeCounts).length} Pitches in Mix
              </span>
            </div>

            {/* Arsenal Mix Cards */}
            <div className="space-y-2">
              {Object.keys(analytics.pitchTypeCounts).length === 0 ? (
                <div className="text-xs text-slate-400 italic py-2">No pitch types recorded</div>
              ) : (
                (Object.entries(analytics.pitchTypeCounts) as [string, PitchTypeStat][]).map(([type, stats]) => {
                  const cfg = PITCH_TYPES_CONFIG[type as keyof typeof PITCH_TYPES_CONFIG] || PITCH_TYPES_CONFIG.fastball;
                  const pct = pitches.length > 0 ? Math.round((stats.total / pitches.length) * 100) : 0;
                  const strikeRate = stats.total > 0 ? Math.round((stats.strikes / stats.total) * 100) : 0;
                  const whiffRate = stats.swings > 0 ? Math.round((stats.whiffs / stats.swings) * 100) : 0;

                  return (
                    <div
                      key={type}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-3xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${cfg.bgColor} border ${cfg.borderColor}`} />
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">{cfg.name}</span>
                          <span className="text-[10px] text-slate-500">
                            {stats.total} thrown ({pct}%)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-right">
                        <div className="text-center px-1">
                          <div className="text-[9px] uppercase font-bold text-slate-400">Strike %</div>
                          <div className="font-mono font-bold text-xs text-emerald-700">
                            {strikeRate}%
                          </div>
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="text-center px-1">
                          <div className="text-[9px] uppercase font-bold text-slate-400">Whiff %</div>
                          <div className="font-mono font-bold text-xs text-cyan-700">
                            {whiffRate}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Coaches' Notes (if enabled & available) */}
          {includeNotes && coachNotes.length > 0 && (
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/70 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                <span>📋 Coach Scouting Notes</span>
              </div>
              <div className="space-y-2">
                {coachNotes.map((n, i) => (
                  <div key={i} className="text-xs bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                    <span className="font-black text-slate-900 block text-[11px] mb-0.5">
                      {n.authorName}:
                    </span>
                    <p className="text-slate-700 leading-relaxed font-medium">
                      {n.noteText}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Footer */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span>Generated with Dugout Pitch Tracker</span>
        <span>USA Baseball Pitch Smart Certified</span>
        <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
});

SinglePlayerSessionExportCard.displayName = 'SinglePlayerSessionExportCard';
