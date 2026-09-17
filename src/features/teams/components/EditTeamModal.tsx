import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Team, PitchRulePresetId } from '../../../types';
import { PITCH_RULE_PRESETS } from '../../../utils/pitchSmart';
import { ImageUploadInput } from '../../../components/shared/ImageUploadInput';

export interface EditTeamModalProps {
  isOpen: boolean;
  selectedTeam: Team | null;
  onClose: () => void;
  onSaveTeam: (teamId: string, data: { name: string; imageUrl?: string; pitchRulePresetId?: PitchRulePresetId }) => void;
}

export const EditTeamModal: React.FC<EditTeamModalProps> = ({
  isOpen,
  selectedTeam,
  onClose,
  onSaveTeam,
}) => {
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamImage, setEditTeamImage] = useState('');
  const [editTeamPreset, setEditTeamPreset] = useState<PitchRulePresetId>('usa_pitch_smart');

  useEffect(() => {
    if (selectedTeam) {
      setEditTeamName(selectedTeam.name);
      setEditTeamImage(selectedTeam.imageUrl || '');
      setEditTeamPreset(selectedTeam.pitchRulePresetId || 'usa_pitch_smart');
    }
  }, [selectedTeam, isOpen]);

  if (!isOpen || !selectedTeam) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeamName.trim()) return;
    onSaveTeam(selectedTeam.id, {
      name: editTeamName.trim(),
      imageUrl: editTeamImage.trim() || undefined,
      pitchRulePresetId: editTeamPreset,
    });
    onClose();
  };

  return (
    <div
      id="edit-team-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Edit Team</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
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
              onClick={onClose}
              className="flex-1 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-edit-team-btn"
              className="flex-1 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
