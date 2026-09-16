import React, { useState } from 'react';
import { BaseballEvent, Player, Pitch, Team } from '../types';
import { calculateGamePitchingMetrics, getSessionsForEvent, getAllCoaches, getCurrentCoach } from '../storage';
import { PitchSmartBadge } from './PitchSmartBadge';
import { StrikeZoneHeatmap } from './StrikeZoneHeatmap';
import {
  Trophy,
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  RotateCcw,
  Award,
  Trash2,
  ChevronDown,
  ChevronUp,
  Target,
  Flame,
  ShieldCheck,
  MessageSquare,
  Lock,
  Globe,
  Save,
  PlusCircle,
  FileText,
  Edit2,
} from 'lucide-react';

interface EventReviewSummaryProps {
  event: BaseballEvent;
  team: Team;
  players: Player[];
  allEventPitches: Pitch[];
  onBackToEvents: () => void;
  onReopenEvent: () => void;
  onDeleteEvent?: () => void;
  onSaveNotes: (sessionId: string, coachId: string, notes: string) => void;
}

interface PitcherNotesEditorProps {
  sessionId: string;
  coachId: string;
  initialNote: string;
  onSaveNotes: (sessionId: string, coachId: string, notes: string) => void;
}

const PitcherNotesEditor: React.FC<PitcherNotesEditorProps> = ({
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
  React.useEffect(() => {
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
    if (window.confirm('Are you sure you want to delete your comment?')) {
      onSaveNotes(sessionId, coachId, '');
      setText('');
      setIsEditing(false);
    }
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
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              onClick={handleDelete}
              className="px-2 py-1 text-[11px] font-bold rounded bg-rose-50 hover:bg-rose-100 text-rose-700 transition border border-rose-200"
              title="Delete Comment"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {!cleanText && !isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className="w-full py-4 text-center border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl text-xs font-bold text-slate-500 hover:text-emerald-800 transition flex items-center justify-center gap-1.5"
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
                    className="px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-slate-250 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-1.5 text-xs font-black rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-3xs flex items-center gap-1"
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

export const EventReviewSummary: React.FC<EventReviewSummaryProps> = ({
  event,
  team,
  players,
  allEventPitches,
  onBackToEvents,
  onReopenEvent,
  onDeleteEvent,
  onSaveNotes,
}) => {
  const [expandedPitcherId, setExpandedPitcherId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Group pitches by pitcher
  const pitcherStatsMap = new Map<
    string,
    {
      pitcher: Player;
      pitchesThrown: number;
      balls: number;
      strikes: number;
      pitches: Pitch[];
    }
  >();

  allEventPitches.forEach((p) => {
    let stat = pitcherStatsMap.get(p.pitcherId);
    if (!stat) {
      const pitcher = players.find((pl) => pl.id === p.pitcherId) || {
        id: p.pitcherId,
        name: 'Unknown Pitcher',
        jerseyNumber: '?',
        teamId: team.id,
        seasonAge: 11,
        createdAt: new Date().toISOString(),
      };
      stat = {
        pitcher,
        pitchesThrown: 0,
        balls: 0,
        strikes: 0,
        pitches: [],
      };
      pitcherStatsMap.set(p.pitcherId, stat);
    }

    stat.pitches.push(p);
    stat.pitchesThrown += 1;
    if (p.outcome === 'ball') {
      stat.balls += 1;
    } else {
      // Strike, foul, in-play count as strikes
      stat.strikes += 1;
    }
  });

  const pitchersList = Array.from(pitcherStatsMap.values());

  const totalEventPitches = allEventPitches.length;
  const formattedDate = new Date(event.scheduledAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div id="event-review-summary" className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToEvents}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {team.name}</span>
        </button>

        <div className="flex items-center gap-2">
          {onDeleteEvent && (
            <button
              type="button"
              id="delete-event-review-btn"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition"
              title="Delete event"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Delete Event</span>
            </button>
          )}

          <button
            type="button"
            id="reopen-event-btn"
            onClick={onReopenEvent}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resume / Reopen Event</span>
          </button>
        </div>
      </div>

      {/* Event Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white">
                {event.type === 'game' ? 'Game Summary' : 'Bullpen Session Summary'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Completed
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {event.type === 'game'
                ? event.opponent
                  ? `${team.name} vs ${event.opponent}`
                  : `${team.name} Game`
                : `${team.name} Bullpen Session`}
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-slate-500 mt-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{formattedDate}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center gap-4 shrink-0">
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Pitches</div>
              <div className="text-xl font-black text-slate-900">{totalEventPitches}</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Pitchers Used</div>
              <div className="text-xl font-black text-slate-900">{pitchersList.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pitchers Review & Scouting Analysis */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-800">
              Pitcher Performance &amp; Heatmaps
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            USA Baseball Pitch Smart &bull; Arsenal Analysis
          </span>
        </div>

        {pitchersList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No pitches were recorded during this event.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {pitchersList.map(({ pitcher, pitchesThrown, balls, strikes, pitches }) => {
              const strikePercent =
                pitchesThrown > 0 ? Math.round((strikes / pitchesThrown) * 100) : 0;
              const isExpanded = expandedPitcherId === pitcher.id;
              const gameMetrics = calculateGamePitchingMetrics(pitches);

              return (
                <div
                  key={pitcher.id}
                  id={`pitcher-summary-${pitcher.id}`}
                  className="divide-y divide-slate-100"
                >
                  {/* Pitcher Row */}
                  <div
                    onClick={() => setExpandedPitcherId(isExpanded ? null : pitcher.id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition cursor-pointer"
                  >
                    {/* Pitcher Identity */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {pitcher.imageUrl ? (
                          <img
                            src={pitcher.imageUrl}
                            alt={pitcher.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 shadow-xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center font-black text-slate-600 text-lg">
                            #{pitcher.jerseyNumber}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white font-bold text-[10px] px-1.5 rounded-full border border-white">
                          #{pitcher.jerseyNumber}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-slate-900">{pitcher.name}</h4>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                            {pitcher.throws || 'R'}HP
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{strikePercent}% Strike Rate</span>
                          <span>&bull;</span>
                          <span>{pitchesThrown} Pitches</span>
                          {event.type === 'game' && (
                            <>
                              <span>&bull;</span>
                              <span className="font-semibold text-slate-700">
                                {gameMetrics.inningsPitched} IP, {gameMetrics.strikeouts} K, {gameMetrics.walks} BB
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right side: Pitch Smart Badge, Counts & Expand Toggle */}
                    <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                      {/* Pitch Smart Safety Badge */}
                      <PitchSmartBadge
                        pitchCount={pitchesThrown}
                        seasonAge={pitcher.seasonAge || 11}
                      />

                      {/* Game Line or Bullpen Counts */}
                      {event.type === 'game' ? (
                        <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-slate-400">IP</div>
                            <div className="font-mono font-bold text-slate-900">{gameMetrics.inningsPitched}</div>
                          </div>
                          <div className="h-5 w-px bg-slate-200" />
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-cyan-600">K-BB</div>
                            <div className="font-mono font-bold text-cyan-700">
                              {gameMetrics.strikeouts}-{gameMetrics.walks}
                            </div>
                          </div>
                          <div className="h-5 w-px bg-slate-200" />
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-emerald-600">FPS%</div>
                            <div className="font-mono font-bold text-emerald-600">
                              {gameMetrics.fpsRate}%
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Total</div>
                            <div className="font-mono font-bold text-slate-900">{pitchesThrown}</div>
                          </div>
                          <div className="h-5 w-px bg-slate-200" />
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-amber-600">Balls</div>
                            <div className="font-mono font-bold text-amber-600">{balls}</div>
                          </div>
                          <div className="h-5 w-px bg-slate-200" />
                          <div className="text-center">
                            <div className="text-[10px] uppercase font-bold text-emerald-600">Strikes</div>
                            <div className="font-mono font-bold text-emerald-600">{strikes}</div>
                          </div>
                        </div>
                      )}

                      {/* Toggle Heatmap Button */}
                      <button
                        type="button"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition flex items-center gap-1 text-xs font-semibold"
                      >
                        <Target className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">{isExpanded ? 'Hide Map' : 'Heatmap'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Scouting Analysis & Strike Zone Heatmap */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 bg-slate-50/50 space-y-5">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Target className="w-4 h-4 text-emerald-600" />
                          <span>{pitcher.name}'s Event Strike Zone &amp; Arsenal Heatmap</span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Interactive breakdown of pitch locations, outcomes, and arsenal mix for this event.
                        </p>
                      </div>

                      <StrikeZoneHeatmap
                        pitches={pitches}
                        title={`${pitcher.name} (#${pitcher.jerseyNumber}) Event Summary`}
                      />

                      {(() => {
                        const eventSessions = getSessionsForEvent(event.id);
                        const pitcherSessions = eventSessions.filter((s) => s.pitcherId === pitcher.id);
                        const allCoaches = getAllCoaches();
                        const currentCoach = getCurrentCoach();

                        // Notes from other coaches (must be [SHARED])
                        const coCoachNotes = pitcherSessions.flatMap((session) => {
                          return Object.entries(session.coachNotes || {}).map(([coachId, note]) => {
                            if (currentCoach && coachId === currentCoach.id) return null;
                            const author = allCoaches.find((c) => c.id === coachId);
                            const isShared = typeof note === 'string' && note.startsWith('[SHARED]');
                            const cleanText = typeof note === 'string' ? note.replace(/^\[SHARED\]\s*/, '') : '';
                            
                            return {
                              coachId,
                              authorName: author?.name || 'Co-Coach',
                              noteText: cleanText,
                              isShared,
                              isValid: cleanText.trim().length > 0,
                            };
                          }).filter((n): n is NonNullable<typeof n> => n !== null && n.isValid && n.isShared);
                        });

                        const targetSession = pitcherSessions[0];
                        const currentCoachId = currentCoach?.id;
                        const initialCoachNote = (targetSession && currentCoachId && targetSession.coachNotes?.[currentCoachId]) || '';

                        return (
                          <div className="pt-5 border-t border-slate-200 space-y-4">
                            <div className="mb-1">
                              <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-emerald-600" />
                                <span>Coaches' Observations &amp; Session Notes</span>
                              </h5>
                              <p className="text-xs text-slate-500">
                                Scouting comments, delivery feedback, and pitch strategy shared between coaches or kept private.
                              </p>
                            </div>

                            {/* Other coaches' comments */}
                            {coCoachNotes.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                  Co-Coaches' Shared Observations
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {coCoachNotes.map((n, index) => (
                                    <div
                                      key={`${n.coachId}-${index}`}
                                      className="p-3.5 rounded-xl border border-emerald-200/60 bg-emerald-50/50 text-emerald-950 text-xs shadow-3xs space-y-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-black text-slate-900">{n.authorName}</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                          Shared Comment
                                        </span>
                                      </div>
                                      <p className="leading-relaxed font-medium">
                                        {n.noteText}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Self-observations editor */}
                            {targetSession && currentCoachId ? (
                              <PitcherNotesEditor
                                sessionId={targetSession.id}
                                coachId={currentCoachId}
                                initialNote={initialCoachNote}
                                onSaveNotes={onSaveNotes}
                              />
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                Note taking is only available for active or logged pitcher sessions.
                              </p>
                            )}

                            {coCoachNotes.length === 0 && !initialCoachNote && (
                              <div className="bg-slate-100/50 rounded-xl p-4 text-center text-xs text-slate-400 italic border border-slate-200">
                                No shared co-coach observations logged for this pitcher in this event yet.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Safety & Scouting Note */}
      <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-4 text-xs text-slate-600 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Pitch Smart &amp; Scouting Integration: </span>
          Rest day requirements are determined by official USA Baseball pitch limit thresholds. Tap
          on any pitcher row to inspect their 9-cell strike zone concentration and pitch arsenal distribution.
        </div>
      </div>

      {/* Delete Event Modal */}
      {showDeleteModal && onDeleteEvent && (
        <div
          id="confirm-delete-event-review-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">Delete Event?</h3>
                <p className="text-xs text-slate-500">
                  {event.type === 'game' ? `vs ${event.opponent || 'Game'}` : 'Bullpen'} ({new Date(event.scheduledAt).toLocaleDateString()})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this event and all associated pitch logs and stats?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                id="cancel-delete-event-review-btn"
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-event-review-btn"
                onClick={() => {
                  onDeleteEvent();
                  setShowDeleteModal(false);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
