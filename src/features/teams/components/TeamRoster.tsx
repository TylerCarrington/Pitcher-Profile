
import React from 'react';
import { Camera, Shield, Users, Copy, Check, UserPlus, Trash2, Edit2, CheckCircle2, Clock, BarChart3, AlertTriangle } from 'lucide-react';
import { Team, Player, Coach } from '../../../types';
import { getPitchRulePreset } from '../../../utils/pitchSmart';

interface TeamRosterProps {
  selectedTeam: Team;
  currentCoach: Coach;
  players: Player[];
  teamCoaches: Coach[];
  copiedState: { id: string; type: 'code' | 'link' } | null;
  playerRestStatusMap: Map<string, any>;
  onOpenEditTeam: () => void;
  onShowPreset: () => void;
  onShowCoaches: () => void;
  onCopyInviteCode: (code: string, teamId: string) => void;
  onOpenAddPlayer: () => void;
  onSelectPitcherProfile: (player: Player) => void;
  onConfirmDeletePlayer: (player: Player) => void;
  onOpenEditPlayer: (player: Player) => void;
  onShowDeleteTeam: () => void;
}

export const TeamRoster: React.FC<TeamRosterProps> = ({
  selectedTeam,
  currentCoach,
  players,
  teamCoaches,
  copiedState,
  playerRestStatusMap,
  onOpenEditTeam,
  onShowPreset,
  onShowCoaches,
  onCopyInviteCode,
  onOpenAddPlayer,
  onSelectPitcherProfile,
  onConfirmDeletePlayer,
  onOpenEditPlayer,
  onShowDeleteTeam
}) => {
  const isSelectedTeamCreator = selectedTeam.createdBy === currentCoach.id;
  const currentPreset = getPitchRulePreset(selectedTeam.pitchRulePresetId);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
        <div id="roster-management-section" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {/* Team Photo / Logo Banner Avatar */}
                  <div className="relative group/logo shrink-0">
                    {selectedTeam.imageUrl ? (
                      <img
                        src={selectedTeam.imageUrl}
                        alt={selectedTeam.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-xs"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-base flex items-center justify-center shadow-xs">
                        {selectedTeam.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    {isSelectedTeamCreator && (
                      <button
                        type="button"
                        onClick={onOpenEditTeam}
                        title="Change team logo / photo"
                        className="absolute -bottom-1 -right-1 bg-slate-900 hover:bg-emerald-600 text-white p-1 rounded-full shadow-md transition"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    )}
                  </div>
    
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {selectedTeam.name} Roster
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        {players.length} Players
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Players can be selected as pitchers during live game and bullpen sessions.
                    </p>
                  </div>
                </div>
    
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    id="open-pitch-rules-btn"
                    onClick={() => onShowPreset()}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition flex items-center gap-1.5"
                    title="Configure Pitch Limit & Rest Rules"
                  >
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pitch Rules: <strong>{currentPreset.shortName}</strong></span>
                  </button>
    
                  <button
                    type="button"
                    id="open-team-coaches-btn"
                    onClick={() => onShowCoaches()}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1.5"
                    title="Manage coaches and invite links"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Coaches ({teamCoaches.length || 1})</span>
                  </button>
    
                  <button
                    type="button"
                    id="quick-copy-code-btn"
                    onClick={() => onCopyInviteCode(selectedTeam.inviteCode, selectedTeam.id)}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition flex items-center gap-1.5"
                    title="Copy team invite code to clipboard"
                  >
                    {copiedState?.id === selectedTeam.id && copiedState?.type === 'code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-emerald-700">Code Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Code: <strong className="font-mono">{selectedTeam.inviteCode}</strong></span>
                      </>
                    )}
                  </button>
    
                  <button
                    type="button"
                    id="add-player-btn"
                    onClick={onOpenAddPlayer}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add Pitcher / Player</span>
                  </button>
    
                  {/* Edit and Delete team buttons */}
                  <button
                    type="button"
                    onClick={onOpenEditTeam}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                    title="Edit Team"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="hidden sm:inline">Edit Team</span>
                  </button>
                  <button
                    type="button"
                    id="delete-team-btn"
                    onClick={() => onShowDeleteTeam()}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                    title="Delete Team"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span className="hidden sm:inline">Delete Team</span>
                  </button>
                </div>
              </div>
    
              {/* Player Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {players.length === 0 ? (
                  <div className="col-span-full py-10 px-4 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">No players on this roster yet</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Add pitchers and players to manage rest eligibility, scouting reports, and pitch logs.</p>
                    </div>
                    <button
                      type="button"
                      id="empty-add-player-btn"
                      onClick={onOpenAddPlayer}
                      className="mt-1 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                      <span>Add Pitcher / Player</span>
                    </button>
                  </div>
                ) : (
                  players.map((p) => {
                    const rest = playerRestStatusMap.get(p.id);
    
                    return (
                      <div
                        key={p.id}
                        id={`roster-player-${p.id}`}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between gap-3 shadow-2xs group"
                      >
                        <div
                          onClick={() => onSelectPitcherProfile(p)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                        >
                          <div className="relative">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-600 text-sm shrink-0 group-hover:border-emerald-400 transition">
                                #{p.jerseyNumber}
                              </div>
                            )}
                            <span className="absolute -bottom-1 -right-1 bg-slate-900 text-emerald-400 font-mono font-bold text-[9px] px-1 rounded-full border border-white">
                              #{p.jerseyNumber}
                            </span>
                          </div>
    
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-slate-900 truncate group-hover:text-emerald-700 transition">
                              {p.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                              <span>{p.throws || 'R'}HP</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 font-semibold text-[10px] border border-emerald-200">
                                {p.seasonAge ?? 11}U
                              </span>
                            </p>
                          </div>
                        </div>
    
                        {/* Per-Team Rest Status Badge */}
                        {rest && (
                          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                                  rest.isEligible
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                                }`}
                              >
                                {rest.isEligible ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Clock className="w-3 h-3 text-amber-600" />
                                )}
                                <span>{rest.statusText}</span>
                              </span>
                              {rest.lastPitchCount !== undefined && (
                                <span className="text-[10px] text-slate-400">
                                  Last: {rest.lastPitchCount}p
                                </span>
                              )}
                            </div>
                            {!rest.isEligible && (
                              <div className="text-[10px] text-amber-800 font-medium truncate">
                                {rest.eligibleDateText}
                              </div>
                            )}
                          </div>
                        )}
    
                        {/* Actions: View Profile / Stats / Heatmap, Edit, Delete */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => onSelectPitcherProfile(p)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition"
                            title="View scouting report, heatmaps, and pitch counts"
                          >
                            <BarChart3 className="w-3 h-3 text-emerald-600" />
                            <span>Scouting</span>
                          </button>
    
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenEditPlayer(p)}
                              title="Edit player"
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onConfirmDeletePlayer(p)}
                              title="Delete player"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
    
              {/* Bottom Add Player Button when players exist */}
              {players.length > 0 && (
                <div className="pt-3 flex justify-center sm:justify-end">
                  <button
                    type="button"
                    id="bottom-add-player-btn"
                    onClick={onOpenAddPlayer}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Add Another Player</span>
                  </button>
                </div>
              )}
            </div>
  );
};
