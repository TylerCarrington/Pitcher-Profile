import React, { useState, useMemo } from 'react';
import { Pitch, Player, BaseballEvent } from '../../../types';
import { StrikeZoneHeatmap } from '../../pitches/components/StrikeZoneHeatmap';
import { Filter } from 'lucide-react';

export interface PlayerHeatmapTabProps {
  player: Player;
  pitches: Pitch[];
  sessionEventMap: Map<string, BaseballEvent>;
}

export const PlayerHeatmapTab: React.FC<PlayerHeatmapTabProps> = ({
  player,
  pitches,
  sessionEventMap,
}) => {
  const [filterEventType, setFilterEventType] = useState<'all' | 'game' | 'bullpen'>('all');

  const filteredPitches = useMemo(() => {
    if (filterEventType === 'all') return pitches;
    return pitches.filter((p) => {
      const ev = sessionEventMap.get(p.eventId);
      return ev?.type === filterEventType;
    });
  }, [pitches, filterEventType, sessionEventMap]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div>
          <h4 className="font-bold text-sm text-slate-900">Career / Season Breakdown</h4>
          <p className="text-xs text-slate-500">
            Filtered across {filteredPitches.length} pitches
          </p>
        </div>

        {/* Filter by Event Type */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setFilterEventType('all')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              filterEventType === 'all'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Events
          </button>
          <button
            type="button"
            onClick={() => setFilterEventType('game')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              filterEventType === 'game'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Games Only
          </button>
          <button
            type="button"
            onClick={() => setFilterEventType('bullpen')}
            className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
              filterEventType === 'bullpen'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Bullpens Only
          </button>
        </div>
      </div>

      <StrikeZoneHeatmap
        pitches={filteredPitches}
        title={`${player.name} (#${player.jerseyNumber}) Full Season Heatmap`}
      />
    </div>
  );
};
