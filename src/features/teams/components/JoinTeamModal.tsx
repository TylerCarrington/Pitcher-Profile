import React, { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

export interface JoinTeamModalProps {
  isOpen: boolean;
  isJoiningTeam: boolean;
  joinFeedback: { error?: string; success?: string } | null;
  onClose: () => void;
  onJoinTeam: (code: string) => void;
}

export const JoinTeamModal: React.FC<JoinTeamModalProps> = ({
  isOpen,
  isJoiningTeam,
  joinFeedback,
  onClose,
  onJoinTeam,
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setJoinCodeInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    onJoinTeam(joinCodeInput.trim());
  };

  return (
    <div
      id="join-team-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Join Team via Code / Link</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Enter the invite code or shareable link sent by another coach (e.g., "HAWKS-2026").
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
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
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isJoiningTeam}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs flex items-center gap-1.5 transition cursor-pointer"
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
  );
};
