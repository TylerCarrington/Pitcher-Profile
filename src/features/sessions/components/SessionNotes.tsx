import React, { useState, useEffect, useRef } from 'react';
import { Coach, PitcherSession } from '../../../types';
import { Lock, Unlock, CheckCircle2, FileText, Users } from 'lucide-react';

interface SessionNotesProps {
  sessionId?: string;
  session?: PitcherSession | null;
  currentCoach?: Coach | null;
  initialNotes?: string;
  onSaveNotes?: (notes: string) => void;
}

export const SessionNotes: React.FC<SessionNotesProps> = (props) => {
  const session = props.session;
  const currentCoach = props.currentCoach;
  const sessionId = props.sessionId || session?.id || '';
  const coachId = currentCoach?.id || '';

  const initialNotes =
    props.initialNotes !== undefined
      ? props.initialNotes
      : (session && coachId && session.coachNotes ? session.coachNotes[coachId] : '') || '';

  const onSaveNotes = props.onSaveNotes;

  const isInitiallyShared = initialNotes ? initialNotes.startsWith('[SHARED]') : false;
  const cleanInitialText = initialNotes ? initialNotes.replace(/^\[SHARED\]\s*/, '') : '';

  const [notes, setNotes] = useState(cleanInitialText);
  const [isShared, setIsShared] = useState(isInitiallyShared);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const timerRef = useRef<number | null>(null);

  // Sync when initialNotes changes from external switch or session change
  useEffect(() => {
    const shared = initialNotes ? initialNotes.startsWith('[SHARED]') : false;
    const text = initialNotes ? initialNotes.replace(/^\[SHARED\]\s*/, '') : '';
    setNotes(text);
    setIsShared(shared);
    setSaveStatus('saved');
  }, [sessionId, initialNotes]);

  const triggerSave = (text: string, shared: boolean) => {
    setSaveStatus('saving');

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      const formattedNote = shared ? `[SHARED] ${text}` : text;
      if (onSaveNotes) {
        onSaveNotes(formattedNote);
      }
      setSaveStatus('saved');
    }, 600);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNotes(text);
    triggerSave(text, isShared);
  };

  const handleTogglePrivacy = () => {
    const nextShared = !isShared;
    setIsShared(nextShared);
    triggerSave(notes, nextShared);
  };

  return (
    <div id="session-notes-box" className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Coaching Notes
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {/* Interactive Clickable Privacy Badge */}
          <button
            type="button"
            id="toggle-note-privacy-badge-btn"
            onClick={handleTogglePrivacy}
            title={
              isShared
                ? 'Click to lock note and make it private to you'
                : 'Click to unlock note and share comments with all team coaches'
            }
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition cursor-pointer active:scale-95 ${
              isShared
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 shadow-2xs'
            }`}
          >
            {isShared ? (
              <>
                <Unlock className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Shared with Team Coaches</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-amber-700 shrink-0" />
                <span>Private to {currentCoach.name}</span>
              </>
            )}
          </button>

          {/* Autosave Indicator */}
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
        placeholder={
          isShared
            ? 'Type coaching observations visible to all team coaches...'
            : `Type private scouting observations, mechanics notes, velocity feedback, or cues for ${currentCoach.name}...`
        }
        rows={3}
        className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 resize-none transition"
      />

      <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
        <span className="flex items-center gap-1">
          {isShared ? (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <Users className="w-3 h-3" /> Unlocked — Visible to all co-coaches on this team.
            </span>
          ) : (
            <span className="text-amber-700 font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked — Private to {currentCoach.name}. Tap badge to share.
            </span>
          )}
        </span>
      </div>
    </div>
  );
};
