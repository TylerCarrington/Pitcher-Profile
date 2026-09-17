import React, { useState } from 'react';
import {
  Users,
  X,
  Copy,
  Check,
  Link,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Team, Coach } from '../../../types';

export interface TeamCoachesModalProps {
  isOpen: boolean;
  selectedTeam: Team | null;
  currentCoach: Coach;
  teamCoaches: Coach[];
  copiedState: { id: string; type: 'code' | 'link' } | null;
  onClose: () => void;
  onCopyInviteCode: (code: string, teamId: string) => void;
  onCopyShareLink: (team: Team) => void;
  onRegenerateInviteLink?: (teamId: string) => void;
  onRemoveCoach?: (teamId: string, coachId: string) => void;
  onLeaveTeam?: (teamId: string) => void;
}

export const TeamCoachesModal: React.FC<TeamCoachesModalProps> = ({
  isOpen,
  selectedTeam,
  currentCoach,
  teamCoaches,
  copiedState,
  onClose,
  onCopyInviteCode,
  onCopyShareLink,
  onRegenerateInviteLink,
  onRemoveCoach,
  onLeaveTeam,
}) => {
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [coachToRemove, setCoachToRemove] = useState<Coach | null>(null);
  const [showLeaveTeamConfirm, setShowLeaveTeamConfirm] = useState(false);

  if (!isOpen || !selectedTeam) return null;

  const isSelectedTeamCreator = selectedTeam.createdBy === currentCoach.id;
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?join=${selectedTeam.inviteCode}`
    : `?join=${selectedTeam.inviteCode}`;

  return (
    <>
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
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
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
                  onClick={() => onCopyInviteCode(selectedTeam.inviteCode, selectedTeam.id)}
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
                  onClick={() => onCopyInviteCode(selectedTeam.inviteCode, selectedTeam.id)}
                  className="px-4 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shrink-0 flex items-center gap-1.5 transition cursor-pointer"
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
                  value={joinUrl}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  id="modal-copy-link-btn"
                  onClick={() => onCopyShareLink(selectedTeam)}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white shadow-xs shrink-0 flex items-center gap-1.5 transition cursor-pointer"
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

            {/* Regenerate Link */}
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
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold underline cursor-pointer"
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
                      {isSelectedTeamCreator && !isCoachCreator && onRemoveCoach && (
                        <button
                          type="button"
                          id={`remove-coach-${coach.id}`}
                          onClick={() => setCoachToRemove(coach)}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
                        >
                          Remove
                        </button>
                      )}

                      {!isSelectedTeamCreator && isMe && onLeaveTeam && (
                        <button
                          type="button"
                          id="leave-team-btn"
                          onClick={() => setShowLeaveTeamConfirm(true)}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer"
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
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Regenerate Invite Code Modal */}
      {showRegenerateConfirm && onRegenerateInviteLink && (
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
              Revoke current invite link &amp; code? Anyone trying to join using the old link or code will no longer be able to access the team.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRegenerateInviteLink(selectedTeam.id);
                  setShowRegenerateConfirm(false);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer"
              >
                Regenerate Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Coach Modal */}
      {coachToRemove && onRemoveCoach && (
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
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveCoach(selectedTeam.id, coachToRemove.id);
                  setCoachToRemove(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Remove Coach
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Team Modal */}
      {showLeaveTeamConfirm && onLeaveTeam && (
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
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onLeaveTeam(selectedTeam.id);
                  setShowLeaveTeamConfirm(false);
                  onClose();
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
              >
                Leave Team
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
