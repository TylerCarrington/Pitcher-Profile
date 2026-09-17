import React, { useState } from 'react';
import { Pitch, EventType } from '../../../types';
import { PitchHistoryItem } from './PitchHistoryItem';
import { PitchEditModal } from './PitchEditModal';
import { PitchDeleteModal } from './PitchDeleteModal';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

export interface PitchHistoryProps {
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
