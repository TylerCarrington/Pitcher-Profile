import React, { useState, useEffect, useCallback } from 'react';
import { auth } from './firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
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
  updateTeam,
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
  getSessionById,
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
  initCloudSync,
  subscribeToSyncStatus,
  SyncStatus,
} from './storage';
import { TeamManagement } from './components/TeamManagement';
import { EventManagement } from './components/EventManagement';
import { LiveSessionView } from './components/LiveSessionView';
import { EventReviewSummary } from './components/EventReviewSummary';
import { CoachSwitcher } from './components/CoachSwitcher';
import { TeamSwitcher } from './components/TeamSwitcher';
import { GoogleSignInScreen } from './components/GoogleSignInScreen';
import { PostSignInScreen } from './components/PostSignInScreen';
import pitchLogo from './assets/pitch.png';
import { Activity, Users, Calendar, ArrowLeft, Plus, Link, Cloud, RefreshCw, CloudOff, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => {
    return localStorage.getItem('pitch_tracker_signed_in') === 'true';
  });
  const [currentCoach, setCurrentCoach] = useState<Coach | null>(getCurrentCoach());
  const [allCoaches, setAllCoaches] = useState<Coach[]>(getAllCoaches());
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    return localStorage.getItem('pitch_tracker_last_team_id') || null;
  });
  const [activeTab, setActiveTab] = useState<'events' | 'roster'>('roster');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Event & Session active states
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Join feedback message
  const [joinNotification, setJoinNotification] = useState<string | null>(null);

  // Listen to Firebase Auth state across reloads / devices
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const coach = createCoachAccount({
          name: user.displayName || user.email?.split('@')[0] || 'Coach',
          email: user.email || '',
          avatar: user.photoURL || undefined,
        });
        setCurrentCoachId(coach.id);
        setCurrentCoach(coach);
        setIsSignedIn(true);
        localStorage.setItem('pitch_tracker_signed_in', 'true');
        initCloudSync(user.email || '', user.uid);
      }
    });

    const unsubscribeSync = subscribeToSyncStatus((status, time) => {
      setSyncStatus(status);
      if (time) setLastSyncTime(time);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSync();
    };
  }, []);

  // Sync state from storage
  const syncStore = useCallback(() => {
    const coach = getCurrentCoach();
    setCurrentCoach(coach);
    setAllCoaches(getAllCoaches());

    if (coach) {
      const coachTeams = getTeamsForCoach(coach.id);
      setTeams(coachTeams);

      // Keep selected team valid and prioritize last selected team
      if (coachTeams.length > 0) {
        const storedLastTeamId = localStorage.getItem('pitch_tracker_last_team_id');
        const candidateTeam = coachTeams.find((t) => t.id === storedLastTeamId);
        if (candidateTeam) {
          setSelectedTeamId(candidateTeam.id);
        } else if (!selectedTeamId || !coachTeams.some((t) => t.id === selectedTeamId)) {
          setSelectedTeamId(coachTeams[0].id);
          localStorage.setItem('pitch_tracker_last_team_id', coachTeams[0].id);
        }
      } else {
        setSelectedTeamId(null);
      }
    } else {
      setTeams([]);
      setSelectedTeamId(null);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    syncStore();
    const unsubscribe = subscribeToStore(syncStore);
    return unsubscribe;
  }, [syncStore]);

  // Handle URL share links and pending join codes across sign in
  useEffect(() => {
    const handleUrlJoin = async () => {
      const params = new URLSearchParams(window.location.search);
      const urlJoinCode = params.get('join');
      if (urlJoinCode) {
        sessionStorage.setItem('pending_join_code', urlJoinCode);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }

      const pendingCode = sessionStorage.getItem('pending_join_code') || urlJoinCode;
      if (pendingCode && currentCoach) {
        const res = await joinTeamByCode(pendingCode, currentCoach.id);
        if (res.success && res.team) {
          sessionStorage.removeItem('pending_join_code');
          setJoinNotification(`You joined ${res.team.name}!`);
          setSelectedTeamId(res.team.id);
          localStorage.setItem('pitch_tracker_last_team_id', res.team.id);
          syncStore();
          setTimeout(() => setJoinNotification(null), 4500);
        } else if (res.message) {
          sessionStorage.removeItem('pending_join_code');
        }
      }
    };
    handleUrlJoin();
  }, [currentCoach, syncStore]);

  const selectedTeam = selectedTeamId ? getTeamById(selectedTeamId) || null : null;
  const teamPlayers = selectedTeam ? getPlayersForTeam(selectedTeam.id) : [];
  const teamEvents = selectedTeam ? getEventsForTeam(selectedTeam.id) : [];

  // Selected event
  const selectedEvent = selectedEventId ? getEventById(selectedEventId) || null : null;

  // Active session
  const activeSession = selectedEvent
    ? (activeSessionId ? getSessionById(activeSessionId) : null) ||
      getActiveSessionForEvent(selectedEvent.id) ||
      null
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
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
  const handleSelectTeam = (team: Team) => {
    setSelectedTeamId(team.id);
    localStorage.setItem('pitch_tracker_last_team_id', team.id);
  };

  const handleCreateTeam = (name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => {
    if (!currentCoach) return;
    const newTeam = saveTeam({
      name,
      imageUrl,
      createdBy: currentCoach.id,
      pitchRulePresetId: pitchRulePresetId || 'usa_pitch_smart',
    });
    setSelectedTeamId(newTeam.id);
    localStorage.setItem('pitch_tracker_last_team_id', newTeam.id);
  };

  const handleUpdateTeam = (teamId: string, name: string, imageUrl?: string, pitchRulePresetId?: PitchRulePresetId) => {
    updateTeam(teamId, { name, imageUrl, pitchRulePresetId });
    syncStore();
  };

  const handleUpdateTeamPitchPreset = (teamId: string, presetId: PitchRulePresetId) => {
    updateTeamPitchPreset(teamId, presetId);
    syncStore();
  };

  const handleJoinTeam = async (codeOrLink: string) => {
    if (!currentCoach) return { success: false, message: 'Not signed in' };
    const res = await joinTeamByCode(codeOrLink, currentCoach.id);
    if (res.success && res.team) {
      setSelectedTeamId(res.team.id);
      localStorage.setItem('pitch_tracker_last_team_id', res.team.id);
      syncStore();
    }
    return res;
  };

  const handleDeleteTeam = (teamId: string) => {
    if (!currentCoach) return;
    const res = deleteTeam(teamId, currentCoach.id);
    if (res.success) {
      localStorage.removeItem('pitch_tracker_last_team_id');
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
    if (!currentCoach) return;
    const res = removeCoachFromTeam(teamId, coachId, currentCoach.id);
    if (res.success) {
      syncStore();
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleLeaveTeam = (teamId: string) => {
    if (!currentCoach) return;
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
    if (!currentCoach) return;
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
    setSelectedEventId(eventId);
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
      setSelectedEventId(session.eventId);
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

  // 0. If user is signed out or no valid profile exists, show Google Sign-In Screen
  if (!isSignedIn || !currentCoach) {
    return (
      <GoogleSignInScreen
        onSignIn={handleGoogleSignIn}
      />
    );
  }

  // 0.5 If user is signed in but has no teams yet, show the Post-Sign-In Onboarding Screen
  if (teams.length === 0) {
    return (
      <PostSignInScreen
        currentCoach={currentCoach}
        onCreateTeam={handleCreateTeam}
        onJoinTeam={handleJoinTeam}
        onSignOut={handleSignOut}
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
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5">
            <img
              src={pitchLogo}
              alt="Pitch Tracker"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-cover shadow-sm border border-emerald-500/30 shrink-0"
            />
            <div className="hidden sm:block">
              <h1 className="font-black text-base tracking-tight text-white leading-none">
                Pitch Tracker
              </h1>
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mt-0.5">
                Youth Baseball Scouting &amp; Live Tracking
              </p>
            </div>
          </div>

          {/* Right Header Controls: Cloud Status + Team Switcher + Coach Switcher */}
          <div className="flex items-center gap-2">
            {/* Real-time Cloud Sync Indicator */}
            <div
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                syncStatus === 'synced'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/30 animate-pulse'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
              }`}
              title={
                syncStatus === 'synced'
                  ? `Real-time Cloud Sync Active (Last synced: ${lastSyncTime || 'Just now'})`
                  : syncStatus === 'syncing'
                  ? 'Syncing changes to Firestore...'
                  : 'Operating locally (changes will sync when online)'
              }
            >
              {syncStatus === 'synced' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cloud Synced</span>
                </>
              ) : syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cached</span>
                </>
              )}
            </div>

            {currentCoach && (
              <TeamSwitcher
                teams={teams}
                selectedTeam={selectedTeam}
                currentCoach={currentCoach}
                onSelectTeam={handleSelectTeam}
                onCreateTeam={handleCreateTeam}
                onJoinTeam={handleJoinTeam}
              />
            )}

            <CoachSwitcher
              currentCoach={currentCoach}
              allCoaches={allCoaches}
              onSelectCoach={handleCoachSwitch}
              onSignOut={handleSignOut}
            />
          </div>
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
        {!selectedTeam ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-md mx-auto my-12 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">No Team Selected</h3>
              <p className="text-xs text-slate-500">
                Create a squad or join an existing team with an invite code from the team switcher above to manage rosters and track pitches.
              </p>
            </div>
            <div className="pt-2 flex justify-center">
              {currentCoach && (
                <TeamSwitcher
                  teams={teams}
                  selectedTeam={selectedTeam}
                  currentCoach={currentCoach}
                  onSelectTeam={handleSelectTeam}
                  onCreateTeam={handleCreateTeam}
                  onJoinTeam={handleJoinTeam}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* View Switcher Tabs (Roster vs Events) */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
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
                <span>Roster &amp; Pitch Limits ({teamPlayers.length})</span>
              </button>

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
            </div>

            {/* Tab 1: Roster & Pitch Count Management */}
            {activeTab === 'roster' && (
              <TeamManagement
                currentCoach={currentCoach}
                teams={teams}
                selectedTeam={selectedTeam}
                onSelectTeam={handleSelectTeam}
                onCreateTeam={handleCreateTeam}
                onUpdateTeam={handleUpdateTeam}
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
            )}

            {/* Tab 2: Events & Games Management */}
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
          </div>
        )}
      </main>
    </div>
  );
}
