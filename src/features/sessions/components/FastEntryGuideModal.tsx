import React from 'react';
import { Sparkles, X } from 'lucide-react';

export interface FastEntryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FastEntryGuideModal: React.FC<FastEntryGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="fast-entry-info-modal"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Flagship Fast Entry</h3>
              <p className="text-xs text-slate-500">Quick guide for mobile pitch tracking</p>
            </div>
          </div>
          <button
            type="button"
            id="close-fast-entry-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-slate-700 font-medium">
            Touch/drag on the grid for pitch location (with magnifying loupe), or tap any
            outcome button directly to record!
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Magnifying Loupe:</span> When dragging on the strike zone, a magnified sight appears above your finger so your fingertip never obscures your targeting.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Fast Strike Auto-Log:</span> Tap Strike, then tap anywhere on the grid to immediately save the pitch and queue the next pitch location in one motion.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Direct Outcome Logging:</span> Location is always optional. Tap BALL, STRIKE, FOUL, or IN-PLAY directly for lightning-fast tracking.
              </div>
            </div>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            id="dismiss-fast-entry-modal-btn"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs shadow transition active:scale-[0.99] cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
