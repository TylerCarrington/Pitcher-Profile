import React, { useState, useMemo } from 'react';
import {
  BaseballEvent,
  PitcherSession,
  Player,
  Coach,
  Pitch,
  PitchOutcome,
  PitchType,
  StrikeSubDetail,
  InPlaySubDetail,
  PitchLocation,
} from '../types';
import { calculateGamePitchingMetrics } from '../storage';
import { LivePitchHeader } from './LivePitchHeader';
import { StrikeZoneGrid } from './StrikeZoneGrid';
import { PitchOutcomeSelector } from './PitchOutcomeSelector';
import { PitchHistory } from './PitchHistory';
import { SessionNotes } from './SessionNotes';
import {
  User,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Users,
  RotateCcw,
  Trash2,
  History,
} from 'lucide-react';

interface LiveSessionViewProps {
  event: BaseballEvent;
  activeSession: PitcherSession | null;
  activePitcher: Player | null;
  teamPlayers: Player[];
  currentCoach: Coach;
  sessionPitches: Pitch[];
  allEventSessions?: PitcherSession[];
  onStartSession: (pitcherId: string) => void;
  onEndSession: (sessionId: string) => void;
  onReopenSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onEndEvent: (eventId: string) => void;
  onRecordPitch: (params: {
    sessionId: string;
    eventId: string;
    pitcherId: string;
    outcome: PitchOutcome;
    pitchType?: PitchType;
    strikeDetail?: StrikeSubDetail;
    inPlayDetail?: InPlaySubDetail;
    location?: PitchLocation | null;
    recordedBy: string;
  }) => void;
  onUpdatePitch: (pitchUpdate: Partial<Pitch> & { id: string; sessionId: string }) => void;
  onDeletePitch: (pitchId: string, sessionId: string) => void;
  onSaveNotes: (sessionId: string, coachId: string, notes: string) => void;
  onBackToTeam: () => void;
  onUpdateOuts?: (outs: number) => void;
  onEndInning?: () => void;
}

