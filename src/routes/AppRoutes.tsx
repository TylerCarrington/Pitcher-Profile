import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useTeam } from '../features/teams/hooks/useTeam';
import { useEvent } from '../features/events/hooks/useEvent';
import { useUrlJoin } from '../features/teams/hooks/useUrlJoin';
import { GoogleSignInScreen } from '../features/auth/components/GoogleSignInScreen';
import { PostSignInScreen } from '../features/auth/components/PostSignInScreen';
import { AppHeader } from '../components/layout/AppHeader';
import { TeamHubView } from '../components/layout/TeamHubView';
import { LiveSessionView } from '../features/sessions/components/LiveSessionView';
import { EventReviewSummary } from '../features/events/components/EventReviewSummary';
import { OfflineIndicator } from '../components/shared/OfflineIndicator';
import { AdminDashboardView } from '../features/admin/components/AdminDashboardView';
import {
  getEventByIdOrSlug,
  getTeamByIdOrSlug,
  getCanonicalEventSlugForEvent,
  getCanonicalTeamSlugForTeam,
  getSessionsForEvent,
  getPitchesForEvent,
} from '../storage';
import { AlertCircle } from 'lucide-react';

/**
 * Route for Admin Dashboard (/admin)
 */
const AdminRoute: React.FC = () => {
  const { currentCoach } = useAuth();
  const navigate = useNavigate();

  const isAdmin = currentCoach?.email?.trim().toLowerCase() === 'tylercarringtonwa@gmail.com';

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <AdminDashboardView onClose={() => navigate('/')} />;
};

/**
 * Route for Live Event Pitch Tracker (/events/:eventId or /events/:eventSlug)
 */
const EventLiveRoute: React.FC<{ onShowNotification: (msg: string) => void }> = ({ onShowNotification }) => {
  const { eventId } = useParams<{ eventId: string }>();
  const { selectedEvent, selectEvent, activeSession } = useEvent();
  const { selectedTeam, selectTeam } = useTeam();
  const navigate = useNavigate();

  const event = eventId ? getEventByIdOrSlug(eventId) : null;
  const team = event ? getTeamByIdOrSlug(event.teamId) : null;

  useEffect(() => {
    if (!eventId) {
      navigate('/', { replace: true });
      return;
    }

    const found = getEventByIdOrSlug(eventId);
    if (!found) {
      onShowNotification('Event could not be found or has been removed.');
      navigate('/', { replace: true });
      return;
    }

    // Auto-canonicalize URL in browser bar if raw ID or outdated slug is present
    const canonicalSlug = getCanonicalEventSlugForEvent(found);
    if (eventId !== canonicalSlug) {
      navigate(`/events/${canonicalSlug}`, { replace: true });
    }

    if (!selectedEvent || selectedEvent.id !== found.id) {
      selectEvent(found.id);
      selectTeam(found.teamId);
    }
  }, [eventId, selectedEvent, selectEvent, selectTeam, navigate, onShowNotification]);

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="animate-pulse text-slate-400 text-sm font-semibold">Loading Event...</div>
      </div>
    );
  }

  const canonicalEventSlug = getCanonicalEventSlugForEvent(event);

  // If event is already completed and no live active session is running, redirect to review
  if (event.status === 'ended' && !activeSession) {
    return <Navigate to={`/events/${canonicalEventSlug}/review`} replace />;
  }

  return (
    <LiveSessionView
      event={event}
      team={team || selectedTeam}
      onBackToTeam={() => {
        selectEvent(null);
        const teamSlug = team ? getCanonicalTeamSlugForTeam(team) : '';
        navigate(teamSlug ? `/teams/${teamSlug}/events` : '/', { replace: false });
      }}
    />
  );
};

/**
 * Route for Completed Event Review (/events/:eventId/review or /events/:eventSlug/review)
 */
