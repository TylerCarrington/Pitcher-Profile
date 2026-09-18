import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  Team,
} from '../../../types';
import {
  calculateGamePitchingMetrics,
  getEventsForTeam,
  getAllSessions,
  getPitchesForPlayer,
} from '../../../storage';
import { calculateCumulativePitchTotals } from '../../../utils/pitchSmart';
import { LivePitchHeader } from './LivePitchHeader';
import { PitcherPicker } from './PitcherPicker';
import { SessionNotes } from './SessionNotes';
import { CoachesSharedNotes } from './CoachesSharedNotes';
import { FastEntryGuideModal } from './FastEntryGuideModal';
import { EndSessionModal } from './EndSessionModal';
import { EndEventModal } from './EndEventModal';
import { PitchLocationPicker } from '../../pitches/components/PitchLocationPicker';
import { PitchOutcomeButtons } from '../../pitches/components/PitchOutcomeButtons';
import { PitchHistory } from '../../pitches/components/PitchHistory';
import { formatPitchOutcomeDescription } from '../../pitches/utils/pitchFormatters';
import { Info, Undo2 } from 'lucide-react';
import { useEvent } from '../../events/hooks/useEvent';
import { useTeam } from '../../teams/hooks/useTeam';
import { useAuth } from '../../auth/hooks/useAuth';