export const LiveSessionView: React.FC<LiveSessionViewProps> = ({
  event,
  activeSession,
  activePitcher,
  teamPlayers,
  currentCoach,
  sessionPitches,
  allEventSessions = [],
  onStartSession,
  onEndSession,
  onReopenSession,
  onDeleteSession,
  onEndEvent,
  onRecordPitch,
  onUpdatePitch,
  onDeletePitch,
  onSaveNotes,
  onBackToTeam,
  onUpdateOuts,
  onEndInning,
}) => {
  const [pendingLocation, setPendingLocation] = useState<PitchLocation | null>(null);
  const [showPitcherPicker, setShowPitcherPicker] = useState(!activeSession || !activePitcher);

  // Derive current count from latest pitch
  const latestPitch = sessionPitches[sessionPitches.length - 1];
  const currentBalls = latestPitch ? latestPitch.ballsAfter : 0;
  const currentStrikes = latestPitch ? latestPitch.strikesAfter : 0;
  const currentPitchCount = sessionPitches.length;

  const gameMetrics = useMemo(() => {
    return calculateGamePitchingMetrics(sessionPitches);
  }, [sessionPitches]);

  const handleRecord = (
    outcome: PitchOutcome,
    strikeDetail?: StrikeSubDetail,
    inPlayDetail?: InPlaySubDetail,
    pitchType?: PitchType,
  ) => {
    if (!activeSession || !activePitcher) return;

    onRecordPitch({
      sessionId: activeSession.id,
      eventId: event.id,
      pitcherId: activePitcher.id,
      outcome,
      pitchType,
      strikeDetail,
      inPlayDetail,
      location: pendingLocation,
      recordedBy: currentCoach.id,
    });

    // Reset location after recording pitch
    setPendingLocation(null);
  };

  // If no active session or user wants to pick/switch pitcher:
  if (!activeSession || !activePitcher || showPitcherPicker) {
    return (
      <div id="pitcher-picker-screen" className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
        <button
          type="button"
          onClick={onBackToTeam}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Live Tracking</span>
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
              {event.type === 'game' ? 'Game In Progress' : 'Bullpen In Progress'}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Select Pitcher for this Session
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Choose who is taking the mound or entering the bullpen. You can switch pitchers
              anytime.
            </p>
          </div>

          {teamPlayers.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">
                No players found in this team roster. Please add players to the roster first.
              </p>
              <button
                type="button"
                onClick={onBackToTeam}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white"
              >
                Go to Roster
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {teamPlayers.map((player) => (
                <button
                  key={player.id}
                  id={`select-pitcher-${player.id}`}
                  type="button"
                  onClick={() => {
                    onStartSession(player.id);
                    setShowPitcherPicker(false);
                  }}
                  className="p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      {player.imageUrl ? (
                        <img
                          src={player.imageUrl}
                          alt={player.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 group-hover:border-emerald-500 transition"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-slate-200 group-hover:border-emerald-500 flex items-center justify-center font-black text-slate-700 text-base">
                          #{player.jerseyNumber}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 bg-slate-900 text-emerald-400 font-bold text-[9px] px-1 rounded-full border border-white">
                        #{player.jerseyNumber}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-800 transition truncate">
                        {player.name}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>{player.throws || 'R'}HP • #{player.jerseyNumber}</span>
                        {player.seasonAge && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                            {player.seasonAge}U
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-500 group-hover:text-white flex items-center justify-center text-slate-400 transition shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* If there was already an active session, let the coach return to it */}
          {activeSession && activePitcher && (
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPitcherPicker(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Return to {activePitcher.name}'s Active Session
              </button>
            </div>
          )}
        </div>

        {/* Existing / Completed Pitching Sessions in this Event */}
        {allEventSessions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Sessions in this Event ({allEventSessions.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Tap Reopen if ended accidentally
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {allEventSessions.map((session) => {
                const pitcher = teamPlayers.find((p) => p.id === session.pitcherId);
                const isCurrentActive = activeSession?.id === session.id;

                return (
                  <div
                    key={session.id}
                    id={`event-session-row-${session.id}`}
                    className="p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200 shrink-0">
                        #{pitcher?.jerseyNumber || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {pitcher?.name || 'Pitcher'}
                          </span>
                          {isCurrentActive ? (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Active
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 text-[10px] font-semibold">
                              Ended
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Started {new Date(session.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrentActive ? (
                        <button
                          type="button"
                          onClick={() => setShowPitcherPicker(false)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Resume Tracking
                        </button>
                      ) : (
                        <>
                          {onReopenSession && (
                            <button
                              type="button"
                              id={`reopen-session-${session.id}`}
                              onClick={() => {
                                onReopenSession(session.id);
                                setShowPitcherPicker(false);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition flex items-center gap-1"
                              title="Reopen ended session"
                            >
                              <RotateCcw className="w-3 h-3 text-emerald-600" />
                              <span>Reopen</span>
                            </button>
                          )}

                          {onDeleteSession && (
                            <button
                              type="button"
                              id={`delete-session-${session.id}`}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Permanently delete ${pitcher?.name || 'this pitcher'}'s session and its recorded pitches?`,
                                  )
                                ) {
                                  onDeleteSession(session.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="active-live-session" className="min-h-screen pb-16 bg-slate-100/70">
      {/* 1. Persistent Top Header */}
      <LivePitchHeader
        pitcher={activePitcher}
        event={event}
        balls={currentBalls}
        strikes={currentStrikes}
        pitchCount={currentPitchCount}
        currentInning={event.currentInning || 1}
        currentOuts={event.currentOuts || 0}
        battersFaced={gameMetrics.battersFaced}
        inningsPitched={gameMetrics.inningsPitched}
        strikeouts={gameMetrics.strikeouts}
        walks={gameMetrics.walks}
        firstPitchStrikes={gameMetrics.firstPitchStrikes}
        firstPitchTotal={gameMetrics.firstPitchTotal}
        onUpdateOuts={onUpdateOuts}
        onEndInning={onEndInning}
        onEndSession={() => {
          if (confirm(`End session for ${activePitcher.name}? Pitch data will remain saved.`)) {
            onEndSession(activeSession.id);
            setShowPitcherPicker(true);
          }
        }}
        onEndEvent={() => {
          if (
            confirm(
              'End the entire event? This will complete all pitching sessions and take you to the event summary.',
            )
          ) {
            onEndEvent(event.id);
          }
        }}
      />

      {/* Main Recording Workspace */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-5">
        {/* Quick Pitcher Switch Strip */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Live Recording</span>
            <span>•</span>
            <span className="capitalize">{event.type} Mode</span>
          </div>

          <button
            type="button"
            id="switch-pitcher-btn"
            onClick={() => setShowPitcherPicker(true)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1"
          >
            Change / Switch Pitcher
          </button>
        </div>

        {/* Live Pitch Location & Outcome Entry Panel (Phone-Optimized Layout) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6">
            {/* Strike Zone Interactive Grid (Touch and Drag with Magnified Loupe) */}
            <div className="flex flex-col items-center">
              <StrikeZoneGrid
                location={pendingLocation}
                onChange={setPendingLocation}
                size={300}
              />
            </div>

            {/* Fast Pitch Outcome Selector Buttons */}
            <div className="w-full max-w-sm flex flex-col justify-between self-stretch space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Flagship Fast Entry</span>
                </div>
                Touch/drag on the grid for pitch location (with magnifying loupe), or tap any
                outcome button directly to record!
              </div>

              {/* Outcome Selector */}
              <div className="pt-1">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Pitch Result
                </div>
                <PitchOutcomeSelector
                  eventType={event.type}
                  currentLocation={pendingLocation}
                  onRecordPitch={handleRecord}
                />
              </div>

              {/* Status Hint */}
              <div className="text-[11px] text-slate-400 text-center">
                Location is optional &bull; Resets automatically after each pitch
              </div>
            </div>
          </div>
        </div>

        {/* 2. Coaching Private Notes (Autosaving per coach) */}
        <SessionNotes
          sessionId={activeSession.id}
          currentCoach={currentCoach}
          initialNotes={activeSession.coachNotes?.[currentCoach.id] || ''}
          onSaveNotes={(notes) => onSaveNotes(activeSession.id, currentCoach.id, notes)}
        />

        {/* 3. Pitch History (Editable and Deletable) */}
        <PitchHistory
          pitches={sessionPitches}
          eventType={event.type}
          onUpdatePitch={onUpdatePitch}
          onDeletePitch={onDeletePitch}
        />
      </main>
    </div>
  );
};