const EventReviewRoute: React.FC<{ onShowNotification: (msg: string) => void }> = ({ onShowNotification }) => {
  const { eventId } = useParams<{ eventId: string }>();
  const { selectedEvent, selectEvent } = useEvent();
  const { selectedTeam, selectTeam } = useTeam();
  const navigate = useNavigate();

  const event = eventId ? getEventByIdOrSlug(eventId) : null;
  const team = event ? getTeamByIdOrSlug(event.teamId) : null;

  useEffect(() => {
    if (!eventId) {
      navigate('/', { replace: true });
      return;
    }

    const found = getEventByIdOrSlug(eventId);
    if (!found) {
      onShowNotification('Event could not be found or has been removed.');
      navigate('/', { replace: true });
      return;
    }

    // Auto-canonicalize URL in browser bar if raw ID or outdated slug is present
    const canonicalSlug = getCanonicalEventSlugForEvent(found);
    if (eventId !== canonicalSlug) {
      navigate(`/events/${canonicalSlug}/review`, { replace: true });
    }

    if (!selectedEvent || selectedEvent.id !== found.id) {
      selectEvent(found.id);
      selectTeam(found.teamId);
    }
  }, [eventId, selectedEvent, selectEvent, selectTeam, navigate, onShowNotification]);

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col">
        <AppHeader onOpenAdmin={() => navigate('/admin')} />
        <main className="max-w-5xl w-full mx-auto px-4 py-12 flex-1 flex items-center justify-center">
          <div className="animate-pulse text-slate-500 text-sm font-semibold">Loading Event Review...</div>
        </main>
        <OfflineIndicator />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col">
      <AppHeader onOpenAdmin={() => navigate('/admin')} />
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 space-y-6">
        <EventReviewSummary
          event={event}
          team={team || selectedTeam}
          onBackToEvents={() => {
            selectEvent(null);
            const teamSlug = team ? getCanonicalTeamSlugForTeam(team) : '';
            navigate(teamSlug ? `/teams/${teamSlug}/events` : '/', { replace: false });
          }}
        />
      </main>
      <OfflineIndicator />
    </div>
  );
};

/**
 * Route for Team Hub with tab support (/teams/:teamId, /teams/:teamId/roster, /teams/:teamId/events)
 */
const TeamHubRoute: React.FC<{
  defaultTab?: 'roster' | 'events';
  onShowNotification: (msg: string) => void;
}> = ({ defaultTab, onShowNotification }) => {
  const { teamId } = useParams<{ teamId?: string }>();
  const { selectedTeam, selectTeam, setActiveTab } = useTeam();
  const navigate = useNavigate();

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, setActiveTab]);

  useEffect(() => {
    if (teamId) {
      const found = getTeamByIdOrSlug(teamId);
      if (!found) {
        onShowNotification('Team could not be found or has been removed.');
        navigate('/', { replace: true });
        return;
      }

      // Auto-canonicalize URL in browser bar if raw ID or outdated slug is present
      const canonicalSlug = getCanonicalTeamSlugForTeam(found);
      if (teamId !== canonicalSlug) {
        navigate(`/teams/${canonicalSlug}${defaultTab ? `/${defaultTab}` : ''}`, { replace: true });
      }

      if (!selectedTeam || selectedTeam.id !== found.id) {
        selectTeam(found.id);
      }
    }
  }, [teamId, defaultTab, selectedTeam, selectTeam, navigate, onShowNotification]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col">
      <AppHeader onOpenAdmin={() => navigate('/admin')} />
      <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1 space-y-6">
        <TeamHubView />
      </main>
      <OfflineIndicator />
    </div>
  );
};

/**
 * Route for Invite Links (/join/:inviteCode)
 */
