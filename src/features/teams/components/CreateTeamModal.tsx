import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PitchRulePresetId } from '../../../types';
import { PITCH_RULE_PRESETS } from '../../../utils/pitchSmart';
import { ImageUploadInput } from '../../../components/shared/ImageUploadInput';

export interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTeam: (teamData: { name: string; imageUrl?: string; pitchRulePresetId?: PitchRulePresetId }) => void;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  onCreateTeam,
}) => {
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamImage, setNewTeamImage] = useState('');
  const [newTeamPreset, setNewTeamPreset] = useState<PitchRulePresetId>('usa_pitch_smart');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    onCreateTeam({
      name: newTeamName.trim(),
      imageUrl: newTeamImage.trim() || undefined,
      pitchRulePresetId: newTeamPreset,
    });
    setNewTeamName('');
    setNewTeamImage('');
    setNewTeamPreset('usa_pitch_smart');
    onClose();
  };

  return (
    <div
      id="create-team-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Create New Team</h3>
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
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
