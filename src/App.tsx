import React from 'react';
import { AuthProvider } from './features/auth/context/AuthContext';
import { TeamProvider } from './features/teams/context/TeamContext';
import { EventProvider } from './features/events/context/EventContext';
import { AppContent } from './components/layout/AppContent';

export default function App() {
  return (
    <AuthProvider>
      <TeamProvider>
        <EventProvider>
          <AppContent />
        </EventProvider>
      </TeamProvider>
    </AuthProvider>
  );
}