const JoinInviteRoute: React.FC<{ onShowNotification: (msg: string) => void }> = ({ onShowNotification }) => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { currentCoach } = useAuth();
  const { selectTeam } = useTeam();
  const navigate = useNavigate();

  const { joinNotification, joinError } = useUrlJoin({
    currentCoach,
    onTeamJoined: (team) => {
      selectTeam(team.id);
      const teamSlug = getCanonicalTeamSlugForTeam(team);
      navigate(`/teams/${teamSlug}/roster`, { replace: true });
    },
  });

  useEffect(() => {
    if (joinError) {
      onShowNotification(joinError);
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [joinError, onShowNotification, navigate]);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 max-w-md w-full text-center space-y-4">
        <h3 className="text-lg font-bold text-slate-900">
          {joinError ? 'Invite Error' : 'Joining Team...'}
        </h3>
        <p className="text-xs text-slate-500">
          {joinError
            ? joinError
            : `Processing invite code: ${inviteCode}`}
        </p>
        {joinNotification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200">
            {joinNotification}
          </div>
        )}
        {joinError && (
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Return to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Root Router Component with Authentication Gate & Post-Auth Redirect Preservation
 */
export const AppRoutes: React.FC = () => {
  const { isSignedIn, currentCoach, signInWithGoogle, createAccount } = useAuth();
  const { selectedTeam } = useTeam();
  const [notification, setNotification] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const [postAuthPendingUser, setPostAuthPendingUser] = useState<{
    displayName: string;
    email: string;
    photoURL?: string;
  } | null>(null);

  // Preserve target route when unauthenticated
  useEffect(() => {
    if (!isSignedIn || !currentCoach) {
      const fullPath = location.pathname + location.search;
      if (fullPath && fullPath !== '/' && !fullPath.startsWith('/?')) {
        sessionStorage.setItem('post_auth_redirect', fullPath);
      }
    }
  }, [isSignedIn, currentCoach, location]);

  // Handle post-auth redirect after sign-in
  useEffect(() => {
    if (isSignedIn && currentCoach) {
      const targetPath = sessionStorage.getItem('post_auth_redirect');
      if (targetPath) {
        sessionStorage.removeItem('post_auth_redirect');
        navigate(targetPath, { replace: true });
      }
    }
  }, [isSignedIn, currentCoach, navigate]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Authentication screen gate
  if (!isSignedIn || !currentCoach) {
    if (postAuthPendingUser) {
      return (
        <PostSignInScreen
          pendingUser={postAuthPendingUser}
          onCoachCreated={() => setPostAuthPendingUser(null)}
          onCancel={() => setPostAuthPendingUser(null)}
        />
      );
    }

    return (
      <GoogleSignInScreen
        onSignIn={signInWithGoogle}
        onCoachCreated={(coach) => {
          createAccount({
            name: coach.name,
            email: coach.email,
            avatar: coach.avatar,
          });
        }}
      />
    );
  }

  return (
    <>
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-bold py-2.5 px-5 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <Routes>
        {/* Root Path: Defaults to active or first team */}
        <Route
          path="/"
          element={
            selectedTeam ? (
              <Navigate to={`/teams/${getCanonicalTeamSlugForTeam(selectedTeam)}/roster`} replace />
            ) : (
              <TeamHubRoute onShowNotification={showNotification} />
            )
          }
        />

        {/* Team Routes with Tabs */}
        <Route path="/teams/:teamId" element={<TeamHubRoute onShowNotification={showNotification} />} />
        <Route path="/teams/:teamId/roster" element={<TeamHubRoute defaultTab="roster" onShowNotification={showNotification} />} />
        <Route path="/teams/:teamId/events" element={<TeamHubRoute defaultTab="events" onShowNotification={showNotification} />} />

        {/* Event Routes */}
        <Route path="/events/:eventId" element={<EventLiveRoute onShowNotification={showNotification} />} />
        <Route path="/events/:eventId/review" element={<EventReviewRoute onShowNotification={showNotification} />} />

        {/* Invite Code Route */}
        <Route path="/join/:inviteCode" element={<JoinInviteRoute onShowNotification={showNotification} />} />

        {/* Admin Route */}
        <Route path="/admin" element={<AdminRoute />} />

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};