export interface LiveSessionViewProps {
  event?: BaseballEvent | null;
  activeSession?: PitcherSession | null;
  activePitcher?: Player | null;
  teamPlayers?: Player[];
  currentCoach?: Coach | null;
  sessionPitches?: Pitch[];
  allEventSessions?: PitcherSession[];
  onStartSession?: (pitcherId: string) => void;
  onEndSession?: (sessionId: string) => void;
  onReopenSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onEndEvent?: (eventId: string) => void;
  onRecordPitch?: (params: {
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
  onUpdatePitch?: (pitchUpdate: Partial<Pitch> & { id: string; sessionId: string }) => void;
  onDeletePitch?: (pitchId: string, sessionId: string) => void;
  onUndoPitch?: (sessionId?: string) => void;
  onSaveNotes?: (sessionId: string, coachId: string, notes: string) => void;
  onBackToTeam?: () => void;
  onUpdateOuts?: (outs: number) => void;
  onEndInning?: () => void;
  team?: Team | null;
}

export const LiveSessionView: React.FC<LiveSessionViewProps> = (props) => {
  const eventCtx = useEvent();
  const teamCtx = useTeam();
  const authCtx = useAuth();

  const event = props.event !== undefined ? props.event : eventCtx.selectedEvent;
  const activeSession = props.activeSession !== undefined ? props.activeSession : eventCtx.activeSession;
  const activePitcher = props.activePitcher !== undefined ? props.activePitcher : eventCtx.activePitcher;
  const teamPlayers = props.teamPlayers ?? teamCtx.teamPlayers;
  const currentCoach = props.currentCoach ?? authCtx.currentCoach;
  const sessionPitches = props.sessionPitches ?? eventCtx.sessionPitches;
  const allEventSessions = props.allEventSessions ?? eventCtx.allEventSessions;
  const onStartSession = props.onStartSession ?? eventCtx.startSession;
  const onEndSession = props.onEndSession ?? eventCtx.endSession;
  const onReopenSession = props.onReopenSession ?? eventCtx.reopenSession;
  const onDeleteSession = props.onDeleteSession ?? eventCtx.deleteSession;
  const onEndEvent = props.onEndEvent ?? eventCtx.endEvent;
  const onRecordPitch = props.onRecordPitch ?? eventCtx.recordPitch;
  const onUpdatePitch = props.onUpdatePitch ?? eventCtx.updatePitch;
  const onDeletePitch = props.onDeletePitch ?? eventCtx.deletePitch;
  const onUndoPitch = props.onUndoPitch ?? eventCtx.undoPitch;
  const onSaveNotes = props.onSaveNotes ?? eventCtx.saveNotes;
  const onBackToTeam = props.onBackToTeam ?? (() => eventCtx.selectEvent(null));
  const onUpdateOuts = props.onUpdateOuts ?? eventCtx.updateOuts;
  const onEndInning = props.onEndInning ?? eventCtx.endInning;
  const team = props.team !== undefined ? props.team : teamCtx.selectedTeam;

  const [pendingLocation, setPendingLocation] = useState<PitchLocation | null>(null);
  const [pendingStrike, setPendingStrike] = useState(false);
  const [strikeSourceLocation, setStrikeSourceLocation] = useState<PitchLocation | null>(null);
  const [selectedPitchType, setSelectedPitchType] = useState<PitchType>('fastball');
  const [autoLogNotice, setAutoLogNotice] = useState<string | null>(null);
  const isAutoLoggingRef = useRef(false);

  // Derive the latest pitch in this active session
  const latestPitch = sessionPitches.length > 0 ? sessionPitches[sessionPitches.length - 1] : null;

  // Revert/Undo the most recent pitch in the session
  const handleUndoPreviousPitch = useCallback(() => {
    if (!activeSession || sessionPitches.length === 0) return;
    const lastPitch = sessionPitches[sessionPitches.length - 1];
    if (!lastPitch) return;

    if (onUndoPitch) {
      onUndoPitch(activeSession.id);
    } else {
      onDeletePitch(lastPitch.id, lastPitch.sessionId || activeSession.id);
    }

    setPendingLocation(null);
    setPendingStrike(false);
    setStrikeSourceLocation(null);

    const outcomeDesc = formatPitchOutcomeDescription(lastPitch);
    setAutoLogNotice(
      `Undid Pitch #${lastPitch.pitchNumber} (${outcomeDesc}) • Count restored to ${lastPitch.ballsBefore}-${lastPitch.strikesBefore}`
    );
    setTimeout(() => {
      setAutoLogNotice((prev) =>
        prev?.startsWith(`Undid Pitch #${lastPitch.pitchNumber}`) ? null : prev
      );
    }, 3500);
  }, [activeSession, sessionPitches, onUndoPitch, onDeletePitch]);

  // Global Keyboard Shortcuts (Cmd+Z / Ctrl+Z / Key U) to quickly undo the last recorded pitch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const isUndoCombo =
        (e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z');
      const isKeyU = !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'u' || e.key === 'U');

      if (isUndoCombo || isKeyU) {
        if (activeSession && sessionPitches.length > 0) {
          e.preventDefault();
          handleUndoPreviousPitch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSession, sessionPitches.length, handleUndoPreviousPitch]);

  // Compute multi-day & rolling cumulative totals for active pitcher
  const cumulativeTotals = useMemo(() => {
    if (!event || !activePitcher || !event.teamId) return undefined;
    const teamEvents = getEventsForTeam(event.teamId);
    const sessions = getAllSessions();
    const pitches = getPitchesForPlayer(activePitcher.id);
    return calculateCumulativePitchTotals({
      playerId: activePitcher.id,
      teamId: event.teamId,
      targetEventDate: event.scheduledAt,
      currentEventId: event.id,
      currentSessionId: activeSession?.id,
      livePitchCount: sessionPitches.length,
      events: teamEvents,
      sessions,
      pitches,
    });
  }, [activePitcher, event, activeSession?.id, sessionPitches.length]);

  const [showPitcherPicker, setShowPitcherPicker] = useState(!activeSession || !activePitcher);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [showEndEventConfirm, setShowEndEventConfirm] = useState(false);
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
    if (activeSession && activeSession.status === 'active' && activePitcher) {
      setShowPitcherPicker(false);
    } else {
      setShowPitcherPicker(true);
    }
  }, [activeSession?.id, activePitcher?.id, activeSession?.status]);

  // Derive current count from latest pitch
  const currentBalls = latestPitch ? latestPitch.ballsAfter : 0;
  const currentStrikes = latestPitch ? latestPitch.strikesAfter : 0;
  const currentPitchCount = sessionPitches.length;

  const gameMetrics = useMemo(() => {
    return calculateGamePitchingMetrics(sessionPitches);
  }, [sessionPitches]);

  if (!event || !currentCoach) return null;

