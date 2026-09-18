import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import { TeamProvider } from './features/teams/context/TeamContext';
import { EventProvider } from './features/events/context/EventContext';
import { AppRoutes } from './routes/AppRoutes';

const getBasename = (): string | undefined => {
  const base = import.meta.env.BASE_URL;
  if (base && base !== './' && base !== '/') {
    return base;
  }
  const pathname = window.location.pathname;
  if (pathname.includes('/Pitcher-Profile')) {
    return '/Pitcher-Profile';
  }
  return undefined;
};

export default function App() {
  return (
    <BrowserRouter basename={getBasename()}>
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
