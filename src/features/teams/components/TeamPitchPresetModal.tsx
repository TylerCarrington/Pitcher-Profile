import React from 'react';
import { Shield, X, Check } from 'lucide-react';
import { Team } from '../../../types';
import { PITCH_RULE_PRESETS } from '../../../utils/pitchSmart';

export interface TeamPitchPresetModalProps {
  isOpen: boolean;
  selectedTeam: Team | null;
  onClose: () => void;
  onUpdatePreset: (teamId: string, presetId: string) => void;
}

export const TeamPitchPresetModal: React.FC<TeamPitchPresetModalProps> = ({
  isOpen,
  selectedTeam,
  onClose,
  onUpdatePreset,
}) => {
  if (!isOpen || !selectedTeam) return null;

  return (
    <div
      id="pitch-preset-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full my-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Pitch Count &amp; Rest Rule Preset
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select the governing organization rules for <span className="text-emerald-400 font-semibold">{selectedTeam.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs text-slate-600">
            Each team tracks rest days and pitch limits independently based on the selected ruleset below.
          </p>

          <div className="space-y-3">
            {PITCH_RULE_PRESETS.map((preset) => {
              const isCurrent = (selectedTeam.pitchRulePresetId || 'usa_pitch_smart') === preset.id;

              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    onUpdatePreset(selectedTeam.id, preset.id);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col gap-3 ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                          isCurrent ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isCurrent && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900">{preset.name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                            {preset.badge}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              Currently Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{preset.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isCurrent}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                        isCurrent
                          ? 'bg-blue-600 text-white cursor-default'
                          : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 cursor-pointer'
                      }`}
                    >
                      {isCurrent ? 'Selected' : 'Use Rules'}
                    </button>
                  </div>

                  {/* Age brackets summary */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[11px]">
                    {preset.brackets.map((bracket, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-700 font-mono"
                      >
                        <strong className="text-slate-900 font-sans">{bracket.ageLabel}:</strong> Max {bracket.dailyMax}p
                        {bracket.twoDayMax && ` • 2-Day: ${bracket.twoDayMax}p`}
                        {bracket.threeDayMax && ` • 3-Day: ${bracket.threeDayMax}p`}
                        {bracket.singleEventMax && ` • Event Ceiling: ${bracket.singleEventMax}p`}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
