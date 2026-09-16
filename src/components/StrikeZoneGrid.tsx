import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PitchLocation, ZoneRegion } from '../types';
import { RotateCcw } from 'lucide-react';

interface StrikeZoneGridProps {
  location: PitchLocation | null;
  onChange: (location: PitchLocation | null) => void;
  readOnly?: boolean;
  size?: number;
}

// Geometric boundaries in normalized [-1, 1] space
const STRIKE_X = 0.42;
const STRIKE_Y = 0.48;
const NEAR_X = 0.68;
const NEAR_Y = 0.72;
const FAR_X = 0.94;
const FAR_Y = 0.94;

export function classifyLocation(x: number, y: number): {
  region: ZoneRegion;
  cellIndex?: number;
  label: string;
} {
  const absX = Math.abs(x);
  const absY = Math.abs(y);

  if (absX <= STRIKE_X && absY <= STRIKE_Y) {
    // Determine 3x3 cell
    // Columns: left (-1 to -1/3), mid (-1/3 to 1/3), right (1/3 to 1) relative to STRIKE_X
    const normX = (x + STRIKE_X) / (2 * STRIKE_X); // 0 to 1
    const normY = (y + STRIKE_Y) / (2 * STRIKE_Y); // 0 to 1

    const col = Math.min(2, Math.max(0, Math.floor(normX * 3))); // 0, 1, 2
    const row = Math.min(2, Math.max(0, Math.floor(normY * 3))); // 0, 1, 2

    const cellIndex = row * 3 + col + 1; // 1 to 9
    const cellNames = [
      'Top Left (1)',
      'Top Middle (2)',
      'Top Right (3)',
      'Middle Left (4)',
      'Heart of Zone (5)',
      'Middle Right (6)',
      'Bottom Left (7)',
      'Bottom Middle (8)',
      'Bottom Right (9)',
    ];

    return {
      region: 'strike_zone',
      cellIndex,
      label: cellNames[cellIndex - 1],
    };
  }

  const vertical = y < -STRIKE_Y ? 'High' : y > STRIKE_Y ? 'Low' : 'Belt-High';
  const horizontal = x < -STRIKE_X ? 'Left (Inside/Out)' : x > STRIKE_X ? 'Right (Inside/Out)' : 'Middle';

  if (absX <= NEAR_X && absY <= NEAR_Y) {
    return {
      region: 'near_miss',
      label: `Near Miss: ${vertical} & ${horizontal}`,
    };
  }

  return {
    region: 'far_miss',
    label: `Far Miss: ${vertical} & ${horizontal}`,
  };
}

