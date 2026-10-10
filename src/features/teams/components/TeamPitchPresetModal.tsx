import React, { useState } from 'react';
import {
  Shield,
  X,
  Check,
  Calendar,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { Team, PitchRulePresetId } from '../../../types';
import { PITCH_RULE_PRESETS, PitchSmartBracket } from '../../../utils/pitchSmart';

export interface TeamPitchPresetModalProps {
  isOpen: boolean;
  selectedTeam: Team | null;
  onClose: () => void;
  onUpdatePreset: (teamId: string, presetId: string) => void;
}

const AGE_FILTER_OPTIONS = [
  { id: 'all', label: 'All Ages' },
  { id: '8', label: '7-8U' },
  { id: '10', label: '9-10U' },
  { id: '12', label: '11-12U' },
  { id: '14', label: '13-14U' },
  { id: '16', label: '15-16U' },
  { id: '18', label: '17-18U' },
];

function matchesAgeFilter(bracket: PitchSmartBracket, filterAge: string): boolean {
  if (filterAge === 'all') return true;
  const targetAge = parseInt(filterAge, 10);
  if (isNaN(targetAge)) return true;
  return targetAge >= bracket.minAge && targetAge <= bracket.maxAge;
}

export const TeamPitchPresetModal: React.FC<TeamPitchPresetModalProps> = ({
  isOpen,
  selectedTeam,
  onClose,
  onUpdatePreset,
}) => {
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string>('all');
  const [expandedPresets, setExpandedPresets] = useState<Record<string, boolean>>(() => {
    // Default the active preset to expanded
    const initial: Record<string, boolean> = {};
    if (selectedTeam?.pitchRulePresetId) {
      initial[selectedTeam.pitchRulePresetId] = true;
    } else {
      initial['usa_pitch_smart'] = true;
    }
    return initial;
  });

  if (!isOpen || !selectedTeam) return null;

  const currentPresetId = selectedTeam.pitchRulePresetId || 'usa_pitch_smart';

  const toggleExpand = (presetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedPresets((prev) => ({
      ...prev,
      [presetId]: !prev[presetId],
    }));
  };

  const handleSelectPreset = (presetId: string) => {
    onUpdatePreset(selectedTeam.id, presetId);
    onClose();
  };

  return (
    <div
      id="pitch-preset-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full my-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 relative flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Pitch Count &amp; Rest Rule Presets
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Governing organization daily limits &amp; mandatory rest day rules for{' '}
                <span className="text-emerald-400 font-semibold">{selectedTeam.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg bg-white/10 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader / Age Filter Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Filter by Age Group:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {AGE_FILTER_OPTIONS.map((opt) => {
              const isActive = selectedAgeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedAgeFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Presets List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <p>
              Each ruleset defines maximum daily pitches and required calendar rest days for each age group.
            </p>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" /> 0d
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400 ml-1" /> 1d
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 ml-1" /> 2d
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 ml-1" /> 3d
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-400 ml-1" /> 4d rest
            </div>
          </div>

          <div className="space-y-4">
            {PITCH_RULE_PRESETS.map((preset) => {
              const isCurrent = currentPresetId === preset.id;
              const isExpanded = expandedPresets[preset.id] ?? isCurrent;
              const matchingBrackets = preset.brackets.filter((b) =>
                matchesAgeFilter(b, selectedAgeFilter)
              );

              return (
                <div
                  key={preset.id}
                  className={`rounded-2xl border-2 transition overflow-hidden ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Preset Header / Selector Bar */}
                  <div
                    onClick={() => handleSelectPreset(preset.id)}
                    className="p-4 cursor-pointer flex items-start justify-between gap-3 hover:bg-slate-50/50 transition"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                          isCurrent ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isCurrent && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="flex-1">
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

                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(preset.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                        title={isExpanded ? 'Collapse rest rules' : 'Expand rest rules'}
                      >
                        <span className="hidden sm:inline">
                          {isExpanded ? 'Hide Rest Rules' : 'Show Rest Rules'}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        disabled={isCurrent}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                          isCurrent
                            ? 'bg-blue-600 text-white cursor-default'
                            : 'bg-slate-900 hover:bg-blue-600 text-white cursor-pointer shadow-xs'
                        }`}
                      >
                        {isCurrent ? 'Selected' : 'Use Rules'}
                      </button>
                    </div>
                  </div>

                  {/* Rest Rules & Age Brackets Breakdown */}
                  {isExpanded && (
                    <div
                      className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 bg-slate-50/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Age Brackets &amp; Required Rest Days Breakdown</span>
                        </div>
                        {selectedAgeFilter !== 'all' && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            Showing {matchingBrackets.length} bracket ({selectedAgeFilter}U filter)
                          </span>
                        )}
                      </div>

                      {matchingBrackets.length === 0 ? (
                        <div className="p-3 bg-white border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                          No specific bracket matches {selectedAgeFilter}U in this ruleset. Try selecting &quot;All Ages&quot;.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {matchingBrackets.map((bracket, idx) => (
                            <div
                              key={idx}
                              className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs space-y-2.5"
                            >
                              {/* Bracket Header with Daily Max and Tournament Caps */}
                              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs sm:text-sm text-slate-900">
                                    {bracket.ageLabel}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    ({bracket.minAge}-{bracket.maxAge} yrs)
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md text-xs font-black bg-slate-900 text-white font-mono shadow-2xs">
                                    Max {bracket.dailyMax}p / day
                                  </span>
                                  {bracket.twoDayMax && (
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                      2-Day: {bracket.twoDayMax}p
                                    </span>
                                  )}
                                  {bracket.threeDayMax && (
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                      3-Day: {bracket.threeDayMax}p
                                    </span>
                                  )}
                                  {bracket.singleEventMax && (
                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                      Event Ceiling: {bracket.singleEventMax}p
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Per-Day Required Rest Day Schedule */}
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>Per-Day Required Rest Schedule</span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
                                  {bracket.tiers.map((tier) => {
                                    const tierBadgeTheme =
                                      tier.restDays === 0
                                        ? {
                                            bg: 'bg-emerald-50/80',
                                            border: 'border-emerald-200',
                                            text: 'text-emerald-950',
                                            pill: 'bg-emerald-200 text-emerald-900',
                                            desc: 'Ready next day',
                                          }
                                        : tier.restDays === 1
                                        ? {
                                            bg: 'bg-blue-50/80',
                                            border: 'border-blue-200',
                                            text: 'text-blue-950',
                                            pill: 'bg-blue-200 text-blue-900',
                                            desc: '1 day off',
                                          }
                                        : tier.restDays === 2
                                        ? {
                                            bg: 'bg-amber-50/80',
                                            border: 'border-amber-200',
                                            text: 'text-amber-950',
                                            pill: 'bg-amber-200 text-amber-900',
                                            desc: '2 days off',
                                          }
                                        : tier.restDays === 3
                                        ? {
                                            bg: 'bg-orange-50/80',
                                            border: 'border-orange-200',
                                            text: 'text-orange-950',
                                            pill: 'bg-orange-200 text-orange-900',
                                            desc: '3 days off',
                                          }
                                        : {
                                            bg: 'bg-rose-50/80',
                                            border: 'border-rose-200',
                                            text: 'text-rose-950',
                                            pill: 'bg-rose-200 text-rose-900',
                                            desc: '4 days off',
                                          };

                                    return (
                                      <div
                                        key={tier.label}
                                        className={`p-2 rounded-lg border text-center flex flex-col justify-between ${tierBadgeTheme.bg} ${tierBadgeTheme.border} ${tierBadgeTheme.text}`}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-extrabold text-xs">
                                            {tier.restDays === 0
                                              ? '0 Days'
                                              : `${tier.restDays} Day${tier.restDays > 1 ? 's' : ''}`}
                                          </span>
                                          <span
                                            className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full ${tierBadgeTheme.pill}`}
                                          >
                                            Rest
                                          </span>
                                        </div>
                                        <div className="font-mono font-bold text-xs mt-1 text-slate-900">
                                          {tier.min}–{tier.max}{' '}
                                          <span className="text-[10px] font-normal text-slate-600">
                                            pitches
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                          {tierBadgeTheme.desc}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {bracket.warningNote && (
                                <div className="p-2 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-1.5 leading-snug">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <span>{bracket.warningNote}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Collapsed Summary Row */}
                  {!isExpanded && (
                    <div
                      className="px-4 py-2.5 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] bg-slate-50/30"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {matchingBrackets.map((bracket, idx) => (
                        <span
                          key={idx}
                          className="bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-700 font-mono flex items-center gap-1"
                        >
                          <strong className="text-slate-900 font-sans">{bracket.ageLabel}:</strong>
                          <span>Max {bracket.dailyMax}p</span>
                          <span className="text-slate-400 font-sans">&bull;</span>
                          <span className="text-emerald-700 font-semibold font-sans">
                            {bracket.tiers.length} rest tiers (0-{Math.max(...bracket.tiers.map((t) => t.restDays))}d)
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Rest days are full calendar days before a pitcher can throw again.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

