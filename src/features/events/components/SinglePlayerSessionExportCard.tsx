import React, { useMemo, forwardRef } from 'react';
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

  // SVG Size for the export card
  const svgSize = 340;
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
      className="bg-white text-slate-900 w-[780px] p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6 select-none font-sans"
      style={{
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-700/20">
            ⚾
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                {team?.name || 'Baseball Team'}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                Scouting Review
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
              <span>{isGame ? `Game vs ${event?.opponent || 'Opponent'}` : 'Bullpen Practice Session'}</span>
              <span>&bull;</span>
              <span>{eventDateStr}</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            USA Baseball Pitch Smart
          </div>
          <div className="text-xs font-extrabold text-slate-700 mt-0.5">
            {restDays === 0 ? (
              <span className="text-emerald-600 font-bold">✓ 0 Days Rest Required</span>
            ) : (
              <span className="text-amber-600 font-bold">⚠ {restDays} {restDays === 1 ? 'Day' : 'Days'} Rest Required</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Limit: {maxDailyPitches} pitches/day
          </div>
        </div>
      </div>

      {/* 2. Pitcher Spotlight & Performance Summary Bar */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between gap-4">
        {/* Pitcher Info */}
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-sm border-2 border-white">
            #{pitcher.jerseyNumber}
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
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-3xs text-xs">
          <div className="text-center px-1">
            <div className="text-[9px] uppercase font-bold text-slate-400">Total</div>
            <div className="font-mono font-black text-base text-slate-900">{effectiveTotal}</div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-center px-1">
            <div className="text-[9px] uppercase font-bold text-emerald-600">Strikes</div>
            <div className="font-mono font-black text-base text-emerald-600">{strikes}</div>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-center px-1">
            <div className="text-[9px] uppercase font-bold text-amber-600">Balls</div>
            <div className="font-mono font-black text-base text-amber-600">{balls}</div>
          </div>
          {isGame && (
            <>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center px-1">
                <div className="text-[9px] uppercase font-bold text-cyan-600">IP</div>
                <div className="font-mono font-black text-base text-cyan-700">
                  {effectiveGameMetrics.inningsPitched}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center px-1">
                <div className="text-[9px] uppercase font-bold text-slate-500">K / BB</div>
                <div className="font-mono font-black text-base text-slate-800">
                  {effectiveGameMetrics.strikeouts}-{effectiveGameMetrics.walks}
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
            className="relative rounded-xl border border-slate-300 bg-slate-950 shadow-inner overflow-hidden"
            style={{ width: svgSize, height: svgSize }}
          >
            <svg
              viewBox={`0 0 ${svgSize} ${svgSize}`}
              className="w-full h-full"
            >
              {/* Batter Silhouette Background Accent */}
              <text
                x={svgSize * 0.08}
                y={svgSize * 0.5}
                fill="#334155"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                RHB
              </text>
              <text
                x={svgSize * 0.92}
                y={svgSize * 0.5}
                fill="#334155"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                LHB
              </text>

              {/* Far Ball Zone Boundary */}
              <rect
                x={farLeft}
                y={farTop}
                width={farWidth}
                height={farHeight}
                fill="#0f172a"
                stroke="#1e293b"
                strokeWidth="1.5"
                rx="6"
              />

              {/* Near Chase Zone Boundary */}
              <rect
                x={nearLeft}
                y={nearTop}
                width={nearWidth}
                height={nearHeight}
                fill="#1e293b"
                fillOpacity="0.4"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                rx="4"
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

                let cellColor = '#0f172a';
                if (count > 0) {
                  const r = Math.round(16 + intensity * 220);
                  const g = Math.round(185 - intensity * 100);
                  const b = Math.round(129 - intensity * 80);
                  cellColor = `rgb(${r}, ${g}, ${b})`;
                }

                return (
                  <g key={`cell-${idx}`}>
                    <rect
                      x={x}
                      y={y}
                      width={cellW}
                      height={cellH}
                      fill={cellColor}
                      fillOpacity={count > 0 ? 0.35 + intensity * 0.55 : 0.2}
                      stroke="#475569"
                      strokeWidth="1"
                    />
                    {count > 0 && (
                      <text
                        x={x + cellW / 2}
                        y={y + cellH / 2 + 4}
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                        textAnchor="middle"
                        opacity={0.85}
                      >
                        {count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 3x3 Strike Zone Core Solid Border */}
              <rect
                x={strikeLeft}
                y={strikeTop}
                width={strikeWidth}
                height={strikeHeight}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.5"
                rx="2"
              />

              {/* Home Plate at Bottom Center */}
              <polygon
                points={`
                  ${svgSize / 2 - 24},${strikeBottom + 18}
                  ${svgSize / 2 + 24},${strikeBottom + 18}
                  ${svgSize / 2 + 24},${strikeBottom + 28}
                  ${svgSize / 2},${strikeBottom + 38}
                  ${svgSize / 2 - 24},${strikeBottom + 28}
                `}
                fill="#f8fafc"
                stroke="#94a3b8"
                strokeWidth="1.5"
                opacity="0.8"
              />

              {/* Pitch Location Scatter Points */}
              {pitchesWithLocation.map((p, index) => {
                if (!p.location) return null;
                const px = toSvgX(p.location.x);
                const py = toSvgY(p.location.y);
                const fill = getMarkerColor(p);
                const isSwinging = p.outcome === 'strike' && p.strikeDetail === 'swinging';

                return (
                  <g key={p.id || index}>
                    {/* Glowing ring */}
                    <circle
                      cx={px}
                      cy={py}
                      r="7.5"
                      fill={fill}
                      fillOpacity="0.3"
                    />
                    {/* Main Dot */}
                    <circle
                      cx={px}
                      cy={py}
                      r="4.5"
                      fill={fill}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                    />
                    {isSwinging && (
                      <circle
                        cx={px}
                        cy={py}
                        r="6.5"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Outcome Color Legend */}
          <div className="w-full flex flex-wrap items-center justify-between text-[10px] text-slate-600 mt-3 px-1 font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-white" />
              <span>Called Strike</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 ring-1 ring-white" />
              <span>Swinging</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-1 ring-white" />
              <span>Ball</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 ring-1 ring-white" />
              <span>Foul</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-1 ring-white" />
              <span>In Play</span>
            </div>
          </div>

          {pitchesWithoutLocation > 0 && (
            <div className="text-[10px] text-slate-400 mt-1.5 text-center">
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
