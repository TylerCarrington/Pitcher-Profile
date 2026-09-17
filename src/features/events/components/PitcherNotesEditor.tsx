import React, { useState, useEffect } from 'react';
import { FileText, Edit2, Trash2, PlusCircle, Lock, Globe, Save } from 'lucide-react';

export interface PitcherNotesEditorProps {
  sessionId: string;
  coachId: string;
  initialNote: string;
  onSaveNotes: (sessionId: string, coachId: string, notes: string) => void;
}

export const PitcherNotesEditor: React.FC<PitcherNotesEditorProps> = ({
  sessionId,
  coachId,
  initialNote,
  onSaveNotes,
}) => {
  const isShared = initialNote.startsWith('[SHARED]');
  const cleanText = initialNote.replace(/^\[SHARED\]\s*/, '');

  const [text, setText] = useState(cleanText);
  const [shareStatus, setShareStatus] = useState<'private' | 'shared'>(
    isShared ? 'shared' : 'private'
  );
  const [isEditing, setIsEditing] = useState(false);

  // Sync if initialNote changes externally
  useEffect(() => {
    setText(initialNote.replace(/^\[SHARED\]\s*/, ''));
    setShareStatus(initialNote.startsWith('[SHARED]') ? 'shared' : 'private');
  }, [initialNote]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onSaveNotes(sessionId, coachId, '');
      setIsEditing(false);
      return;
    }
    const formatted = shareStatus === 'shared' ? `[SHARED] ${trimmed}` : trimmed;
    onSaveNotes(sessionId, coachId, formatted);
    setIsEditing(false);
  };

  const handleDelete = () => {
    // Avoid blocked confirm; simple clear
    onSaveNotes(sessionId, coachId, '');
    setText('');
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-100/60 rounded-xl p-4 border border-slate-200 mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>My Observations</span>
        </span>
        {cleanText && !isEditing && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-2 py-1 text-[11px] font-bold rounded bg-rose-50 hover:bg-rose-100 text-rose-700 transition border border-rose-200 cursor-pointer"
              title="Delete Comment"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {!cleanText && !isEditing ? (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full py-4 text-center border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl text-xs font-bold text-slate-500 hover:text-emerald-800 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-slate-400" />
          <span>Add My Observations for this Session</span>
        </button>
      ) : (
        <div className="space-y-3">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type delivery notes, pitch command feedback, velocity observations, or scouting advice here..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-white font-medium text-slate-800 min-h-[80px]"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                {/* Privacy Toggle Pills */}
                <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg w-fit">
                  <button
                    type="button"
                    onClick={() => setShareStatus('private')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition flex items-center gap-1 ${
                      shareStatus === 'private'
                        ? 'bg-white text-slate-900 shadow-3xs border border-slate-300/40'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span>Private Note</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareStatus('shared')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition flex items-center gap-1 ${
                      shareStatus === 'shared'
                        ? 'bg-white text-slate-900 shadow-3xs border border-slate-300/40'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Globe className="w-3 h-3 text-emerald-500" />
                    <span>Share with Coaches</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setText(cleanText);
                      setShareStatus(isShared ? 'shared' : 'private');
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-1.5 text-xs font-black rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-3xs flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-xs shadow-3xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">You (My Observation)</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                    isShared
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  {isShared ? (
                    <>
                      <Globe className="w-2.5 h-2.5 text-emerald-600" />
                      <span>Shared with Coaches</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-2.5 h-2.5 text-amber-600" />
                      <span>Private to You</span>
                    </>
                  )}
                </span>
              </div>
              <p className="leading-relaxed font-medium text-slate-700">
                {cleanText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
