import React, { useState, useMemo } from 'react';
import { Team, Player, Coach, PitchRulePresetId } from '../types';
import {
  Users,
  Plus,
  Share2,
  Trash2,
  Edit2,
  Check,
  X,
  Copy,
  Link,
  Shield,
  UserPlus,
  ArrowRight,
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Camera,
  Loader2,
} from 'lucide-react';
import { PitcherProfileModal } from './PitcherProfileModal';
import { ImageUploadInput } from './ImageUploadInput';
import {
  PITCH_RULE_PRESETS,
  getPitchRulePreset,
  calculatePlayerRestEligibility,
} from '../utils/pitchSmart';
import { getEventsForTeam, getAllSessions, getPitchesForPlayer } from '../storage';

interface TeamManagementProps {
  currentCoach: Coach;
  teams: Team[];
  selectedTeam: Team | null;
  onSelectTeam: (team: Team) => void;
  onCreateTeam: (name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => void;
  onUpdateTeam: (teamId: string, name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => void;
  onJoinTeam: (codeOrLink: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
  onDeleteTeam: (teamId: string) => void;
  onRegenerateInviteLink?: (teamId: string) => void;
  onRemoveCoach?: (teamId: string, coachId: string) => void;
  onLeaveTeam?: (teamId: string) => void;
  onUpdateTeamPitchPreset?: (teamId: string, presetId: PitchRulePresetId) => void;
  teamCoaches?: Coach[];
  players: Player[];
  onSavePlayer: (player: {
    id?: string;
    teamId: string;
    name: string;
    jerseyNumber: string;
    imageUrl?: string;
    throws?: 'R' | 'L';
    seasonAge?: number;
  }) => void;
  onDeletePlayer: (playerId: string) => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
  currentCoach,
  teams,
  selectedTeam,
  onSelectTeam,
  onCreateTeam,
  onUpdateTeam,
  onJoinTeam,
  onDeleteTeam,
  onRegenerateInviteLink,
  onRemoveCoach,
  onLeaveTeam,
  onUpdateTeamPitchPreset,
  teamCoaches = [],
  players,
  onSavePlayer,
  onDeletePlayer,
}) => {
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [showJoinTeamModal, setShowJoinTeamModal] = useState(false);
  const [showCoachesModal, setShowCoachesModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamImage, setNewTeamImage] = useState('');
  const [newTeamPreset, setNewTeamPreset] = useState<PitchRulePresetId>('usa_pitch_smart');
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamImage, setEditTeamImage] = useState('');
  const [editTeamPreset, setEditTeamPreset] = useState<PitchRulePresetId>('usa_pitch_smart');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinFeedback, setJoinFeedback] = useState<{ error?: string; success?: string } | null>(
    null,
  );

  // Confirmation Modals State (replaces iframe-blocked window.confirm)
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [coachToRemove, setCoachToRemove] = useState<Coach | null>(null);
  const [showLeaveTeamConfirm, setShowLeaveTeamConfirm] = useState(false);

