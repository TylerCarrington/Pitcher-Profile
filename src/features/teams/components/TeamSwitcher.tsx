import React, { useState, useRef, useEffect } from 'react';
import { Team, Coach, PitchRulePresetId } from '../../../types';
import {
  ChevronDown,
  Check,
  Plus,
  Link,
  Shield,
  X,
  Users,
  Loader2,
  Copy,
} from 'lucide-react';
import { PITCH_RULE_PRESETS } from '../../../utils/pitchSmart';
import { ImageUploadInput } from '../../../components/shared/ImageUploadInput';
import { useTeam } from '../hooks/useTeam';
import { useAuth } from '../../auth/hooks/useAuth';

interface TeamSwitcherProps {
  teams?: Team[];
  selectedTeam?: Team | null;
  currentCoach?: Coach | null;
  onSelectTeam?: (team: Team) => void;
  onCreateTeam?: (name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => void;
  onJoinTeam?: (codeOrLink: string) => Promise<{ success: boolean; message?: string }> | { success: boolean; message?: string };
}

export const TeamSwitcher: React.FC<TeamSwitcherProps> = (props) => {
  const teamCtx = useTeam();
  const authCtx = useAuth();

  const teams = props.teams ?? teamCtx.teams;
  const selectedTeam = props.selectedTeam !== undefined ? props.selectedTeam : teamCtx.selectedTeam;
  const currentCoach = props.currentCoach ?? authCtx.currentCoach;
  const onSelectTeam = props.onSelectTeam ?? teamCtx.selectTeam;
  const onCreateTeam = props.onCreateTeam ?? teamCtx.createTeam;
  const onJoinTeam = props.onJoinTeam ?? teamCtx.joinTeam;

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Create team form state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamImage, setNewTeamImage] = useState('');
  const [newTeamPreset, setNewTeamPreset] = useState<PitchRulePresetId>('usa_pitch_smart');

  // Join team form state
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedTeamCodeId, setCopiedTeamCodeId] = useState<string | null>(null);

  const handleCopyCode = (e: React.MouseEvent, code: string, teamId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      setCopiedTeamCodeId(teamId);
      setTimeout(() => setCopiedTeamCodeId(null), 2000);
    });
  };

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    onCreateTeam(newTeamName.trim(), newTeamImage.trim() || undefined, newTeamPreset);
    setNewTeamName('');
    setNewTeamImage('');
    setNewTeamPreset('usa_pitch_smart');
    setShowCreateModal(false);
    setIsOpen(false);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(null);
    if (!joinCode.trim() || isJoining) return;
    setIsJoining(true);

    try {
      const res = await onJoinTeam(joinCode.trim());
      if (res.success) {
        setJoinSuccess('Joined team successfully!');
        setTimeout(() => {
          setShowJoinModal(false);
          setJoinCode('');
          setJoinSuccess(null);
          setIsOpen(false);
        }, 700);
      } else {
        setJoinError(res.message || 'Invalid or expired invite code.');
      }
    } catch (err) {
      setJoinError('Failed to verify invite code. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  if (!currentCoach) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="team-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold transition cursor-pointer"
      >
        {selectedTeam?.imageUrl ? (
          <img
            src={selectedTeam.imageUrl}
            alt={selectedTeam.name}
            className="w-5 h-5 rounded-full object-cover border border-slate-600 shrink-0"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">
            {selectedTeam ? selectedTeam.name.substring(0, 2).toUpperCase() : 'TM'}
          </div>
        )}

        <div className="text-left max-w-[140px] sm:max-w-[170px] truncate">
          <div className="text-xs font-bold leading-none truncate text-white">
            {selectedTeam ? selectedTeam.name : 'Select Team'}
          </div>
          <div className="text-[9px] text-emerald-400 font-semibold leading-none mt-0.5 uppercase tracking-wider">
            {selectedTeam?.createdBy === currentCoach.id ? 'Head Coach' : 'Staff'}
          </div>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="team-dropdown-menu"
          className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Your Teams ({teams.length})
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Click to switch
            </span>
          </div>

          {/* Team List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
            {teams.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">
                No teams found. Create your first team below.
              </div>
            ) : (
              teams.map((team) => {
                const isSelected = selectedTeam?.id === team.id;
                const isCreator = team.createdBy === currentCoach.id;

                return (
                  <button
                    key={team.id}
                    type="button"
                    id={`team-option-${team.id}`}
                    onClick={() => {
                      onSelectTeam(team);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between gap-2.5 hover:bg-slate-50 transition cursor-pointer ${
                      isSelected ? 'font-bold text-emerald-800 bg-emerald-50/60' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {team.imageUrl ? (
                        <img
                          src={team.imageUrl}
                          alt={team.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                          {team.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold leading-snug">
                          {team.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-normal mt-0.5">
                          <span>{isCreator ? 'Head Coach' : 'Member'}</span>
                          <span>&bull;</span>
                          <span
                            onClick={(e) => handleCopyCode(e, team.inviteCode, team.id)}
                            title="Click to copy team invite code"
                            className="font-mono text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 px-1 py-0.5 rounded transition flex items-center gap-1"
                          >
                            <span>{team.inviteCode}</span>
                            {copiedTeamCodeId === team.id ? (
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 opacity-60 hover:opacity-100" />
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Action Options: Add Team & Join Team */}
          <div className="p-1.5 border-t border-slate-100 bg-slate-50/40 space-y-1 mt-1">
            <button
              type="button"
              id="team-switcher-create-btn"
              onClick={() => {
                setShowCreateModal(true);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg text-left transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Create New Team</span>
            </button>

            <button
              type="button"
              id="team-switcher-join-btn"
              onClick={() => {
                setShowJoinModal(true);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50 rounded-lg text-left transition flex items-center gap-2 cursor-pointer"
            >
              <Link className="w-3.5 h-3.5 text-sky-600" />
              <span>Join with Invite Code</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Team */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Create New Team</h3>
                  <p className="text-[11px] text-slate-500">Add a squad to your coach dashboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
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
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pitch Limit &amp; Rest Days Rule Preset *
                </label>
                <select
                  value={newTeamPreset}
                  onChange={(e) => setNewTeamPreset(e.target.value as PitchRulePresetId)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
                >
                  {PITCH_RULE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} ({preset.badge})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Enforces automatic daily pitch thresholds and mandatory rest-day countdowns per pitcher age.
                </p>
              </div>

              <ImageUploadInput
                label="Team Logo / Squad Photo (Optional)"
                value={newTeamImage}
                onChange={setNewTeamImage}
                shape="circle"
                helperText="Upload a logo, emblem, or squad photo from your phone or computer."
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTeamName.trim()}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition cursor-pointer"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Team */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Join Team with Code</h3>
                  <p className="text-[11px] text-slate-500">Enter code or paste share link from head coach</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError(null);
                  setJoinSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Invite Code or Share URL *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HAWKS-2026"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full text-sm font-mono uppercase px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-xs"
                />
              </div>

              {joinError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {joinError}
                </div>
              )}

              {joinSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  {joinSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinError(null);
                    setJoinSuccess(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!joinCode.trim() || isJoining}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Joining...
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
    </div>
  );
};
