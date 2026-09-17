import React from 'react';
import { Pitch } from '../../../types';
import { MiniStrikeZone } from './StrikeZoneGrid';
import { PITCH_TYPES_CONFIG } from '../../../utils/pitchSmart';
import { Edit2, Trash2 } from 'lucide-react';

export interface PitchHistoryItemProps {
  pitch: Pitch;
  onEdit: (pitch: Pitch) => void;
  onDelete: (pitchId: string) => void;
}

export const PitchHistoryItem: React.FC<PitchHistoryItemProps> = ({
  pitch,
  onEdit,
  onDelete,
}) => {
  const formattedTime = new Date(pitch.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const pitchTypeCfg =
    PITCH_TYPES_CONFIG[pitch.pitchType || 'fastball'] || PITCH_TYPES_CONFIG.fastball;

  return (
    <div
      id={`pitch-item-${pitch.id}`}
      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/75 transition"
    >
      {/* Left: Pitch #, Mini Zone, Outcome Badge */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono font-bold text-sm text-slate-400 w-7 shrink-0">
          #{pitch.pitchNumber}
        </span>

        {/* Mini Strike Zone */}
        <MiniStrikeZone location={pitch.location} outcome={pitch.outcome} size={40} />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Pitch Type Tag */}
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${pitchTypeCfg.bgColor} ${pitchTypeCfg.color} border ${pitchTypeCfg.borderColor}`}
            >
              {pitchTypeCfg.abbr}
            </span>

            {/* Outcome Tag */}
            {pitch.outcome === 'ball' && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Ball
              </span>
            )}
            {pitch.outcome === 'strike' && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                Strike {pitch.strikeDetail ? `(${pitch.strikeDetail.replace('_', ' ')})` : ''}
              </span>
            )}
            {pitch.outcome === 'foul' && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
                Foul
              </span>
            )}
            {pitch.outcome === 'in_play' && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                In Play {pitch.inPlayDetail ? `(${pitch.inPlayDetail === 'hbp' ? 'HBP' : pitch.inPlayDetail})` : ''}
              </span>
            )}

            {/* Location label tag if present */}
            {pitch.location && (
              <span className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">
                {pitch.location.label || pitch.location.region}
              </span>
            )}
          </div>

          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
            <span>
              Count: {pitch.ballsBefore}-{pitch.strikesBefore}
            </span>
            <span>&bull;</span>
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(pitch)}
          title="Edit pitch"
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(pitch.id)}
          title="Delete pitch"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
