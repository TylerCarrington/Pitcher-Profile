import React, { useState, useMemo } from 'react';
import { Player, Team } from '../../../types';
import {
  getPitchesForPlayer,
  getAllSessions,
  getEventsForTeam,
  getAllCoaches,
} from '../../../storage';
import {
  calculatePitchSmartStatus,
  calculatePlayerRestEligibility,
  calculateCumulativePitchTotals,
} from '../../../utils/pitchSmart';
import { PitchSmartBadge } from './PitchSmartBadge';
import { PlayerStatsTab } from './PlayerStatsTab';
import { PlayerHeatmapTab } from './PlayerHeatmapTab';
import { PlayerHistoryTab } from './PlayerHistoryTab';
import { PlayerPhotoModal } from './PlayerPhotoModal';
import {
  X,
  Target,
  Calendar,
  Activity,
  Camera,
} from 'lucide-react';

interface PitcherProfileModalProps {
  isOpen?: boolean;
  player: Player;
  team: Team;
  onClose: () => void;
  onEditPlayer?: (player: Player) => void;
}

export const PitcherProfileModal: React.FC<PitcherProfileModalProps> = ({
  player: initialPlayer,
  team,
  onClose,
  onEditPlayer,
}) => {
  const [player, setPlayer] = useState<Player>(initialPlayer);
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'sessions'>('overview');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Load all pitcher data
  const pitches = useMemo(() => getPitchesForPlayer(player.id), [player.id]);
  const sessions = useMemo(
    () => getAllSessions().filter((s) => s.pitcherId === player.id),
    [player.id],
  );
  const teamEvents = useMemo(() => getEventsForTeam(team.id), [team.id]);
  const coaches = useMemo(() => getAllCoaches(), []);

  // Map session to event
  const sessionEventMap = useMemo(() => {
    const map = new Map();
    teamEvents.forEach((ev) => {
      map.set(ev.id, ev);
    });
    return map;
  }, [teamEvents]);

  // Pitch Smart calculations
  const seasonAge = player.seasonAge || 11;
  const cumulativeTotals = useMemo(
    () =>
      calculateCumulativePitchTotals({
        playerId: player.id,
        teamId: team.id,
        events: teamEvents,
        sessions,
        pitches,
      }),
    [player.id, team.id, teamEvents, sessions, pitches],
  );

  const pitchSmart = useMemo(
    () =>
      calculatePitchSmartStatus(
        cumulativeTotals.todayPitches,
        seasonAge,
        undefined,
        team.pitchRulePresetId || 'usa_pitch_smart',
        cumulativeTotals,
      ),
    [cumulativeTotals, seasonAge, team.pitchRulePresetId],
  );

  // Per-Team Rest Day Eligibility
  const restStatus = useMemo(
    () =>
      calculatePlayerRestEligibility({
        player,
        teamId: team.id,
        teamPresetId: team.pitchRulePresetId || 'usa_pitch_smart',
        events: teamEvents,
        sessions,
        pitches,
      }),
    [player, team.id, team.pitchRulePresetId, teamEvents, sessions, pitches],
  );

  return (
    <div
      id="pitcher-profile-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="pitcher-profile-modal-content"
        className="bg-white rounded-2xl max-w-2xl w-full my-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group/avatar shrink-0">
                {player.imageUrl ? (
                  <img
                    src={player.imageUrl}
                    alt={player.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center font-black text-emerald-400 text-2xl">
                    #{player.jerseyNumber}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 font-black text-xs px-1.5 py-0.5 rounded-full border border-slate-900">
                  #{player.jerseyNumber}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  title="Upload / Change player photo"
                  className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition text-white cursor-pointer"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">{player.name}</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                    {player.throws || 'R'}HP
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>{team.name}</span>
                  <span>&bull;</span>
                  <span className="text-emerald-400 font-semibold">{seasonAge}U Season Age</span>
                  <span>&bull;</span>
                  <button
                    type="button"
                    onClick={() => setShowPhotoModal(true)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                  >
                    {player.imageUrl ? 'Change Photo' : 'Add Photo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Pitch Smart Badge */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
              <PitchSmartBadge
                pitchCount={pitchSmart.pitchCount}
                seasonAge={seasonAge}
                showDetails
              />
              <span className="text-[11px] text-slate-400">
                Daily Max: {pitchSmart.dailyMax} pitches
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview &amp; Metrics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'heatmap'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Strike Zone Breakdown</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sessions'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Sessions Log ({sessions.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'overview' && (
            <PlayerStatsTab
              pitches={pitches}
              sessions={sessions}
              pitchSmart={pitchSmart}
              cumulativeTotals={cumulativeTotals}
              restStatus={restStatus}
              seasonAge={seasonAge}
              teamName={team.name}
            />
          )}

          {activeTab === 'heatmap' && (
            <PlayerHeatmapTab
              player={player}
              pitches={pitches}
              sessionEventMap={sessionEventMap}
            />
          )}

          {activeTab === 'sessions' && (
            <PlayerHistoryTab
              player={player}
              sessions={sessions}
              pitches={pitches}
              sessionEventMap={sessionEventMap}
              coaches={coaches}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Player ID: <span className="font-mono">{player.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>Update Photo</span>
            </button>
            {onEditPlayer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPlayer(player);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              >
                Edit Player Info
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Quick Photo Upload Modal */}
      <PlayerPhotoModal
        isOpen={showPhotoModal}
        player={player}
        onClose={() => setShowPhotoModal(false)}
        onPlayerUpdated={(updated) => setPlayer(updated)}
      />
    </div>
  );
};