export const StrikeZoneGrid: React.FC<StrikeZoneGridProps> = ({
  location,
  onChange,
  readOnly = false,
  size = 320,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null); // SVG pixel coords
  const [currentLoc, setCurrentLoc] = useState<PitchLocation | null>(location);

  useEffect(() => {
    setCurrentLoc(location);
  }, [location]);

  // Transform normalized [-1, 1] to SVG coordinates [0, size]
  const toSvgX = useCallback((normX: number) => ((normX + 1) / 2) * size, [size]);
  const toSvgY = useCallback((normY: number) => ((normY + 1) / 2) * size, [size]);

  // Transform client pointer to normalized [-1, 1]
  const getNormalizedCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { normX: 0, normY: 0, pxX: 0, pxY: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const pxX = Math.max(0, Math.min(size, ((clientX - rect.left) / rect.width) * size));
      const pxY = Math.max(0, Math.min(size, ((clientY - rect.top) / rect.height) * size));

      const normX = Math.max(-1, Math.min(1, (pxX / size) * 2 - 1));
      const normY = Math.max(-1, Math.min(1, (pxY / size) * 2 - 1));

      return { normX, normY, pxX, pxY };
    },
    [size],
  );

  const updatePosition = useCallback(
    (clientX: number, clientY: number) => {
      const { normX, normY, pxX, pxY } = getNormalizedCoords(clientX, clientY);
      const classification = classifyLocation(normX, normY);
      const newLoc: PitchLocation = {
        x: Number(normX.toFixed(3)),
        y: Number(normY.toFixed(3)),
        region: classification.region,
        cellIndex: classification.cellIndex,
        label: classification.label,
      };
      setDragPos({ x: pxX, y: pxY });
      setCurrentLoc(newLoc);
      onChange(newLoc);
    },
    [getNormalizedCoords, onChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || readOnly) return;
    e.preventDefault();
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || readOnly) return;
    e.preventDefault();
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // Ignored if not captured
    }
    setIsDragging(false);
  };

  // Dimensions in SVG pixels
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

  // Active pin coordinates
  const activePinX = currentLoc ? toSvgX(currentLoc.x) : null;
  const activePinY = currentLoc ? toSvgY(currentLoc.y) : null;

  // Loupe position (offset ~85px above finger so finger doesn't block sight)
  const loupeSize = 110;
  const loupeScale = 2.4;
  const loupeVisible = isDragging && dragPos !== null;
  const loupeX = dragPos ? dragPos.x : 0;
  // If touch is too close to top, place loupe below instead
  const loupeY = dragPos ? (dragPos.y < 95 ? dragPos.y + 90 : dragPos.y - 85) : 0;

  return (
    <div id="strike-zone-wrapper" className="flex flex-col items-center select-none touch-none">
      {/* Visual Instruction & Current Location HUD */}
      <div className="w-full max-w-[340px] flex items-center justify-between mb-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800">
            {currentLoc ? currentLoc.label : 'Touch & drag to place pitch'}
          </span>
        </div>
        {currentLoc && !readOnly && (
          <button
            type="button"
            id="clear-location-btn"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentLoc(null);
              onChange(null);
            }}
            className="text-slate-400 hover:text-slate-700 active:text-rose-600 transition-colors p-1 flex items-center gap-1 text-xs"
            title="Clear location"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Main Interactive Stage */}
      <div
        ref={containerRef}
        id="strike-zone-container"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative rounded-xl border border-slate-200 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-inner overflow-hidden cursor-crosshair ${
          isDragging ? 'ring-2 ring-emerald-500' : ''
        }`}
        style={{ width: size, height: size }}
      >
        {/* SVG Grid */}
        <svg
          id="strike-zone-svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 pointer-events-none"
        >
          {/* Subtle Dirt & Catcher Turf Background grid */}
          <rect width={size} height={size} fill="#090d16" />

          {/* Far Miss Zone (Outer Ring) */}
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

          {/* Near Miss Zone (Middle Ring - One ball width off edge) */}
          <rect
            x={nearLeft}
            y={nearTop}
            width={nearWidth}
            height={nearHeight}
            rx="10"
            fill="rgba(51, 65, 85, 0.55)"
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* 3x3 Strike Zone Core Container */}
          <rect
            x={strikeLeft}
            y={strikeTop}
            width={strikeWidth}
            height={strikeHeight}
            fill="rgba(16, 185, 129, 0.12)"
            stroke="#10b981"
            strokeWidth="2.5"
            rx="4"
          />

          {/* 3x3 Internal Dividing Grid Lines */}
          {/* Vertical internal lines */}
          <line
            x1={strikeLeft + strikeWidth / 3}
            y1={strikeTop}
            x2={strikeLeft + strikeWidth / 3}
            y2={strikeBottom}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.75"
          />
          <line
            x1={strikeLeft + (strikeWidth * 2) / 3}
            y1={strikeTop}
            x2={strikeLeft + (strikeWidth * 2) / 3}
            y2={strikeBottom}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.75"
          />

          {/* Horizontal internal lines */}
          <line
            x1={strikeLeft}
            y1={strikeTop + strikeHeight / 3}
            x2={strikeRight}
            y2={strikeTop + strikeHeight / 3}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.75"
          />
          <line
            x1={strikeLeft}
            y1={strikeTop + (strikeHeight * 2) / 3}
            x2={strikeRight}
            y2={strikeTop + (strikeHeight * 2) / 3}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.75"
          />

          {/* Cell numbering subtle overlay */}
          {[
            { idx: 1, x: strikeLeft + strikeWidth * 0.16, y: strikeTop + strikeHeight * 0.22 },
            { idx: 2, x: strikeLeft + strikeWidth * 0.5, y: strikeTop + strikeHeight * 0.22 },
            { idx: 3, x: strikeLeft + strikeWidth * 0.84, y: strikeTop + strikeHeight * 0.22 },
            { idx: 4, x: strikeLeft + strikeWidth * 0.16, y: strikeTop + strikeHeight * 0.55 },
            { idx: 5, x: strikeLeft + strikeWidth * 0.5, y: strikeTop + strikeHeight * 0.55 },
            { idx: 6, x: strikeLeft + strikeWidth * 0.84, y: strikeTop + strikeHeight * 0.55 },
            { idx: 7, x: strikeLeft + strikeWidth * 0.16, y: strikeTop + strikeHeight * 0.88 },
            { idx: 8, x: strikeLeft + strikeWidth * 0.5, y: strikeTop + strikeHeight * 0.88 },
            { idx: 9, x: strikeLeft + strikeWidth * 0.84, y: strikeTop + strikeHeight * 0.88 },
          ].map((c) => (
            <text
              key={c.idx}
              x={c.x}
              y={c.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-bold fill-emerald-400/40 select-none pointer-events-none"
            >
              {c.idx}
            </text>
          ))}

          {/* Home Plate Outline (Bottom perspective) */}
          <g opacity="0.65" transform={`translate(${size / 2 - 20}, ${size - 22}) scale(0.7)`}>
            <polygon
              points="0,0 56,0 56,18 28,34 0,18"
              fill="#e2e8f0"
              stroke="#94a3b8"
              strokeWidth="2"
            />
          </g>

          {/* Zone Labels (Subtle) */}
          <text
            x={nearLeft + 8}
            y={nearTop + 14}
            className="text-[9px] font-semibold fill-slate-400/70 select-none uppercase tracking-wider"
          >
            Near Miss
          </text>
          <text
            x={farLeft + 8}
            y={farTop + 14}
            className="text-[9px] font-semibold fill-slate-500/60 select-none uppercase tracking-wider"
          >
            Far Miss
          </text>

          {/* Active Pitch Baseball Marker */}
          {activePinX !== null && activePinY !== null && (
            <g transform={`translate(${activePinX}, ${activePinY})`}>
              {/* Outer Glow Halo */}
              <circle
                r="18"
                fill="none"
                stroke={
                  currentLoc?.region === 'strike_zone'
                    ? '#10b981'
                    : currentLoc?.region === 'near_miss'
                      ? '#f59e0b'
                      : '#ef4444'
                }
                strokeWidth="2"
                opacity="0.8"
                className="animate-ping"
              />
              {/* Baseball Shadow */}
              <circle cx="2" cy="2" r="11" fill="rgba(0,0,0,0.5)" />
              {/* Baseball Body */}
              <circle cx="0" cy="0" r="10.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
              {/* Red Seams (curved lines) */}
              <path
                d="M -6.5 -7.5 C -3 -3, -3 3, -6.5 7.5"
                stroke="#dc2626"
                strokeWidth="1.2"
                strokeDasharray="1.5 1.5"
                fill="none"
              />
              <path
                d="M 6.5 -7.5 C 3 -3, 3 3, 6.5 7.5"
                stroke="#dc2626"
                strokeWidth="1.2"
                strokeDasharray="1.5 1.5"
                fill="none"
              />
            </g>
          )}
        </svg>

        {/* Floating Magnified Loupe Preview during Touch & Drag */}
        {loupeVisible && dragPos && (
          <div
            id="magnified-loupe"
            className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: Math.max(loupeSize / 2 + 6, Math.min(size - loupeSize / 2 - 6, loupeX)),
              top: Math.max(loupeSize / 2 + 6, Math.min(size - loupeSize / 2 - 6, loupeY)),
            }}
          >
            <div
              className="relative rounded-full border-4 border-emerald-400 bg-slate-900 shadow-2xl overflow-hidden ring-4 ring-black/40"
              style={{ width: loupeSize, height: loupeSize }}
            >
              {/* Scaled view centered on drag point */}
              <div
                className="absolute"
                style={{
                  width: size * loupeScale,
                  height: size * loupeScale,
                  left: loupeSize / 2 - dragPos.x * loupeScale,
                  top: loupeSize / 2 - dragPos.y * loupeScale,
                }}
              >
                <svg
                  width={size * loupeScale}
                  height={size * loupeScale}
                  viewBox={`0 0 ${size} ${size}`}
                >
                  <rect width={size} height={size} fill="#090d16" />
                  <rect
                    x={farLeft}
                    y={farTop}
                    width={farWidth}
                    height={farHeight}
                    rx="14"
                    fill="rgba(30, 41, 59, 0.45)"
                    stroke="#475569"
                    strokeWidth="1.5"
                  />
                  <rect
                    x={nearLeft}
                    y={nearTop}
                    width={nearWidth}
                    height={nearHeight}
                    rx="10"
                    fill="rgba(51, 65, 85, 0.55)"
                    stroke="#94a3b8"
                    strokeWidth="1.8"
                  />
                  <rect
                    x={strikeLeft}
                    y={strikeTop}
                    width={strikeWidth}
                    height={strikeHeight}
                    fill="rgba(16, 185, 129, 0.2)"
                    stroke="#34d399"
                    strokeWidth="3"
                    rx="4"
                  />
                  <line
                    x1={strikeLeft + strikeWidth / 3}
                    y1={strikeTop}
                    x2={strikeLeft + strikeWidth / 3}
                    y2={strikeBottom}
                    stroke="#34d399"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={strikeLeft + (strikeWidth * 2) / 3}
                    y1={strikeTop}
                    x2={strikeLeft + (strikeWidth * 2) / 3}
                    y2={strikeBottom}
                    stroke="#34d399"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={strikeLeft}
                    y1={strikeTop + strikeHeight / 3}
                    x2={strikeRight}
                    y2={strikeTop + strikeHeight / 3}
                    stroke="#34d399"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={strikeLeft}
                    y1={strikeTop + (strikeHeight * 2) / 3}
                    x2={strikeRight}
                    y2={strikeTop + (strikeHeight * 2) / 3}
                    stroke="#34d399"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>

              {/* Crosshair & Baseball in Loupe Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-8 h-8 rounded-full bg-white shadow-md border border-slate-300 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  <div className="absolute inset-0 rounded-full border border-red-500/60 border-dashed" />
                </div>
              </div>

              {/* Magnifier Badge */}
              <div className="absolute bottom-1 inset-x-0 flex justify-center">
                <span className="bg-black/80 text-emerald-300 font-mono text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm border border-emerald-500/40">
                  {currentLoc?.region === 'strike_zone'
                    ? `ZONE #${currentLoc.cellIndex}`
                    : currentLoc?.region === 'near_miss'
                      ? 'NEAR MISS'
                      : 'FAR MISS'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Helper Legend underneath */}
      <div className="w-full max-w-[340px] flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500" />
          <span>Strike Zone (3×3)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-700 border border-slate-500" />
          <span>Near Miss</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 border border-slate-700" />
          <span>Far Miss</span>
        </div>
      </div>
    </div>
  );
};

