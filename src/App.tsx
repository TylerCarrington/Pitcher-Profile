import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import { TeamProvider } from './features/teams/context/TeamContext';
import { EventProvider } from './features/events/context/EventContext';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TeamProvider>
          <EventProvider>
            <AppRoutes />
          </EventProvider>
        </TeamProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
