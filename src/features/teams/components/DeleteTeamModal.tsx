import React from 'react';
import { Trash2 } from 'lucide-react';
import { Team } from '../../../types';

export interface DeleteTeamModalProps {
  isOpen: boolean;
  selectedTeam: Team | null;
  onClose: () => void;
  onConfirmDelete: (teamId: string) => void;
}

export const DeleteTeamModal: React.FC<DeleteTeamModalProps> = ({
  isOpen,
  selectedTeam,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !selectedTeam) return null;

  return (
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
            <h3 className="text-base font-bold text-slate-900 truncate">
              Delete Team "{selectedTeam.name}"?
            </h3>
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
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-delete-team-btn"
            onClick={() => {
              onConfirmDelete(selectedTeam.id);
              onClose();
            }}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer"
          >
            Delete Team
          </button>
        </div>
      </div>
    </div>
  );
};
