import React, { useState, useEffect, useRef } from 'react';
import { Coach, PitcherSession } from '../../../types';
import { Lock, Unlock, CheckCircle2, FileText, Users, Camera } from 'lucide-react';
import {
  CoachNotePhoto,
  parseCoachNote,
  serializeCoachNote,
  createCoachNotePhotoFromFile,
} from '../../events/utils/coachNotesUtils';
import { CoachNotePhotoGallery } from '../../events/components/CoachNotePhotoGallery';

interface SessionNotesProps {
  sessionId?: string;
  session?: PitcherSession | null;
  currentCoach?: Coach | null;
  initialNotes?: string;
  onSaveNotes?: ((notes: string) => void) | ((sessionId: string, coachId: string, notes: string) => void);
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

  const parsedInitial = parseCoachNote(initialNotes);

  const [notes, setNotes] = useState(parsedInitial.text);
  const [isShared, setIsShared] = useState(parsedInitial.isShared);
  const [photos, setPhotos] = useState<CoachNotePhoto[]>(parsedInitial.photos);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [showPhotoUploader, setShowPhotoUploader] = useState(parsedInitial.photos.length > 0);

  const timerRef = useRef<number | null>(null);
  const notesRef = useRef(parsedInitial.text);
  const isSharedRef = useRef(parsedInitial.isShared);
  const photosRef = useRef<CoachNotePhoto[]>(parsedInitial.photos);
  const isDirtyRef = useRef(false);

  notesRef.current = notes;
  isSharedRef.current = isShared;
  photosRef.current = photos;

  // Sync when initialNotes changes from external switch or session change
  useEffect(() => {
    const updated = parseCoachNote(initialNotes);
    setNotes(updated.text);
    notesRef.current = updated.text;
    setIsShared(updated.isShared);
    isSharedRef.current = updated.isShared;
    setPhotos(updated.photos);
    photosRef.current = updated.photos;
    if (updated.photos.length > 0) {
      setShowPhotoUploader(true);
    }
    setSaveStatus('saved');
    isDirtyRef.current = false;
  }, [sessionId, initialNotes]);

  const executeSave = (text: string, shared: boolean, currentPhotos: CoachNotePhoto[]) => {
    if (!onSaveNotes) return;
    const formattedNote = serializeCoachNote({
      text,
      isShared: shared,
      photos: currentPhotos,
    });
    if (onSaveNotes.length >= 3) {
      (onSaveNotes as (sid: string, cid: string, n: string) => void)(sessionId, coachId, formattedNote);
    } else {
      (onSaveNotes as (n: string) => void)(formattedNote);
    }
    setSaveStatus('saved');
    isDirtyRef.current = false;
  };

  // Immediate flush on unmount if any edits were pending
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        executeSave(notesRef.current, isSharedRef.current, photosRef.current);
      }
    };
  }, [sessionId, coachId]);

  const triggerSave = (text: string, shared: boolean, currentPhotos: CoachNotePhoto[]) => {
    setSaveStatus('saving');
    isDirtyRef.current = true;

    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      executeSave(text, shared, currentPhotos);
      timerRef.current = null;
    }, 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNotes(text);
    triggerSave(text, isShared, photos);
  };

  const handleBlur = () => {
    if (isDirtyRef.current) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      executeSave(notesRef.current, isSharedRef.current, photosRef.current);
    }
  };

  const handleTogglePrivacy = () => {
    const nextShared = !isShared;
    setIsShared(nextShared);
    isSharedRef.current = nextShared;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    executeSave(notes, nextShared, photos);
  };

  const handlePhotosChange = (newPhotos: CoachNotePhoto[]) => {
    setPhotos(newPhotos);
    photosRef.current = newPhotos;
    executeSave(notes, isShared, newPhotos);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const newPhoto = await createCoachNotePhotoFromFile(file, 'Live session photo');
            const updated = [...photos, newPhoto];
            setShowPhotoUploader(true);
            handlePhotosChange(updated);
          } catch (err) {
            console.error('Failed to paste photo:', err);
          }
        }
      }
    }
  };

  const coachDisplayName = currentCoach?.name || 'Coach';

  return (
    <div
      id="session-notes-box"
      className="w-full bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2.5"
      onPaste={handlePaste}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
            Coaching Notes &amp; Reference Photos
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {/* Photos toggle button */}
          <button
            type="button"
            onClick={() => setShowPhotoUploader((v) => !v)}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition cursor-pointer ${
              showPhotoUploader || photos.length > 0
                ? 'bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title="Attach or manage reference photos"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Photos {photos.length > 0 ? `(${photos.length})` : ''}</span>
          </button>

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
                <span>Private to {coachDisplayName}</span>
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
        onBlur={handleBlur}
        placeholder={
          isShared
            ? 'Type coaching observations visible to all team coaches (paste or attach reference photos)...'
            : `Type private scouting observations, mechanics notes, velocity feedback, or cues for ${coachDisplayName}...`
        }
        rows={3}
        className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 resize-none transition"
      />

      {/* Reference photos gallery */}
      {(showPhotoUploader || photos.length > 0) && (
        <div className="pt-1 border-t border-slate-100">
          <CoachNotePhotoGallery
            photos={photos}
            isEditing={true}
            onPhotosChange={handlePhotosChange}
            authorName={coachDisplayName}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
        <span className="flex items-center gap-1">
          {isShared ? (
            <span className="text-emerald-700 font-medium flex items-center gap-1">
              <Users className="w-3 h-3" /> Unlocked — Visible to all co-coaches on this team.
            </span>
          ) : (
            <span className="text-amber-700 font-medium flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked — Private to {coachDisplayName}. Tap badge to share.
            </span>
          )}
        </span>
      </div>
    </div>
  );
};
