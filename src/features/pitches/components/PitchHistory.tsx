import React, { useState } from 'react';
import { Pitch, EventType } from '../../../types';
import { PitchHistoryItem } from './PitchHistoryItem';
import { PitchEditModal } from './PitchEditModal';
import { PitchDeleteModal } from './PitchDeleteModal';
import { Clock, ChevronDown, ChevronUp, Undo2 } from 'lucide-react';

export interface PitchHistoryProps {
  pitches: Pitch[];
  eventType?: EventType;
  onUpdatePitch: (pitch: Partial<Pitch> & { id: string; sessionId: string }) => void;
  onDeletePitch: (pitchId: string, sessionId: string) => void;
  onUndoPitch?: () => void;
  gameMetrics?: any;
  activePitcher?: any;
}

export const PitchHistory: React.FC<PitchHistoryProps> = ({
  pitches,
  eventType = 'game',
  onUpdatePitch,
  onDeletePitch,
  onUndoPitch,
}) => {
  const [editingPitch, setEditingPitch] = useState<Pitch | null>(null);
  const [deletingPitchId, setDeletingPitchId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const reversedPitches = [...pitches].reverse(); // newest first

  return (
    <div
      id="pitch-history-container"
      className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
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
          {pitches.length > 0 && onUndoPitch && (
            <button
              type="button"
              id="pitch-history-undo-btn"
              onClick={(e) => {
                e.stopPropagation();
                onUndoPitch();
              }}
              className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md transition flex items-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
              title="Undo the most recent pitch in this session"
            >
              <Undo2 className="w-3 h-3 text-amber-600" />
              <span>Undo Last Pitch</span>
            </button>
          )}
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
            reversedPitches.map((p) => (
              <PitchHistoryItem
                key={p.id}
                pitch={p}
                onEdit={setEditingPitch}
                onDelete={setDeletingPitchId}
              />
            ))
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPitchId && (
        <PitchDeleteModal
          onCancel={() => setDeletingPitchId(null)}
          onConfirm={() => {
            const targetPitch = pitches.find((p) => p.id === deletingPitchId);
            if (targetPitch) {
              onDeletePitch(targetPitch.id, targetPitch.sessionId);
            }
            setDeletingPitchId(null);
          }}
        />
      )}

      {/* Edit Pitch Modal */}
      {editingPitch && (
        <PitchEditModal
          pitch={editingPitch}
          eventType={eventType}
          onClose={() => setEditingPitch(null)}
          onSave={onUpdatePitch}
        />
      )}
    </div>
  );
};