  // Player modal state
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerNumber, setPlayerNumber] = useState('');
  const [playerImage, setPlayerImage] = useState('');
  const [playerThrows, setPlayerThrows] = useState<'R' | 'L'>('R');
  const [playerSeasonAge, setPlayerSeasonAge] = useState<number | ''>('');

  // Share link / code copied toast
  const [copiedState, setCopiedState] = useState<{ id: string; type: 'code' | 'link' } | null>(null);

  // Pitcher profile / scouting modal
  const [selectedPitcherForProfile, setSelectedPitcherForProfile] = useState<Player | null>(null);

  // Load team events, sessions, and pitches for rest calculations
  const teamEvents = useMemo(() => {
    if (!selectedTeam) return [];
    return getEventsForTeam(selectedTeam.id);
  }, [selectedTeam]);

  const allSessions = useMemo(() => {
    return getAllSessions();
  }, [selectedTeam, players]);

  // Map of playerId -> Rest Status on this team
  const playerRestStatusMap = useMemo(() => {
    if (!selectedTeam) return new Map();
    const map = new Map();
    players.forEach((p) => {
      const pitches = getPitchesForPlayer(p.id);
      const rest = calculatePlayerRestEligibility({
        player: p,
        teamId: selectedTeam.id,
        teamPresetId: selectedTeam.pitchRulePresetId || 'usa_pitch_smart',
        events: teamEvents,
        sessions: allSessions,
        pitches,
      });
      map.set(p.id, rest);
    });
    return map;
  }, [selectedTeam, players, teamEvents, allSessions]);

  const currentPreset = selectedTeam
    ? getPitchRulePreset(selectedTeam.pitchRulePresetId)
    : PITCH_RULE_PRESETS[0];

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    onCreateTeam(newTeamName.trim(), newTeamImage.trim() || undefined, newTeamPreset);
    setNewTeamName('');
    setNewTeamImage('');
    setNewTeamPreset('usa_pitch_smart');
    setShowCreateTeamModal(false);
  };

  const openEditTeamModal = () => {
    if (selectedTeam) {
      setEditTeamName(selectedTeam.name);
      setEditTeamImage(selectedTeam.imageUrl || '');
      setEditTeamPreset(selectedTeam.pitchRulePresetId || 'usa_pitch_smart');
      setShowEditTeamModal(true);
    }
  };

  const handleEditTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !editTeamName.trim()) return;
    onUpdateTeam(selectedTeam.id, editTeamName.trim(), editTeamImage.trim() || undefined, editTeamPreset);
    setShowEditTeamModal(false);
  };

  const [isJoiningTeam, setIsJoiningTeam] = useState(false);

  const handleJoinTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || isJoiningTeam) return;
    setIsJoiningTeam(true);
    setJoinFeedback(null);
    try {
      const res = await onJoinTeam(joinCodeInput.trim());
      if (res.success) {
        setJoinFeedback({ success: 'Successfully joined team!' });
        setTimeout(() => {
          setShowJoinTeamModal(false);
          setJoinFeedback(null);
          setJoinCodeInput('');
        }, 1000);
      } else {
        setJoinFeedback({ error: res.message || 'Invalid invite code or link.' });
      }
    } catch (err) {
      setJoinFeedback({ error: 'Failed to look up invite code. Please try again.' });
    } finally {
      setIsJoiningTeam(false);
    }
  };

  const openAddPlayer = () => {
    setEditingPlayer(null);
    setPlayerName('');
    setPlayerNumber('');
    setPlayerImage('');
    setPlayerThrows('R');
    setPlayerSeasonAge('');
    setShowPlayerModal(true);
  };

  const openEditPlayer = (p: Player) => {
    setEditingPlayer(p);
    setPlayerName(p.name);
    setPlayerNumber(p.jerseyNumber);
    setPlayerImage(p.imageUrl || '');
    setPlayerThrows(p.throws || 'R');
    setPlayerSeasonAge(p.seasonAge ?? '');
    setShowPlayerModal(true);
  };

  const handleSavePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !playerName.trim() || !playerNumber.trim()) return;
    const finalAge = typeof playerSeasonAge === 'number' ? playerSeasonAge : (parseInt(String(playerSeasonAge), 10) || 11);
    onSavePlayer({
      id: editingPlayer?.id,
      teamId: selectedTeam.id,
      name: playerName.trim(),
      jerseyNumber: playerNumber.trim(),
      imageUrl: playerImage.trim() || undefined,
      throws: playerThrows,
      seasonAge: finalAge,
    });
    setShowPlayerModal(false);
  };

  const copyInviteCode = (code: string, teamId: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedState({ id: teamId, type: 'code' });
      setTimeout(() => setCopiedState(null), 2500);
    });
  };

  const copyShareLink = (team: Team) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?join=${team.inviteCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedState({ id: team.id, type: 'link' });
      setTimeout(() => setCopiedState(null), 2500);
    });
  };

  const isSelectedTeamCreator = selectedTeam?.createdBy === currentCoach.id;

  return (
    <div id="team-management-section" className="space-y-6">
      {/* Selected Team's Roster Section */}
      {selectedTeam && (
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
                    onClick={openEditTeamModal}
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
                onClick={() => setShowPresetModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition flex items-center gap-1.5"
                title="Configure Pitch Limit & Rest Rules"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Pitch Rules: <strong>{currentPreset.shortName}</strong></span>
              </button>

              <button
                type="button"
                id="open-team-coaches-btn"
                onClick={() => setShowCoachesModal(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1.5"
                title="Manage coaches and invite links"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Coaches ({teamCoaches.length || 1})</span>
              </button>

              <button
                type="button"
                id="quick-copy-code-btn"
                onClick={() => copyInviteCode(selectedTeam.inviteCode, selectedTeam.id)}
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
                onClick={openAddPlayer}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Add Pitcher / Player</span>
              </button>

              {/* Edit and Delete team buttons: Only team creator can edit or delete */}
              {isSelectedTeamCreator && (
                <>
                  <button
                    type="button"
                    onClick={openEditTeamModal}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition flex items-center gap-1"
                    title="Edit Team"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="hidden sm:inline">Edit Team</span>
                  </button>
                  <button
                    type="button"
                    id="delete-team-btn"
                    onClick={() => setShowDeleteTeamModal(true)}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center gap-1"
                    title="Delete Team"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span className="hidden sm:inline">Delete Team</span>
                  </button>
                </>
              )}
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
                  onClick={openAddPlayer}
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
                      onClick={() => setSelectedPitcherForProfile(p)}
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
                        onClick={() => setSelectedPitcherForProfile(p)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition"
                        title="View scouting report, heatmaps, and pitch counts"
                      >
                        <BarChart3 className="w-3 h-3 text-emerald-600" />
                        <span>Scouting</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditPlayer(p)}
                          title="Edit player"
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlayerToDelete(p)}
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
                onClick={openAddPlayer}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Add Another Player</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div
          id="create-team-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Create New Team</h3>
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Westlake Wildcats 11U"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs"
                />
              </div>

              <ImageUploadInput
                label="Team Logo / Squad Photo (Optional)"
                value={newTeamImage}
                onChange={setNewTeamImage}
                shape="circle"
                helperText="Upload a logo, emblem, or squad photo from your phone or computer."
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pitch Limit &amp; Rest Rule Preset
                </label>
                <select
                  value={newTeamPreset}
                  onChange={(e) => setNewTeamPreset(e.target.value as PitchRulePresetId)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                >
                  {PITCH_RULE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} ({preset.badge})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enforces per-team daily pitch limits and rest requirements for pitcher arm safety.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeamModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditTeamModal && selectedTeam && (
        <div
          id="edit-team-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Edit Team</h3>
              <button
                type="button"
                onClick={() => setShowEditTeamModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTeamSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Westlake Wildcats 11U"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs"
                />
              </div>

              <ImageUploadInput
                label="Team Logo / Squad Photo (Optional)"
                value={editTeamImage}
                onChange={setEditTeamImage}
                shape="circle"
                helperText="Upload or change the team logo or squad photo."
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pitch Limit Ruleset *
                </label>
                <select
                  required
                  value={editTeamPreset}
                  onChange={(e) => setEditTeamPreset(e.target.value as PitchRulePresetId)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                >
                  {Object.values(PITCH_RULE_PRESETS).map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Sets the max pitches and required rest days for pitchers on this team.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditTeamModal(false)}
                  className="flex-1 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-edit-team-btn"
                  className="flex-1 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinTeamModal && (
        <div
          id="join-team-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Join Team via Code / Link</h3>
              <button
                type="button"
                onClick={() => {
                  setShowJoinTeamModal(false);
                  setJoinFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter the invite code or shareable link sent by another coach (e.g., "HAWKS-2026").
            </p>

            <form onSubmit={handleJoinTeamSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  placeholder="e.g. HAWKS-2026 or paste invite URL"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 uppercase font-mono shadow-xs"
                />
              </div>

              {joinFeedback?.error && (
                <div className="text-xs text-rose-600 font-medium">{joinFeedback.error}</div>
              )}
              {joinFeedback?.success && (
                <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {joinFeedback.success}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinTeamModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoiningTeam}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs flex items-center gap-1.5"
                >
                  {isJoiningTeam ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Checking code...
                    </>
                  ) : (
                    'Join Team'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Player Modal */}
      {showPlayerModal && (
        <div
          id="player-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingPlayer ? 'Edit Player' : 'Add Player to Roster'}
              </h3>
              <button
                type="button"
                onClick={() => setShowPlayerModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlayerSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Player Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Parker"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jersey # *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 11"
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Throws
                  </label>
                  <select
                    value={playerThrows}
                    onChange={(e) => setPlayerThrows(e.target.value as 'R' | 'L')}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 shadow-xs"
                  >
                    <option value="R">Right (RHP)</option>
                    <option value="L">Left (LHP)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Season Age (Youth Bracket) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={6}
                    max={19}
                    placeholder="e.g. 9"
                    required
                    value={playerSeasonAge}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setPlayerSeasonAge('');
                      } else {
                        const num = parseInt(val, 10);
                        setPlayerSeasonAge(isNaN(num) ? '' : num);
                      }
                    }}
                    className="w-24 text-sm px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 font-mono shadow-xs"
                  />
                  <span className="text-xs text-slate-500 font-medium">
                    {playerSeasonAge !== '' ? `${playerSeasonAge}U Bracket (used for Pitch Count limits)` : 'Select League Age (e.g. 9U, 11U)'}
                  </span>
                </div>
              </div>

              <ImageUploadInput
                label="Pitcher / Player Photo (Optional)"
                value={playerImage}
                onChange={setPlayerImage}
                shape="circle"
                helperText="Upload a player headshot or action photo from camera or files."
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlayerModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {editingPlayer ? 'Save Changes' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coaches & Share Link Modal */}
      {showCoachesModal && selectedTeam && (
        <div
          id="team-coaches-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Coaches &amp; Join Links
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCoachesModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shareable Invite Code & Link Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              {/* Option 1: Direct Invite Code */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <span>1. Team Invite Code</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Enter directly in "Join Team"
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div
                    onClick={() => copyInviteCode(selectedTeam.inviteCode, selectedTeam.id)}
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer flex items-center justify-between transition group/code"
                    title="Click to copy invite code"
                  >
                    <span className="font-mono text-base sm:text-lg font-black text-slate-900 tracking-wider">
                      {selectedTeam.inviteCode}
                    </span>
                    <span className="text-[11px] text-slate-400 group-hover/code:text-slate-600 font-medium hidden sm:inline">
                      Click to copy
                    </span>
                  </div>

                  <button
                    type="button"
                    id="modal-copy-code-btn"
                    onClick={() => copyInviteCode(selectedTeam.inviteCode, selectedTeam.id)}
                    className="px-4 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0 flex items-center gap-1.5 transition"
                  >
                    {copiedState?.id === selectedTeam.id && copiedState?.type === 'code' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Code Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Option 2: Direct Shareable Link */}
              <div className="space-y-1.5 pt-3 border-t border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    2. Direct Join URL Link
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Opens app and auto-joins team
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}${window.location.pathname}?join=${selectedTeam.inviteCode}`}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    id="modal-copy-link-btn"
                    onClick={() => copyShareLink(selectedTeam)}
                    className="px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white shadow-xs shrink-0 flex items-center gap-1.5 transition"
                  >
                    {copiedState?.id === selectedTeam.id && copiedState?.type === 'link' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Link className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Regenerate Link (Revoke old link) */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200/60">
                <span className="text-[11px] text-slate-400">
                  {selectedTeam.inviteCodeCreatedAt
                    ? `Active code generated ${new Date(selectedTeam.inviteCodeCreatedAt).toLocaleDateString()}`
                    : 'Active Code'}
                </span>
                {onRegenerateInviteLink && (
                  <button
                    type="button"
                    id="regenerate-invite-btn"
                    onClick={() => setShowRegenerateConfirm(true)}
                    className="text-xs text-amber-600 hover:text-amber-700 font-semibold underline"
                  >
                    Regenerate Code (Revoke Old)
                  </button>
                )}
              </div>
            </div>

            {/* Team Coaches List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Active Coaching Staff ({teamCoaches.length || 1})
                </span>
                <span className="text-[11px] text-slate-400">
                  {isSelectedTeamCreator ? 'You are Team Creator' : 'You are Staff Coach'}
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {teamCoaches.map((coach) => {
                  const isCoachCreator = selectedTeam.createdBy === coach.id;
                  const isMe = coach.id === currentCoach.id;

                  return (
                    <div
                      key={coach.id}
                      id={`team-coach-row-${coach.id}`}
                      className="p-3 flex items-center justify-between gap-3 bg-white"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {coach.avatar ? (
                          <img
                            src={coach.avatar}
                            alt={coach.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs border border-slate-200">
                            {coach.name[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {coach.name}
                            </span>
                            {isCoachCreator && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                                Creator
                              </span>
                            )}
                            {isMe && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-slate-100 text-slate-600 rounded">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{coach.email}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div>
                        {/* Team Creator can remove other coaches */}
                        {isSelectedTeamCreator && !isCoachCreator && onRemoveCoach && (
                          <button
                            type="button"
                            id={`remove-coach-${coach.id}`}
                            onClick={() => setCoachToRemove(coach)}
                            className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                          >
                            Remove
                          </button>
                        )}

                        {/* Non-creator current coach can leave team */}
                        {!isSelectedTeamCreator && isMe && onLeaveTeam && (
                          <button
                            type="button"
                            id="leave-team-btn"
                            onClick={() => setShowLeaveTeamConfirm(true)}
                            className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                          >
                            Leave Team
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCoachesModal(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pitch Rule Preset Configuration Modal */}
      {showPresetModal && selectedTeam && (
        <div
          id="pitch-preset-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowPresetModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full my-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Pitch Count &amp; Rest Rule Preset
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select the governing organization rules for <span className="text-emerald-400 font-semibold">{selectedTeam.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets List */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <p className="text-xs text-slate-600">
                Each team tracks rest days and pitch limits independently based on the selected ruleset below.
              </p>

              <div className="space-y-3">
                {PITCH_RULE_PRESETS.map((preset) => {
                  const isCurrent = (selectedTeam.pitchRulePresetId || 'usa_pitch_smart') === preset.id;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        if (onUpdateTeamPitchPreset) {
                          onUpdateTeamPitchPreset(selectedTeam.id, preset.id);
                          setShowPresetModal(false);
                        }
                      }}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col gap-3 ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                              isCurrent ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isCurrent && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-slate-900">{preset.name}</h4>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                                {preset.badge}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                  Currently Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{preset.description}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isCurrent}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'
                          }`}
                        >
                          {isCurrent ? 'Selected' : 'Use Rules'}
                        </button>
                      </div>

                      {/* Age brackets summary */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[11px]">
                        {preset.brackets.map((bracket, idx) => (
                          <span
                            key={idx}
                            className="bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-700 font-mono"
                          >
                            <strong className="text-slate-900 font-sans">{bracket.ageLabel}:</strong> Max {bracket.dailyMax}p
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pitcher Profile & Season Scouting Modal */}
      {selectedPitcherForProfile && selectedTeam && (
        <PitcherProfileModal
          player={selectedPitcherForProfile}
          team={selectedTeam}
          onClose={() => setSelectedPitcherForProfile(null)}
          onEditPlayer={openEditPlayer}
        />
      )}

      {/* Delete Team Modal */}
      {showDeleteTeamModal && selectedTeam && (
        <div
          id="confirm-delete-team-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">Delete Team "{selectedTeam.name}"?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">{selectedTeam.name}</span> and all its events, bullpens, and pitching records?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                id="cancel-delete-team-btn"
                onClick={() => setShowDeleteTeamModal(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-team-btn"
                onClick={() => {
                  onDeleteTeam(selectedTeam.id);
                  setShowDeleteTeamModal(false);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
              >
                Delete Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Player Modal */}
      {playerToDelete && (
        <div
          id="confirm-delete-player-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">Remove {playerToDelete.name}?</h3>
                <p className="text-xs text-slate-500">Jersey #{playerToDelete.jerseyNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-900">{playerToDelete.name}</span> from the roster?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                id="cancel-delete-player-btn"
                onClick={() => setPlayerToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-player-btn"
                onClick={() => {
                  onDeletePlayer(playerToDelete.id);
                  setPlayerToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
              >
                Remove Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Invite Code Modal */}
      {showRegenerateConfirm && selectedTeam && onRegenerateInviteLink && (
        <div
          id="confirm-regenerate-code-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">Regenerate Invite Code?</h3>
                <p className="text-xs text-slate-500">Old link will stop working</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Revoke current invite link & code? Anyone trying to join using the old link or code will no longer be able to access the team.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRegenerateInviteLink(selectedTeam.id);
                  setShowRegenerateConfirm(false);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
              >
                Regenerate Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Coach Modal */}
      {coachToRemove && selectedTeam && onRemoveCoach && (
        <div
          id="confirm-remove-coach-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">Remove {coachToRemove.name}?</h3>
                <p className="text-xs text-slate-500">{coachToRemove.email}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-900">{coachToRemove.name}</span> from <span className="font-bold text-slate-900">{selectedTeam.name}</span>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCoachToRemove(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveCoach(selectedTeam.id, coachToRemove.id);
                  setCoachToRemove(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
              >
                Remove Coach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Team Modal */}
      {showLeaveTeamConfirm && selectedTeam && onLeaveTeam && (
        <div
          id="confirm-leave-team-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">Leave {selectedTeam.name}?</h3>
                <p className="text-xs text-slate-500">Staff Access</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to leave <span className="font-bold text-slate-900">{selectedTeam.name}</span>? You will need an invite code to rejoin.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLeaveTeamConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onLeaveTeam(selectedTeam.id);
                  setShowLeaveTeamConfirm(false);
                  setShowCoachesModal(false);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
              >
                Leave Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
