import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { calculateGamePitchingMetrics, getAllCoaches } from '../storage';
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
  LogOut,
  CheckCircle2,
  Info,
  X,
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
  const [pendingStrike, setPendingStrike] = useState(false);
  const [strikeSourceLocation, setStrikeSourceLocation] = useState<PitchLocation | null>(null);
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType>('fastball');
  const [autoLogNotice, setAutoLogNotice] = useState<string | null>(null);
  const isAutoLoggingRef = useRef(false);

  const [showPitcherPicker, setShowPitcherPicker] = useState(!activeSession || !activePitcher);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [showEndEventConfirm, setShowEndEventConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<PitcherSession | null>(null);
  const [showFastEntryModal, setShowFastEntryModal] = useState(false);

  // Responsive strike zone grid sizing for mobile single-screen fit
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-dismiss the auto-log notification after 2.5s
  useEffect(() => {
    if (!autoLogNotice) return;
    const timer = setTimeout(() => setAutoLogNotice(null), 2500);
    return () => clearTimeout(timer);
  }, [autoLogNotice]);

  // Sync pitcher picker visibility whenever active session/pitcher changes
  useEffect(() => {
    if (activeSession && activePitcher) {
      setShowPitcherPicker(false);
    } else {
      setShowPitcherPicker(true);
    }
  }, [activeSession?.id, activePitcher?.id]);

  // Derive current count from latest pitch
  const latestPitch = sessionPitches[sessionPitches.length - 1];
  const currentBalls = latestPitch ? latestPitch.ballsAfter : 0;
  const currentStrikes = latestPitch ? latestPitch.strikesAfter : 0;
  const currentPitchCount = sessionPitches.length;

  const gameMetrics = useMemo(() => {
    return calculateGamePitchingMetrics(sessionPitches);
  }, [sessionPitches]);

  const handlePendingStrikeChange = (isPending: boolean) => {
    setPendingStrike(isPending);
    if (isPending) {
      // Retain the location that was chosen before clicking Strike
      setStrikeSourceLocation(pendingLocation);
    } else {
      setStrikeSourceLocation(null);
    }
  };

  const handleLocationChange = (newLocation: PitchLocation | null) => {
    // If a location was picked, Strike was clicked, and coach taps a location again without picking sub-detail:
    // Auto-log the strike with the previous location, close the modal, and assign newLocation to the next pitch!
    if (pendingStrike && strikeSourceLocation && newLocation && !isAutoLoggingRef.current) {
      isAutoLoggingRef.current = true;

      if (activeSession && activePitcher) {
        onRecordPitch({
          sessionId: activeSession.id,
          eventId: event.id,
          pitcherId: activePitcher.id,
          outcome: 'strike',
          strikeDetail: 'called',
          pitchType: selectedPitchType,
          location: strikeSourceLocation,
          recordedBy: currentCoach.id,
        });

        setAutoLogNotice(
          `Pitch #${sessionPitches.length + 1} logged as Strike • Next pitch location set`,
        );
      }

      // Close the strike sub-detail modal
      setPendingStrike(false);
      setStrikeSourceLocation(null);

      // Assume the new location is the next pitch
      setPendingLocation(newLocation);

      setTimeout(() => {
        isAutoLoggingRef.current = false;
      }, 150);
      return;
    }

    setPendingLocation(newLocation);
  };

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
      pitchType: pitchType || selectedPitchType,
      strikeDetail,
      inPlayDetail,
      location: pendingLocation,
      recordedBy: currentCoach.id,
    });

    // Reset location and pending strike state after recording pitch
    setPendingLocation(null);
    setPendingStrike(false);
    setStrikeSourceLocation(null);
  };

  // If no active session or user wants to pick/switch pitcher:
  if (!activeSession || !activePitcher || showPitcherPicker) {
    return (
      <div id="pitcher-picker-screen" className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToTeam}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Live Tracking</span>
          </button>

          <button
            type="button"
            id="picker-end-event-btn"
            onClick={() => setShowEndEventConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
            <span>End Entire Event</span>
          </button>
        </div>

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
                              onClick={() => setSessionToDelete(session)}
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

        {/* Delete Session Confirmation Modal (Picker Screen) */}
        {sessionToDelete && onDeleteSession && (
          <div
            id="confirm-delete-session-modal"
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">Delete Pitcher Session?</h3>
                  <p className="text-xs text-slate-400">Permanently remove this session and all pitch logs</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                This action cannot be undone. All pitches recorded during this session will be removed from event stats.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  id="cancel-delete-session-btn"
                  onClick={() => setSessionToDelete(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-session-btn"
                  onClick={() => {
                    onDeleteSession(sessionToDelete.id);
                    setSessionToDelete(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
                >
                  Delete Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* End Entire Event Confirmation Modal (Picker Screen) */}
        {showEndEventConfirm && (
          <div
            id="confirm-end-event-modal"
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          >
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">End Entire Event?</h3>
                  <p className="text-xs text-slate-400 truncate">{event.name} ({event.type === 'game' ? 'Game' : 'Bullpen'})</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                This wraps up tracking for all pitchers and brings you directly to the comprehensive post-event review, pitch count reports, and rest recommendations.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  id="cancel-end-event-btn"
                  onClick={() => setShowEndEventConfirm(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-end-event-btn"
                  onClick={() => {
                    setShowEndEventConfirm(false);
                    onEndEvent(event.id);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
                >
                  End Entire Event
                </button>
              </div>
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
        totalBalls={gameMetrics.balls}
        totalStrikes={gameMetrics.strikes}
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
        onEndSession={() => setShowEndSessionConfirm(true)}
        onEndEvent={() => setShowEndEventConfirm(true)}
      />

      {/* Main Recording Workspace */}
      <main className="max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-4 space-y-3 sm:space-y-5">
        {/* Quick Pitcher Switch Strip */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Live Recording</span>
            <span>•</span>
            <span className="capitalize">{event.type} Mode</span>
            <button
              type="button"
              id="fast-entry-info-top-btn"
              onClick={() => setShowFastEntryModal(true)}
              className="p-1 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
              title="Flagship Fast Entry Guide"
              aria-label="Flagship Fast Entry Guide"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
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

        {/* Live Pitch Location & Outcome Entry Panel (Phone-Optimized Single Screen Layout) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 max-w-3xl mx-auto">
            {/* Strike Zone Interactive Grid (Touch and Drag with Magnified Loupe) */}
            <div className="flex flex-col items-center shrink-0">
              <StrikeZoneGrid
                location={pendingLocation}
                onChange={handleLocationChange}
                size={isMobile ? 240 : 300}
              />
            </div>

            {/* Fast Pitch Outcome Selector Buttons */}
            <div className="w-full max-w-sm flex flex-col justify-center space-y-3 sm:space-y-4">
              {/* Outcome Selector */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Pitch Result
                  </div>
                  <button
                    type="button"
                    id="fast-entry-info-badge-btn"
                    onClick={() => setShowFastEntryModal(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-2 py-0.5 rounded-full transition active:scale-95"
                    title="Flagship Fast Entry guide"
                  >
                    <Info className="w-3 h-3 text-emerald-600" />
                    <span>Fast Entry</span>
                  </button>
                </div>
                <PitchOutcomeSelector
                  eventType={event.type}
                  currentLocation={pendingLocation}
                  onRecordPitch={handleRecord}
                  pendingStrike={pendingStrike}
                  onPendingStrikeChange={handlePendingStrikeChange}
                  selectedPitchType={selectedPitchType}
                  onPitchTypeChange={setSelectedPitchType}
                />
              </div>

              {/* Status Hint & Auto-Log Feedback */}
              {autoLogNotice ? (
                <div
                  id="auto-log-strike-notice"
                  className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xl py-1.5 px-3 text-center flex items-center justify-center gap-2 shadow-xs animate-in fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{autoLogNotice}</span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 text-center transition-colors">
                  {pendingStrike && strikeSourceLocation ? (
                    <span className="text-emerald-600 font-semibold flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>Tap new location on grid to auto-log strike &amp; start next pitch</span>
                    </span>
                  ) : (
                    <span>Location is optional &bull; Resets automatically after each pitch</span>
                  )}
                </div>
              )}
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

        {/* Live Shared Co-Coach Comments */}
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

          {(() => {
            const allCoaches = getAllCoaches();
            const sharedNotes = Object.entries(activeSession.coachNotes || {})
              .filter(([coachId, note]) => {
                if (coachId === currentCoach.id) return false;
                return typeof note === 'string' && note.trim().startsWith('[SHARED]');
              })
              .map(([coachId, note]) => {
                const author = allCoaches.find((c) => c.id === coachId);
                const noteText = String(note || '').replace(/^\[SHARED\]\s*/, '');
                return { coachId, authorName: author?.name || 'Co-Coach', noteText };
              });

            if (sharedNotes.length === 0) {
              return (
                <p className="text-xs text-slate-400 italic">
                  No other coaches have posted shared comments for this session yet. Any notes saved with the unlocked "Shared with Team Coaches" status will appear here instantly in real-time.
                </p>
              );
            }

            return (
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
            );
          })()}
        </div>

        {/* 3. Pitch History (Editable and Deletable) */}
        <PitchHistory
          pitches={sessionPitches}
          eventType={event.type}
          onUpdatePitch={onUpdatePitch}
          onDeletePitch={onDeletePitch}
        />
      </main>

      {/* End Pitcher Session Confirmation Modal */}
      {showEndSessionConfirm && activePitcher && activeSession && (
        <div
          id="confirm-end-session-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">End Pitcher's Session?</h3>
                <p className="text-xs text-slate-400 truncate">{activePitcher.name} &bull; {currentPitchCount} pitches recorded</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              All pitch counts, velocities, and location plots are permanently saved. You will return to select another pitcher or view event totals.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                id="cancel-end-session-btn"
                onClick={() => setShowEndSessionConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-end-session-btn"
                onClick={() => {
                  setShowEndSessionConfirm(false);
                  onEndSession(activeSession.id);
                  setShowPitcherPicker(true);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Entire Event Confirmation Modal */}
      {showEndEventConfirm && (
        <div
          id="confirm-end-event-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">End Entire Event?</h3>
                <p className="text-xs text-slate-400 truncate">{event.name} ({event.type === 'game' ? 'Game' : 'Bullpen'})</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This wraps up tracking for all pitchers and brings you directly to the comprehensive post-event review, pitch count reports, and rest recommendations.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                id="cancel-end-event-btn"
                onClick={() => setShowEndEventConfirm(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-end-event-btn"
                onClick={() => {
                  setShowEndEventConfirm(false);
                  onEndEvent(event.id);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition"
              >
                End Entire Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flagship Fast Entry Info Modal */}
      {showFastEntryModal && (
        <div
          id="fast-entry-info-modal"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowFastEntryModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Flagship Fast Entry</h3>
                  <p className="text-xs text-slate-500">Quick guide for mobile pitch tracking</p>
                </div>
              </div>
              <button
                type="button"
                id="close-fast-entry-modal-btn"
                onClick={() => setShowFastEntryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-slate-700 font-medium">
                Touch/drag on the grid for pitch location (with magnifying loupe), or tap any
                outcome button directly to record!
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800">Magnifying Loupe:</span> When dragging on the strike zone, a magnified sight appears above your finger so your fingertip never obscures your targeting.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800">Fast Strike Auto-Log:</span> Tap Strike, then tap anywhere on the grid to immediately save the pitch and queue the next pitch location in one motion.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800">Direct Outcome Logging:</span> Location is always optional. Tap BALL, STRIKE, FOUL, or IN-PLAY directly for lightning-fast tracking.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                id="dismiss-fast-entry-modal-btn"
                onClick={() => setShowFastEntryModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold text-xs shadow transition active:scale-[0.99]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
