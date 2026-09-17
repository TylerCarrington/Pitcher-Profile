import React from 'react';
import { LogOut } from 'lucide-react';
import { Player } from '../../../types';

export interface EndSessionModalProps {
  isOpen: boolean;
  pitcher: Player | null;
  pitchCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const EndSessionModal: React.FC<EndSessionModalProps> = ({
  isOpen,
  pitcher,
  pitchCount,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !pitcher) return null;

  return (
    <div
      id="confirm-end-session-modal"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">End Pitcher's Session?</h3>
            <p className="text-xs text-slate-400 truncate">
              {pitcher.name} &bull; {pitchCount} pitches recorded
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          All pitch counts, velocities, and location plots are permanently saved. You will return to select another pitcher or view event totals.
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            id="cancel-end-session-btn"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-end-session-btn"
            onClick={onConfirm}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition cursor-pointer"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
};