// Mini thumbnail renderer for pitch history & review
export const MiniStrikeZone: React.FC<{
  location?: PitchLocation | null;
  outcome?: string;
  size?: number;
}> = ({ location, outcome, size = 44 }) => {
  if (!location) {
    return (
      <div
        className="rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] text-slate-400 font-medium"
        style={{ width: size, height: size }}
      >
        No Loc
      </div>
    );
  }

  const toPxX = (normX: number) => ((normX + 1) / 2) * size;
  const toPxY = (normY: number) => ((normY + 1) / 2) * size;

  const sL = toPxX(-STRIKE_X);
  const sT = toPxY(-STRIKE_Y);
  const sW = toPxX(STRIKE_X) - sL;
  const sH = toPxY(STRIKE_Y) - sT;

  const pinX = toPxX(location.x);
  const pinY = toPxY(location.y);

  const isStrikeOutcome = outcome === 'strike' || outcome === 'foul' || outcome === 'in_play';

  return (
    <div
      className="relative rounded bg-slate-900 border border-slate-700 overflow-hidden shrink-0 shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Core strike zone outline */}
        <rect
          x={sL}
          y={sT}
          width={sW}
          height={sH}
          fill="rgba(16, 185, 129, 0.15)"
          stroke="#10b981"
          strokeWidth="1"
        />
        {/* Pitch dot */}
        <circle
          cx={pinX}
          cy={pinY}
          r={size > 60 ? 4 : 2.5}
          fill={isStrikeOutcome ? '#22c55e' : '#f59e0b'}
          stroke="#ffffff"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};
