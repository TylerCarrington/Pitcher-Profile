import React, { useState } from 'react';
import {
  Pitch,
  PitchOutcome,
  PitchType,
  StrikeSubDetail,
  InPlaySubDetail,
  PitchLocation,
  EventType,
} from '../../../types';
import { StrikeZoneGrid } from './StrikeZoneGrid';
import { PITCH_TYPES_CONFIG } from '../../../utils/pitchSmart';
import { X, Check } from 'lucide-react';

export interface PitchEditModalProps {
  pitch: Pitch;
  eventType: EventType;
  onClose: () => void;
  onSave: (updated: Partial<Pitch> & { id: string; sessionId: string }) => void;
}

export const PitchEditModal: React.FC<PitchEditModalProps> = ({
  pitch,
  eventType,
  onClose,
  onSave,
}) => {
  const [editOutcome, setEditOutcome] = useState<PitchOutcome>(pitch.outcome);
  const [editPitchType, setEditPitchType] = useState<PitchType>(pitch.pitchType || 'fastball');
  const [editStrikeDetail, setEditStrikeDetail] = useState<StrikeSubDetail | undefined>(
    pitch.strikeDetail,
  );
  const [editInPlayDetail, setEditInPlayDetail] = useState<InPlaySubDetail | undefined>(
    pitch.inPlayDetail,
  );
  const [editLocation, setEditLocation] = useState<PitchLocation | null>(pitch.location || null);

  const handleSave = () => {
    onSave({
      id: pitch.id,
      sessionId: pitch.sessionId,
      outcome: editOutcome,
      pitchType: editPitchType,
      strikeDetail: editOutcome === 'strike' ? editStrikeDetail : undefined,
      inPlayDetail: editOutcome === 'in_play' ? editInPlayDetail : undefined,
      location: editLocation,
    });
    onClose();
  };

  return (
    <div
      id="edit-pitch-modal"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h4 className="font-bold text-slate-900 text-sm">
            Edit Pitch #{pitch.pitchNumber}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
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
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition border capitalize cursor-pointer ${
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
              className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
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
              className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
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
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
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
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
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
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold capitalize border cursor-pointer ${
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
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold capitalize border cursor-pointer ${
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
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
