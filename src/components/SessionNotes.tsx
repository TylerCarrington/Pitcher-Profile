import React, { useState, useEffect, useRef } from 'react';
import { Coach } from '../types';
import { Lock, CheckCircle2, FileText } from 'lucide-react';

interface SessionNotesProps {
  sessionId: string;
  currentCoach: Coach;
  initialNotes: string;
  onSaveNotes: (notes: string) => void;
}

export const SessionNotes: React.FC<SessionNotesProps> = ({
  sessionId,
  currentCoach,
  initialNotes,
  onSaveNotes,
}) => {
  const [notes, setNotes] = useState(initialNotes);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const timerRef = useRef<number | null>(null);

  // Sync when initialNotes changes from external switch or session change
  useEffect(() => {
    setNotes(initialNotes || '');
  }, [sessionId, initialNotes]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNotes(text);
    setSaveStatus('saving');

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      onSaveNotes(text);
      setSaveStatus('saved');
    }, 600);
  };

  return (
    <div id="session-notes-box" className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Coaching Notes
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {/* Privacy Badge */}
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <Lock className="w-3 h-3 text-amber-700" />
            <span>Private to {currentCoach.name}</span>
          </div>

          {/* Autosave Badge */}
          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            {saveStatus === 'saving' ? (
              <span className="text-amber-600 font-medium">Autosaving...</span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Saved
              </span>
            )}
          </span>
        </div>
      </div>

      <textarea
        id="session-notes-textarea"
        value={notes}
        onChange={handleChange}
        placeholder={`Type private scouting observations, mechanics notes, velocity feedback, or cues for ${currentCoach.name}...`}
        rows={3}
        className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 resize-none transition"
      />
    </div>
  );
};
