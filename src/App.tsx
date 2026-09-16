import React, { useState, useEffect, useCallback } from 'react';
import {
  Coach,
  Team,
  Player,
  BaseballEvent,
  PitcherSession,
  Pitch,
  PitchOutcome,
  PitchType,
  StrikeSubDetail,
  InPlaySubDetail,
  PitchLocation,
  PitchRulePresetId,
} from './types';
import {
  getCurrentCoach,
  setCurrentCoachId,
  getAllCoaches,
  createCoachAccount,
  getTeamsForCoach,
  getTeamById,
  saveTeam,
  joinTeamByCode,
  deleteTeam,
  regenerateTeamInviteCode,
  removeCoachFromTeam,
  leaveTeam,
  updateTeamPitchPreset,
  getPlayersForTeam,
  getPlayerById,
  savePlayer,
  deletePlayer,
  getEventsForTeam,
  getEventById,
  createEvent,
  endEvent,
  reopenEvent,
  deleteEvent,
  setEventOuts,
  endInningManual,
  getActiveSessionForEvent,
  getSessionsForEvent,
  startPitcherSession,
  endPitcherSession,
  reopenPitcherSession,
  deletePitcherSession,
  updateSessionNotes,
  getPitchesForSession,
  getPitchesForEvent,
  addPitchToSession,
  updatePitch,
  deletePitch,
  subscribeToStore,
} from './storage';
import { TeamManagement } from './components/TeamManagement';
import { EventManagement } from './components/EventManagement';
import { LiveSessionView } from './components/LiveSessionView';
import { EventReviewSummary } from './components/EventReviewSummary';
import { CoachSwitcher } from './components/CoachSwitcher';
import { GoogleSignInScreen } from './components/GoogleSignInScreen';
import { Activity, Users, Calendar, ArrowLeft, Target } from 'lucide-react';

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => {
    return localStorage.getItem('pitch_tracker_signed_in') !== 'false';
  });
  const [currentCoach, setCurrentCoach] = useState<Coach>(getCurrentCoach());
  const [allCoaches, setAllCoaches] = useState<Coach[]>(getAllCoaches());
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'roster'>('events');

  // Event & Session active states
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Join feedback message
  const [joinNotification, setJoinNotification] = useState<string | null>(null);

  // Sync state from storage
  const syncStore = useCallback(() => {
    const coach = getCurrentCoach();
    setCurrentCoach(coach);
    setAllCoaches(getAllCoaches());

    const coachTeams = getTeamsForCoach(coach.id);
    setTeams(coachTeams);

    // Keep selected team valid
    if (coachTeams.length > 0) {
      if (!selectedTeamId || !coachTeams.some((t) => t.id === selectedTeamId)) {
        setSelectedTeamId(coachTeams[0].id);
      }
    } else {
      setSelectedTeamId(null);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    syncStore();
    const unsubscribe = subscribeToStore(syncStore);
    return unsubscribe;
  }, [syncStore]);

  // Handle URL share links on load (e.g. ?join=CODE)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      const coach = getCurrentCoach();
      const res = joinTeamByCode(joinCode, coach.id);
      if (res.success && res.team) {
        setJoinNotification(`You joined ${res.team.name}!`);
        setSelectedTeamId(res.team.id);
        // Clear param without reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        setTimeout(() => setJoinNotification(null), 4000);
      }
    }
  }, []);

  const selectedTeam = selectedTeamId ? getTeamById(selectedTeamId) || null : null;
  const teamPlayers = selectedTeam ? getPlayersForTeam(selectedTeam.id) : [];
  const teamEvents = selectedTeam ? getEventsForTeam(selectedTeam.id) : [];

  // Selected event
  const selectedEvent = selectedEventId ? getEventById(selectedEventId) || null : null;

  // Active session
  const activeSession = selectedEvent
    ? getActiveSessionForEvent(selectedEvent.id) || null
    : null;
  const activePitcher =
    activeSession && activeSession.pitcherId
      ? getPlayerById(activeSession.pitcherId) || null
      : null;

  const sessionPitches = activeSession ? getPitchesForSession(activeSession.id) : [];
  const allEventPitches = selectedEvent ? getPitchesForEvent(selectedEvent.id) : [];
  const allEventSessions = selectedEvent ? getSessionsForEvent(selectedEvent.id) : [];

  // Authentication Handlers
  const handleGoogleSignIn = (profile: { name: string; email: string; avatar?: string }) => {
    const coach = createCoachAccount(profile);
    setCurrentCoachId(coach.id);
    setCurrentCoach(coach);
    setIsSignedIn(true);
    localStorage.setItem('pitch_tracker_signed_in', 'true');
    syncStore();
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    localStorage.setItem('pitch_tracker_signed_in', 'false');
  };

  // Handler for coach switch
  const handleCoachSwitch = (coachId: string) => {
    setCurrentCoachId(coachId);
    const newCoach = getAllCoaches().find((c) => c.id === coachId);
    if (newCoach) setCurrentCoach(newCoach);
  };

  // Handlers for teams
  const handleCreateTeam = (name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => {
    const newTeam = saveTeam({
      name,
      imageUrl,
      createdBy: currentCoach.id,
      pitchRulePresetId: pitchRulePresetId || 'usa_pitch_smart',
    });
    setSelectedTeamId(newTeam.id);
  };

  const handleUpdateTeamPitchPreset = (teamId: string, presetId: PitchRulePresetId) => {
    updateTeamPitchPreset(teamId, presetId);
    syncStore();
  };

  const handleJoinTeam = (codeOrLink: string) => {
    return joinTeamByCode(codeOrLink, currentCoach.id);
  };

  const handleDeleteTeam = (teamId: string) => {
    const res = deleteTeam(teamId, currentCoach.id);
    if (res.success) {
      syncStore();
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleRegenerateInviteLink = (teamId: string) => {
    const updatedTeam = regenerateTeamInviteCode(teamId);
    if (updatedTeam) {
      syncStore();
    }
  };

  const handleRemoveCoach = (teamId: string, coachId: string) => {
    const res = removeCoachFromTeam(teamId, coachId, currentCoach.id);
    if (res.success) {
      syncStore();
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleLeaveTeam = (teamId: string) => {
    const res = leaveTeam(teamId, currentCoach.id);
    if (res.success) {
      syncStore();
    } else if (res.error) {
      alert(res.error);
    }
  };

  // Handlers for players
  const handleSavePlayer = (playerData: {
    id?: string;
    teamId: string;
    name: string;
    jerseyNumber: string;
    imageUrl?: string;
    throws?: 'R' | 'L';
    seasonAge?: number;
  }) => {
    savePlayer(playerData);
    syncStore();
  };

  const handleDeletePlayer = (playerId: string) => {
    deletePlayer(playerId);
    syncStore();
  };

  // Handlers for events
  const handleCreateEvent = (input: {
    teamId: string;
    type: 'game' | 'bullpen';
    opponent?: string;
    location?: string;
    scheduledAt: string;
  }) => {
    const newEv = createEvent({
      ...input,
      createdBy: currentCoach.id,
    });
    setSelectedEventId(newEv.id);
  };

  const handleEndEvent = (eventId: string) => {
    endEvent(eventId);
    syncStore();
  };

  const handleReopenEvent = (eventId: string) => {
    reopenEvent(eventId);
    syncStore();
  };

  const handleDeleteEvent = (eventId: string) => {
    deleteEvent(eventId);
    if (selectedEventId === eventId) {
      setSelectedEventId(null);
    }
    syncStore();
  };

  // Handlers for live pitches & sessions
  const handleStartSession = (pitcherId: string) => {
    if (!selectedEvent) return;
    const session = startPitcherSession(selectedEvent.id, pitcherId);
    setActiveSessionId(session.id);
    syncStore();
  };

  const handleEndSession = (sessionId: string) => {
    endPitcherSession(sessionId);
    setActiveSessionId(null);
    syncStore();
  };

  const handleReopenSession = (sessionId: string) => {
    const session = reopenPitcherSession(sessionId);
    if (session) {
      setActiveSessionId(session.id);
      syncStore();
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    deletePitcherSession(sessionId);
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
    syncStore();
  };

  const handleRecordPitch = (params: {
    sessionId: string;
    eventId: string;
    pitcherId: string;
    outcome: PitchOutcome;
    pitchType?: PitchType;
    strikeDetail?: StrikeSubDetail;
    inPlayDetail?: InPlaySubDetail;
    location?: PitchLocation | null;
    recordedBy: string;
  }) => {
    addPitchToSession(params);
    syncStore();
  };

  const handleUpdatePitch = (
    pitchUpdate: Partial<Pitch> & { id: string; sessionId: string },
  ) => {
    updatePitch(pitchUpdate);
    syncStore();
  };

  const handleDeletePitch = (pitchId: string, sessionId: string) => {
    deletePitch(pitchId, sessionId);
    syncStore();
  };

  const handleSaveNotes = (sessionId: string, coachId: string, notes: string) => {
    updateSessionNotes(sessionId, coachId, notes);
  };

  const handleUpdateOuts = (outs: number) => {
    if (!selectedEvent) return;
    setEventOuts(selectedEvent.id, outs);
    syncStore();
  };

  const handleEndInning = () => {
    if (!selectedEvent) return;
    endInningManual(selectedEvent.id);
    syncStore();
  };

  // 0. If user is signed out, show Mock Google Sign-In Screen
  if (!isSignedIn) {
    return (
      <GoogleSignInScreen
        onSignIn={handleGoogleSignIn}
        availableCoaches={allCoaches}
      />
    );
  }

  // 1. If an event is selected:
  if (selectedEvent) {
    // If event is ended, show Post-Event Summary
    if (selectedEvent.status === 'ended') {
      return (
        <div className="min-h-screen bg-slate-100/80 text-slate-900">
          <EventReviewSummary
            event={selectedEvent}
            team={selectedTeam || teams[0]}
            players={teamPlayers}
            allEventPitches={allEventPitches}
            onBackToEvents={() => setSelectedEventId(null)}
            onReopenEvent={() => handleReopenEvent(selectedEvent.id)}
            onDeleteEvent={() => handleDeleteEvent(selectedEvent.id)}
          />
        </div>
      );
    }

    // Otherwise show active Live Pitch Session View
    return (
      <LiveSessionView
        event={selectedEvent}
        activeSession={activeSession}
        activePitcher={activePitcher}
        teamPlayers={teamPlayers}
        currentCoach={currentCoach}
        sessionPitches={sessionPitches}
        allEventSessions={allEventSessions}
        onStartSession={handleStartSession}
        onEndSession={handleEndSession}
        onReopenSession={handleReopenSession}
        onDeleteSession={handleDeleteSession}
        onEndEvent={handleEndEvent}
        onRecordPitch={handleRecordPitch}
        onUpdatePitch={handleUpdatePitch}
        onDeletePitch={handleDeletePitch}
        onSaveNotes={handleSaveNotes}
        onBackToTeam={() => setSelectedEventId(null)}
        onUpdateOuts={handleUpdateOuts}
        onEndInning={handleEndInning}
      />
    );
  }

  // 2. Default Team & Events Hub View
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col">
      {/* Global Navigation Bar */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight text-white leading-none">
                Pitch Tracker
              </h1>
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
                Youth Baseball Scouting &amp; Live Tracking
              </p>
            </div>
          </div>

          {/* Coach Switcher & Google Sign-Out */}
          <CoachSwitcher
            currentCoach={currentCoach}
            allCoaches={allCoaches}
            onSelectCoach={handleCoachSwitch}
            onSignOut={handleSignOut}
          />
        </div>
      </header>

      {/* Join Link Toast Notification */}
      {joinNotification && (
        <div
          id="join-notification-banner"
          className="bg-emerald-600 text-white text-xs font-bold text-center py-2 px-4 shadow-sm animate-in fade-in"
        >
          {joinNotification}
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 space-y-6">
        {/* Teams Management */}
        <TeamManagement
          currentCoach={currentCoach}
          teams={teams}
          selectedTeam={selectedTeam}
          onSelectTeam={(t) => setSelectedTeamId(t.id)}
          onCreateTeam={handleCreateTeam}
          onJoinTeam={handleJoinTeam}
          onDeleteTeam={handleDeleteTeam}
          onRegenerateInviteLink={handleRegenerateInviteLink}
          onRemoveCoach={handleRemoveCoach}
          onLeaveTeam={handleLeaveTeam}
          onUpdateTeamPitchPreset={handleUpdateTeamPitchPreset}
          players={teamPlayers}
          onSavePlayer={handleSavePlayer}
          onDeletePlayer={handleDeletePlayer}
        />

        {/* Selected Team Events Hub */}
        {selectedTeam && (
          <div className="space-y-4">
            {/* View Switcher Tabs (Events vs Roster) */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                id="tab-events-btn"
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
                  activeTab === 'events'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Events &amp; Games ({teamEvents.length})</span>
              </button>

              <button
                type="button"
                id="tab-roster-btn"
                onClick={() => setActiveTab('roster')}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
                  activeTab === 'roster'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Roster Management ({teamPlayers.length})</span>
              </button>
            </div>

            {/* Events Tab */}
            {activeTab === 'events' && (
              <EventManagement
                currentCoach={currentCoach}
                team={selectedTeam}
                events={teamEvents}
                onSelectEvent={(ev) => setSelectedEventId(ev.id)}
                onCreateEvent={handleCreateEvent}
                onDeleteEvent={handleDeleteEvent}
                onReopenEvent={handleReopenEvent}
              />
            )}

            {/* Roster Tab is also displayed inside TeamManagement or quick jump */}
            {activeTab === 'roster' && (
              <div className="text-xs text-slate-500 bg-white p-4 rounded-xl border border-slate-200">
                You can add, edit, or remove players from the {selectedTeam.name} roster above.
                These players will be available to pitch in both Bullpen sessions and Games.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
