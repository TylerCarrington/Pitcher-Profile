import React, { useState, useMemo } from 'react';
import { Pitch, PitchOutcome, PitchType } from '../../../types';
import { PITCH_TYPES_CONFIG } from '../../../utils/pitchSmart';
import { Filter, Layers, Target, Eye, Sparkles } from 'lucide-react';

interface StrikeZoneHeatmapProps {
  pitches: Pitch[];
  pitcherName?: string;
  size?: number;
  showFilters?: boolean;
}

// Geometric boundaries in normalized [-1, 1] space matching StrikeZoneGrid
const STRIKE_X = 0.42;
const STRIKE_Y = 0.48;
const NEAR_X = 0.68;
const NEAR_Y = 0.72;
const FAR_X = 0.94;
const FAR_Y = 0.94;

export const StrikeZoneHeatmap: React.FC<StrikeZoneHeatmapProps> = ({
  pitches,
  pitcherName = 'Pitcher',
  size = 320,
  showFilters = true,
}) => {
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'strike' | 'ball' | 'in_play' | 'foul'>('all');
  const [pitchTypeFilter, setPitchTypeFilter] = useState<string>('all');
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [showDensityGrid, setShowDensityGrid] = useState(true);

  // Coordinate transform helpers
  const toSvgX = (normX: number) => ((normX + 1) / 2) * size;
  const toSvgY = (normY: number) => ((normY + 1) / 2) * size;

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

  // Filtered pitches
  const filteredPitches = useMemo(() => {
    return pitches.filter((p) => {
      // Outcome filter
      if (outcomeFilter === 'strike' && p.outcome !== 'strike') return false;
      if (outcomeFilter === 'ball' && p.outcome !== 'ball') return false;
      if (outcomeFilter === 'in_play' && p.outcome !== 'in_play') return false;
      if (outcomeFilter === 'foul' && p.outcome !== 'foul') return false;

      // Pitch Type filter
      if (pitchTypeFilter !== 'all' && (p.pitchType || 'fastball') !== pitchTypeFilter) {
        return false;
      }

      return true;
    });
  }, [pitches, outcomeFilter, pitchTypeFilter]);

  const pitchesWithLocation = filteredPitches.filter((p) => p.location !== null && p.location !== undefined);
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
  const analytics = useMemo(() => {
    const total = pitches.length;
    if (total === 0) {
      return {
        strikeRate: 0,
        zoneRate: 0,
        fpsRate: 0,
        whiffRate: 0,
        pitchTypeCounts: {} as Record<string, number>,
      };
    }

    const strikes = pitches.filter((p) => p.outcome !== 'ball').length;
    const inZone = pitches.filter((p) => p.location?.region === 'strike_zone').length;

    // First-pitch strike: pitch thrown when count was 0-0
    const firstPitches = pitches.filter((p) => p.ballsBefore === 0 && p.strikesBefore === 0);
    const fpsStrikes = firstPitches.filter((p) => p.outcome !== 'ball').length;
    const fpsRate = firstPitches.length > 0 ? Math.round((fpsStrikes / firstPitches.length) * 100) : 0;

    // Whiffs: swinging strikes / total swings (swinging strike + foul + in-play)
    const swingingStrikes = pitches.filter((p) => p.outcome === 'strike' && p.strikeDetail === 'swinging').length;
    const totalSwings = pitches.filter(
      (p) =>
        (p.outcome === 'strike' && p.strikeDetail === 'swinging') ||
        p.outcome === 'foul' ||
        p.outcome === 'in_play',
    ).length;
    const whiffRate = totalSwings > 0 ? Math.round((swingingStrikes / totalSwings) * 100) : 0;

    // Pitch types count
    const pitchTypeCounts: Record<string, number> = {};
    pitches.forEach((p) => {
      const type = p.pitchType || 'fastball';
      pitchTypeCounts[type] = (pitchTypeCounts[type] || 0) + 1;
    });

    return {
      strikeRate: Math.round((strikes / total) * 100),
      zoneRate: pitchesWithLocation.length > 0 ? Math.round((inZone / pitchesWithLocation.length) * 100) : 0,
      fpsRate,
      whiffRate,
      pitchTypeCounts,
    };
  }, [pitches, pitchesWithLocation.length]);

  const getMarkerFill = (p: Pitch) => {
    if (p.outcome === 'ball') return '#f59e0b'; // Amber
    if (p.outcome === 'strike') {
      return p.strikeDetail === 'swinging' ? '#06b6d4' : '#10b981'; // Cyan vs Emerald
    }
    if (p.outcome === 'foul') return '#8b5cf6'; // Violet
    if (p.outcome === 'in_play') return '#3b82f6'; // Blue
    return '#94a3b8';
  };

  return (
    <div id="strike-zone-heatmap" className="space-y-4">
      {/* 1. Advanced Scouting Key Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Strike Rate
          </div>
          <div className="font-mono font-black text-lg sm:text-xl text-emerald-700">
            {analytics.strikeRate}%
          </div>
          <div className="text-[10px] text-slate-500">
            {pitches.filter((p) => p.outcome !== 'ball').length} of {pitches.length}
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            First-Pitch Strike
          </div>
          <div className="font-mono font-black text-lg sm:text-xl text-slate-900">
            {analytics.fpsRate}%
          </div>
          <div className="text-[10px] text-slate-500">FPS% on 0-0 Count</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Zone Rate
          </div>
          <div className="font-mono font-black text-lg sm:text-xl text-emerald-700">
            {analytics.zoneRate}%
          </div>
          <div className="text-[10px] text-slate-500">In 3×3 Core Grid</div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Whiff Rate
          </div>
          <div className="font-mono font-black text-lg sm:text-xl text-cyan-700">
            {analytics.whiffRate}%
          </div>
          <div className="text-[10px] text-slate-500">Misses per swing</div>
        </div>
      </div>

      {/* 2. Heatmap Controls & Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Result:
            </span>
            {(['all', 'strike', 'ball', 'in_play', 'foul'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setOutcomeFilter(opt)}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold capitalize transition ${
                  outcomeFilter === opt
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {opt === 'in_play' ? 'In Play' : opt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDensityGrid(!showDensityGrid)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition ${
                showDensityGrid
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showDensityGrid ? 'Hide Density' : 'Show Density'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Stage: Heatmap SVG Display */}
      <div className="flex flex-col items-center">
        <div
          id="strike-zone-heatmap-container"
          className="relative rounded-2xl border border-slate-300 bg-slate-950 shadow-inner overflow-hidden"
          style={{ width: size, height: size }}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="select-none"
          >
            {/* Background Grid */}
            <rect width={size} height={size} fill="#090d16" />

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
            {showDensityGrid &&
              [0, 1, 2].map((row) =>
                [0, 1, 2].map((col) => {
                  const cellIdx = row * 3 + col;
                  const count = cellCounts[cellIdx];
                  const intensity = count / maxCellCount;
                  const cX = strikeLeft + (strikeWidth / 3) * col;
                  const cY = strikeTop + (strikeHeight / 3) * row;
                  const cW = strikeWidth / 3;
                  const cH = strikeHeight / 3;

                  return (
                    <g key={`cell-${cellIdx}`}>
                      <rect
                        x={cX}
                        y={cY}
                        width={cW}
                        height={cH}
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
                          x={cX + cW / 2}
                          y={cY + cH / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[11px] font-mono font-bold fill-emerald-300 pointer-events-none opacity-80"
                        >
                          {count}
                        </text>
                      )}
                    </g>
                  );
                }),
              )}

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
            <g opacity="0.65" transform={`translate(${size / 2 - 20}, ${size - 20}) scale(0.7)`}>
              <polygon
                points="0,0 56,0 56,18 28,34 0,18"
                fill="#e2e8f0"
                stroke="#94a3b8"
                strokeWidth="2"
              />
            </g>

            {/* Plotted Pitch Dots */}
            {pitchesWithLocation.map((p) => {
              if (!p.location) return null;
              const pX = toSvgX(p.location.x);
              const pY = toSvgY(p.location.y);
              const isSelected = selectedPitch?.id === p.id;
              const markerColor = getMarkerFill(p);

              return (
                <g
                  key={p.id}
                  onClick={() => setSelectedPitch(isSelected ? null : p)}
                  className="cursor-pointer transition-transform hover:scale-125"
                  transform={`translate(${pX}, ${pY})`}
                >
                  {isSelected && (
                    <circle
                      r="12"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="animate-pulse"
                    />
                  )}
                  {/* Outer circle halo */}
                  <circle
                    r={isSelected ? 8 : 6.5}
                    fill={markerColor}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 2 : 1.5}
                    opacity="0.95"
                  />
                  {/* Pitch number inside dot if big enough */}
                  <text
                    y="0.5"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[7.5px] font-mono font-bold fill-black pointer-events-none select-none"
                  >
                    {p.pitchNumber}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Selected Pitch Info Callout Floating Card */}
          {selectedPitch && (
            <div
              id="selected-pitch-tooltip"
              className="absolute bottom-2 inset-x-2 bg-slate-900/95 backdrop-blur-sm p-2.5 rounded-xl border border-slate-700 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                    #{selectedPitch.pitchNumber}
                  </span>
                  <span className="capitalize text-emerald-400">
                    {selectedPitch.outcome === 'strike'
                      ? selectedPitch.strikeDetail
                        ? `${selectedPitch.strikeDetail} Strike`
                        : 'Strike'
                      : selectedPitch.outcome === 'in_play'
                      ? selectedPitch.inPlayDetail
                        ? `In Play (${selectedPitch.inPlayDetail})`
                        : 'In Play'
                      : selectedPitch.outcome}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Count: {selectedPitch.ballsBefore}-{selectedPitch.strikesBefore}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center justify-between">
                <span>
                  {PITCH_TYPES_CONFIG[selectedPitch.pitchType || 'fastball']?.name || 'Fastball'} &bull;{' '}
                  {selectedPitch.location?.label || 'Placed pitch'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPitch(null)}
                  className="text-slate-400 hover:text-white text-[10px] underline ml-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="w-full max-w-[340px] flex flex-wrap items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Called Strike</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>Swinging</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Ball</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            <span>Foul</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>In Play</span>
          </div>
        </div>

        {pitchesWithoutLocation > 0 && (
          <div className="text-[11px] text-slate-400 mt-1 text-center">
            Note: {pitchesWithoutLocation} pitch{pitchesWithoutLocation > 1 ? 'es' : ''} logged
            without strike zone coordinates.
          </div>
        )}
      </div>

      {/* 4. Pitch Type Breakdown Pill Cloud */}
      {Object.keys(analytics.pitchTypeCounts).length > 0 && (
        <div className="pt-2 border-t border-slate-200">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Pitch Type Arsenal Breakdown
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(analytics.pitchTypeCounts).map(([type, count]) => {
              const cfg = PITCH_TYPES_CONFIG[type as PitchType] || PITCH_TYPES_CONFIG.fastball;
              const countNum = typeof count === 'number' ? count : Number(count) || 0;
              const pct = pitches.length > 0 ? Math.round((countNum / pitches.length) * 100) : 0;
              const isSelected = pitchTypeFilter === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPitchTypeFilter(isSelected ? 'all' : type)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : `${cfg.bgColor} ${cfg.color} ${cfg.borderColor} hover:opacity-90`
                  }`}
                >
                  <span className="font-bold">{cfg.name}</span>
                  <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-white/70 text-slate-900 font-black">
                    {count} ({pct}%)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
