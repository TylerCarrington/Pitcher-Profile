import React, { useMemo } from 'react';
import { Pitch, PitcherSession } from '../../../types';
import { TrendingUp } from 'lucide-react';
import { PitchSmartCard } from './PitchSmartCard';
import { PitchSmartStatus, CumulativePitchTotals } from '../../../utils/pitchSmart';
import { PlayerRestStatus } from '../../../types';
import { calculatePlayerOverviewStats } from '../utils/playerStatsUtils';

export interface PlayerStatsTabProps {
  pitches: Pitch[];
  sessions: PitcherSession[];
  pitchSmart: PitchSmartStatus;
  cumulativeTotals: CumulativePitchTotals;
  restStatus: PlayerRestStatus;
  seasonAge: number;
  teamName: string;
}

export const PlayerStatsTab: React.FC<PlayerStatsTabProps> = ({
  pitches,
  sessions,
  pitchSmart,
  cumulativeTotals,
  restStatus,
  seasonAge,
  teamName,
}) => {
  const stats = useMemo(() => calculatePlayerOverviewStats(pitches), [pitches]);

  return (
    <div className="space-y-6">
      {/* Pitch Smart Safety & Per-Team Rest Card */}
      <PitchSmartCard
        pitchSmart={pitchSmart}
        cumulativeTotals={cumulativeTotals}
        restStatus={restStatus}
        seasonAge={seasonAge}
        teamName={teamName}
      />

      {/* Core Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            Total Pitches
          </div>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.totalPitches}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{sessions.length} sessions</div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">
            Strike Rate
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-0.5">{stats.strikePercent}%</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">
            {stats.strikesCount} strikes / {stats.ballsCount} balls
          </div>
        </div>

        <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold uppercase text-sky-600 tracking-wider">
            First-Pitch Strike %
          </div>
          <div className="text-2xl font-black text-sky-700 mt-0.5">{stats.fpsPercent}%</div>
          <div className="text-[11px] text-sky-600/80 mt-0.5">{stats.firstPitchStrikes} on 0-0 counts</div>
        </div>

        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 text-center">
          <div className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">
            In-Play Outs
          </div>
          <div className="text-2xl font-black text-amber-700 mt-0.5">{stats.inPlayOuts}</div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">{stats.inPlayHits} hits allowed</div>
        </div>
      </div>

      {/* Arsenal & Pitch Distribution */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Pitch Type Arsenal &amp; Usage
          </h4>
        </div>

        {stats.arsenalStats.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
            No pitch data recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {stats.arsenalStats.map((item) => (
              <div
                key={item.type}
                className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-lg text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.abbr}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {item.count} thrown ({item.usagePercent}%)
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-800">{item.strikeRate}%</div>
                  <div className="text-[9px] text-slate-400 uppercase font-semibold">Strike %</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
