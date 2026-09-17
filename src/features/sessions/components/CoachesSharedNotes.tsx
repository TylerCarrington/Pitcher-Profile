import React from 'react';
import { Users } from 'lucide-react';
import { PitcherSession, Coach } from '../../../types';
import { getAllCoaches } from '../../../storage';

export interface CoachesSharedNotesProps {
  activeSession?: PitcherSession | null;
  session?: PitcherSession | null;
  currentCoach?: Coach | null;
  currentCoachId?: string | null;
}

export const CoachesSharedNotes: React.FC<CoachesSharedNotesProps> = (props) => {
  const session = props.activeSession || props.session || null;
  const currentCoachId = props.currentCoach?.id || props.currentCoachId || '';
  const allCoaches = getAllCoaches();

  const sharedNotes = Object.entries(session?.coachNotes || {})
    .filter(([coachId, note]) => {
      if (currentCoachId && coachId === currentCoachId) return false;
      return typeof note === 'string' && note.trim().startsWith('[SHARED]');
    })
    .map(([coachId, note]) => {
      const author = allCoaches.find((c) => c.id === coachId);
      const noteText = String(note || '').replace(/^\[SHARED\]\s*/, '');
      return { coachId, authorName: author?.name || 'Co-Coach', noteText };
    });

  return (
    <div className="w-full bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Users className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>Co-Coach Live Shared Comments</span>
        </div>
        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200">
          Real-Time
        </span>
      </div>

      {sharedNotes.length === 0 ? (
        <p className="text-xs text-slate-400 italic">
          No other coaches have posted shared comments for this session yet. Any notes saved with the unlocked "Shared with Team Coaches" status will appear here instantly in real-time.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {sharedNotes.map((sn) => (
            <div key={sn.coachId} className="bg-white p-3 rounded-lg border border-emerald-100 shadow-3xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{sn.authorName}</span>
                <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-100">
                  Shared Live
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {sn.noteText}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
