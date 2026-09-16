import React, { useState } from 'react';
import {
  Pitch,
  PitchOutcome,
  PitchType,
  StrikeSubDetail,
  InPlaySubDetail,
  PitchLocation,
  EventType,
} from '../types';
import { MiniStrikeZone, StrikeZoneGrid } from './StrikeZoneGrid';
import { PITCH_TYPES_CONFIG } from '../utils/pitchSmart';
import { Edit2, Trash2, X, Check, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface PitchHistoryProps {
  pitches: Pitch[];
  eventType: EventType;
  onUpdatePitch: (pitch: Partial<Pitch> & { id: string; sessionId: string }) => void;
  onDeletePitch: (pitchId: string, sessionId: string) => void;
}

export const PitchHistory: React.FC<PitchHistoryProps> = ({
  pitches,
  eventType,
  onUpdatePitch,
  onDeletePitch,
}) => {
  const [editingPitch, setEditingPitch] = useState<Pitch | null>(null);
  const [editOutcome, setEditOutcome] = useState<PitchOutcome>('ball');
  const [editPitchType, setEditPitchType] = useState<PitchType>('fastball');
  const [editStrikeDetail, setEditStrikeDetail] = useState<StrikeSubDetail | undefined>(undefined);
  const [editInPlayDetail, setEditInPlayDetail] = useState<InPlaySubDetail | undefined>(undefined);
  const [editLocation, setEditLocation] = useState<PitchLocation | null>(null);
  const [deletingPitchId, setDeletingPitchId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const startEdit = (p: Pitch) => {
    setEditingPitch(p);
    setEditOutcome(p.outcome);
    setEditPitchType(p.pitchType || 'fastball');
    setEditStrikeDetail(p.strikeDetail);
    setEditInPlayDetail(p.inPlayDetail);
    setEditLocation(p.location || null);
  };

  const handleSaveEdit = () => {
    if (!editingPitch) return;
    onUpdatePitch({
      id: editingPitch.id,
      sessionId: editingPitch.sessionId,
      outcome: editOutcome,
      pitchType: editPitchType,
      strikeDetail: editOutcome === 'strike' ? editStrikeDetail : undefined,
      inPlayDetail: editOutcome === 'in_play' ? editInPlayDetail : undefined,
      location: editLocation,
    });
    setEditingPitch(null);
  };

  const reversedPitches = [...pitches].reverse(); // newest first

  return (
    <div id="pitch-history-container" className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="font-bold text-sm text-slate-800">
            Pitch History ({pitches.length} {pitches.length === 1 ? 'pitch' : 'pitches'})
          </h3>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span className="text-xs">Latest first</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Pitch List */}
      {isExpanded && (
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {pitches.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No pitches recorded in this session yet.
            </div>
          ) : (
            reversedPitches.map((p) => {
              const formattedTime = new Date(p.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              const pitchTypeCfg = PITCH_TYPES_CONFIG[p.pitchType || 'fastball'] || PITCH_TYPES_CONFIG.fastball;

              return (
                <div
                  key={p.id}
                  id={`pitch-item-${p.id}`}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/75 transition"
                >
                  {/* Left: Pitch #, Mini Zone, Outcome Badge */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-sm text-slate-400 w-7 shrink-0">
                      #{p.pitchNumber}
                    </span>

                    {/* Mini Strike Zone */}
                    <MiniStrikeZone location={p.location} outcome={p.outcome} size={40} />

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Pitch Type Tag */}
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${pitchTypeCfg.bgColor} ${pitchTypeCfg.color} border ${pitchTypeCfg.borderColor}`}
                        >
                          {pitchTypeCfg.abbr}
                        </span>

                        {/* Outcome Tag */}
                        {p.outcome === 'ball' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Ball
                          </span>
                        )}
                        {p.outcome === 'strike' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            Strike {p.strikeDetail ? `(${p.strikeDetail.replace('_', ' ')})` : ''}
                          </span>
                        )}
                        {p.outcome === 'foul' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                            Foul
                          </span>
                        )}
                        {p.outcome === 'in_play' && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                            In Play {p.inPlayDetail ? `(${p.inPlayDetail === 'hbp' ? 'HBP' : p.inPlayDetail})` : ''}
                          </span>
                        )}

                        {/* Location label tag if present */}
                        {p.location && (
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">
                            {p.location.label || p.location.region}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Count: {p.ballsBefore}-{p.strikesBefore}</span>
                        <span>•</span>
                        <span>{formattedTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      title="Edit pitch"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingPitchId(p.id)}
                      title="Delete pitch"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPitchId && (
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
                onClick={() => setDeletingPitchId(null)}
                className="py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetPitch = pitches.find((p) => p.id === deletingPitchId);
                  if (targetPitch) {
                    onDeletePitch(targetPitch.id, targetPitch.sessionId);
                  }
                  setDeletingPitchId(null);
                }}
                className="py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Pitch Modal */}
      {editingPitch && (
        <div
          id="edit-pitch-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm">
                Edit Pitch #{editingPitch.pitchNumber}
              </h4>
              <button
                type="button"
                onClick={() => setEditingPitch(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pitch Type Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                Pitch Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['fastball', 'changeup', 'curveball', 'slider', 'other'] as PitchType[]).map((pt) => {
                  const cfg = PITCH_TYPES_CONFIG[pt] || PITCH_TYPES_CONFIG.fastball;
                  const isSelected = editPitchType === pt;
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setEditPitchType(pt)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition border capitalize ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cfg.abbr} - {pt === 'fastball' ? 'Fast' : pt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Outcome Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                Pitch Outcome
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditOutcome('ball')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                    editOutcome === 'ball'
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Ball
                </button>
                <button
                  type="button"
                  onClick={() => setEditOutcome('strike')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                    editOutcome === 'strike'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Strike
                </button>

                {eventType === 'game' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditOutcome('foul')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                        editOutcome === 'foul'
                          ? 'bg-slate-800 text-white border-slate-900 shadow'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Foul
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditOutcome('in_play')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                        editOutcome === 'in_play'
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      In-Play
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sub-detail options if Strike */}
            {editOutcome === 'strike' && eventType === 'game' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Strike Detail
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['called', 'swinging', 'foul_tip'] as StrikeSubDetail[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStrikeDetail(st)}
                      className={`py-1.5 px-2 rounded-md text-[11px] font-semibold capitalize border ${
                        editStrikeDetail === st
                          ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-detail options if In-Play */}
            {editOutcome === 'in_play' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  In-Play Detail
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['out', 'safe', 'error', 'hbp'] as InPlaySubDetail[]).map((ip) => (
                    <button
                      key={ip}
                      type="button"
                      onClick={() => setEditInPlayDetail(ip)}
                      className={`py-1.5 px-2 rounded-md text-[11px] font-semibold capitalize border ${
                        editInPlayDetail === ip
                          ? 'bg-indigo-100 border-indigo-500 text-indigo-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {ip === 'hbp' ? 'HBP' : ip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Edit Location Grid */}
            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pitch Location
              </label>
              <div className="flex justify-center bg-slate-100 p-2 rounded-xl">
                <StrikeZoneGrid
                  location={editLocation}
                  onChange={setEditLocation}
                  size={240}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingPitch(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