  // Render PitcherPicker as its own standalone view/page when no active session or when requested via Exit View / End Session
  if (showPitcherPicker || !activeSession || !activePitcher) {
    return (
      <div className="min-h-screen bg-slate-100/70 text-slate-900 py-6 px-4">
        <PitcherPicker
          event={event}
          teamPlayers={teamPlayers}
          allEventSessions={allEventSessions}
          activePitcher={activePitcher}
          activeSession={activeSession}
          onStartSession={(pitcherId) => {
            onStartSession(pitcherId);
            setShowPitcherPicker(false);
          }}
          onEndSession={onEndSession}
          onReopenSession={(sessionId) => {
            onReopenSession(sessionId);
            setShowPitcherPicker(false);
          }}
          onDeleteSession={onDeleteSession}
          onBackToTeam={onBackToTeam}
          onEndEvent={() => setShowEndEventConfirm(true)}
          onClosePicker={() => {
            if (activeSession && activePitcher) {
              setShowPitcherPicker(false);
            }
          }}
        />

        {/* Confirm End Event Modal */}
        <EndEventModal
          isOpen={showEndEventConfirm}
          event={event}
          onConfirm={() => {
            if (activeSession) {
              onEndSession(activeSession.id);
            }
            onEndEvent(event.id);
            setShowEndEventConfirm(false);
          }}
          onClose={() => setShowEndEventConfirm(false)}
        />
      </div>
    );
  }

  const handlePendingStrikeChange = (isPending: boolean) => {
    setPendingStrike(isPending);
    if (isPending) {
      setStrikeSourceLocation(pendingLocation);
    } else {
      setStrikeSourceLocation(null);
    }
  };

  const handleLocationChange = (newLocation: PitchLocation | null) => {
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

      setPendingStrike(false);
      setStrikeSourceLocation(null);
      setPendingLocation(newLocation);

      setTimeout(() => {
        isAutoLoggingRef.current = false;
      }, 150);
      return;
    }

