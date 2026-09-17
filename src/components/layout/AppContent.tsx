import React, { useState } from 'react';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useTeam } from '../../features/teams/hooks/useTeam';
import { useEvent } from '../../features/events/hooks/useEvent';
import { useUrlJoin } from '../../features/teams/hooks/useUrlJoin';
import { GoogleSignInScreen } from '../../features/auth/components/GoogleSignInScreen';
import { PostSignInScreen } from '../../features/auth/components/PostSignInScreen';
import { AppHeader } from './AppHeader';
import { TeamHubView } from './TeamHubView';
import { LiveSessionView } from '../../features/sessions/components/LiveSessionView';
import { EventReviewSummary } from '../../features/events/components/EventReviewSummary';
import { OfflineIndicator } from '../shared/OfflineIndicator';

export const AppContent: React.FC = () => {
  const { isSignedIn, currentCoach, signInWithGoogle, createAccount } = useAuth();
  const { selectTeam } = useTeam();
  const { selectedEvent, activeSession } = useEvent();

  const [postAuthPendingUser, setPostAuthPendingUser] = useState<{
    displayName: string;
    email: string;
    photoURL?: string;
  } | null>(null);

  const { joinNotification } = useUrlJoin({
    currentCoach,
    onTeamJoined: (team) => selectTeam(team.id),
  });

  // 1. Unauthenticated or Coach Selection Screen
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

  // 2. Active Event / Pitch Tracking or Completed Game Summary View
  if (selectedEvent) {
    if (selectedEvent.status === 'ended' && !activeSession) {
      return (
        <div className="min-h-screen bg-slate-100/70 text-slate-900 px-4 py-6">
          <EventReviewSummary />
        </div>
      );
    }

    return <LiveSessionView />;
  }

  // 3. Default Team & Events Hub View
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col">
      <AppHeader />

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
        <TeamHubView />
      </main>

      <OfflineIndicator />
    </div>
  );
};
