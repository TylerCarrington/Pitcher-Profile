import React from 'react';
import { Trash2 } from 'lucide-react';

export interface PitchDeleteModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const PitchDeleteModal: React.FC<PitchDeleteModalProps> = ({
  onCancel,
  onConfirm,
}) => {
  return (
    <div
      id="delete-pitch-modal"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl border border-slate-200 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center font-bold">
          <Trash2 className="w-5 h-5" />
        </div>
        <h4 className="font-bold text-slate-900">Delete this pitch?</h4>
        <p className="text-xs text-slate-500">
          This will remove the pitch and adjust running counts for this session.
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