    setPendingLocation(newLocation);
  };

  const handleRecordPitchFromButtons = (
    outcome: PitchOutcome,
    strikeDetail?: StrikeSubDetail,
    inPlayDetail?: InPlaySubDetail,
  ) => {
    if (!activeSession || !activePitcher) return;
    onRecordPitch({
      sessionId: activeSession.id,
      eventId: event.id,
      pitcherId: activePitcher.id,
      outcome,
      pitchType: selectedPitchType,
      strikeDetail,
      inPlayDetail,
      location: pendingLocation,
      recordedBy: currentCoach.id,
    });
    setPendingLocation(null);
    setPendingStrike(false);
    setStrikeSourceLocation(null);
  };

  return (
    <div id="active-live-session" className="min-h-screen pb-16 bg-slate-100/70">
      {/* Auto-Log / Undo Visual Notification Banner */}
      {autoLogNotice && (
        <div
          id="live-session-action-notice"
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white font-bold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-3 border ${
            autoLogNotice.startsWith('Undid')
              ? 'bg-amber-600 border-amber-400/50 shadow-amber-900/20'
              : 'bg-emerald-600 border-emerald-400/50 shadow-emerald-900/20'
          }`}
        >
          {autoLogNotice.startsWith('Undid') ? (
            <Undo2 className="w-3.5 h-3.5 text-amber-100 shrink-0" />
          ) : (
            <span>⚡</span>
          )}
          <span>{autoLogNotice}</span>
        </div>
      )}

      {/* Header with Scoreboard, Pitcher Info, and Limits */}
      <LivePitchHeader
        event={event}
        pitcher={activePitcher}
        activePitcher={activePitcher}
        pitchCount={currentPitchCount}
        currentPitchCount={currentPitchCount}
        balls={currentBalls}
        currentBalls={currentBalls}
        strikes={currentStrikes}
        currentStrikes={currentStrikes}
        totalBalls={gameMetrics.totalBalls}
        totalStrikes={gameMetrics.totalStrikes}
        currentInning={event.currentInning || 1}
        currentOuts={event.currentOuts || 0}
        battersFaced={gameMetrics.battersFaced}
        inningsPitched={gameMetrics.inningsPitched}
        strikeouts={gameMetrics.strikeouts}
        walks={gameMetrics.walks}
        firstPitchStrikes={gameMetrics.firstPitchStrikes}
        firstPitchTotal={gameMetrics.firstPitchTotal}
        presetId={team?.pitchRulePresetId}
        teamPresetId={team?.pitchRulePresetId}
        cumulativeTotals={cumulativeTotals}
        teamPlayers={teamPlayers}
        allEventSessions={allEventSessions}
        lastPitch={latestPitch}
        onUndoPitch={sessionPitches.length > 0 ? handleUndoPreviousPitch : undefined}
        onStartSession={onStartSession}
        onBackToTeam={onBackToTeam}
        onChangePitcher={() => setShowPitcherPicker(true)}
        onEndSession={() => setShowEndSessionConfirm(true)}
        onEndEvent={() => setShowEndEventConfirm(true)}
        onOpenGuide={() => setShowFastEntryModal(true)}
        onUpdateOuts={onUpdateOuts}
        onEndInning={onEndInning}
      />

      <main className="max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-4 space-y-3 sm:space-y-5">
        {/* Secondary Status Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Live Recording</span>
            <span>•</span>
            <span className="capitalize">
              {event?.type === 'game' ? 'Game Mode' : 'Bullpen Mode'}
            </span>
            <button
              type="button"
              id="fast-entry-info-top-btn"
              onClick={() => setShowFastEntryModal(true)}
              className="p-1 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
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
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1 cursor-pointer"
          >
            Change / Switch Pitcher
          </button>
        </div>

        {/* White Rounded Card for Location Grid (Left) + Outcome Buttons (Right) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 max-w-3xl mx-auto">
            {/* Location Grid First */}
            <div className="flex flex-col items-center shrink-0">
              <PitchLocationPicker
                location={pendingLocation}
                onChange={handleLocationChange}
                size={isMobile ? 240 : 300}
                isMobile={isMobile}
              />
            </div>

            {/* Outcome Buttons Second */}
            <PitchOutcomeButtons
              eventType={event.type === 'game' ? 'game' : 'bullpen'}
              pendingLocation={pendingLocation}
              pendingStrike={pendingStrike}
              strikeSourceLocation={strikeSourceLocation}
              selectedPitchType={selectedPitchType}
              autoLogNotice={autoLogNotice}
              lastPitch={latestPitch}
              onUndoPitch={sessionPitches.length > 0 ? handleUndoPreviousPitch : undefined}
              onRecordPitch={handleRecordPitchFromButtons}
              onPendingStrikeChange={handlePendingStrikeChange}
              onPitchTypeChange={setSelectedPitchType}
              onOpenFastEntryModal={() => setShowFastEntryModal(true)}
            />
          </div>
        </div>

        {/* Real-time Session Notes */}
        {activeSession && (
          <SessionNotes
            session={activeSession}
            currentCoach={currentCoach}
            onSaveNotes={onSaveNotes}
          />
        )}

        {/* Shared Coaching Staff Notes */}
        {activeSession && (
          <CoachesSharedNotes
            session={activeSession}
            currentCoachId={currentCoach.id}
          />
        )}

        {/* Pitch History List */}
        <PitchHistory
          pitches={sessionPitches}
          eventType={event.type === 'game' ? 'game' : 'bullpen'}
          activePitcher={activePitcher}
          onUpdatePitch={onUpdatePitch}
          onDeletePitch={onDeletePitch}
          onUndoPitch={sessionPitches.length > 0 ? handleUndoPreviousPitch : undefined}
          gameMetrics={gameMetrics}
        />
      </main>

      {/* Confirm End Session Modal */}
      <EndSessionModal
        isOpen={showEndSessionConfirm}
        pitcher={activePitcher}
        pitchCount={sessionPitches.length}
        onConfirm={() => {
          if (activeSession) {
            onEndSession(activeSession.id);
          }
          setShowEndSessionConfirm(false);
          setShowPitcherPicker(true);
        }}
        onClose={() => setShowEndSessionConfirm(false)}
      />

      {/* Confirm End Event Modal */}
      <EndEventModal
        isOpen={showEndEventConfirm}
        event={event}
        onConfirm={() => {
          if (activeSession) {
            onEndSession(activeSession.id);
          }
          onEndEvent(event.id);
          setShowEndEventConfirm(false);
        }}
        onClose={() => setShowEndEventConfirm(false)}
      />

      {/* Fast Entry Keyboard / Shortcut Guide Modal */}
      <FastEntryGuideModal
        isOpen={showFastEntryModal}
        onClose={() => setShowFastEntryModal(false)}
      />
    </div>
  );
};
