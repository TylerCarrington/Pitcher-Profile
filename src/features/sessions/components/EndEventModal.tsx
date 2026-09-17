import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BaseballEvent } from '../../../types';

export interface EndEventModalProps {
  isOpen: boolean;
  event: BaseballEvent | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const EndEventModal: React.FC<EndEventModalProps> = ({
  isOpen,
  event,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !event) return null;

  return (
    <div
      id="confirm-end-event-modal"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white truncate">End Entire Event?</h3>
            <p className="text-xs text-slate-400 truncate">
              {event?.type === 'game'
                ? event.opponent
                  ? `Game vs ${event.opponent}`
                  : 'Live Game'
                : 'Bullpen Session'}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          This wraps up tracking for all pitchers and brings you directly to the comprehensive post-event review, pitch count reports, and rest recommendations.
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            id="cancel-end-event-btn"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-end-event-btn"
            onClick={onConfirm}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition cursor-pointer"
          >
            End Entire Event
          </button>
        </div>
      </div>
    </div>
  );
};
