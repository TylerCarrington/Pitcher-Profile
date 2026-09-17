import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Coach } from '../../../types';
import {
  getCurrentCoach,
  setCurrentCoachId,
  getAllCoaches,
  createCoachAccount,
  signOutCoach,
  subscribeToStore,
  initCloudSync,
  subscribeToSyncStatus,
  SyncStatus,
} from '../../../storage';
import { auth } from '../../../firebase';
import { signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';

export interface AuthContextType {
  isSignedIn: boolean;
  currentCoach: Coach | null;
  allCoaches: Coach[];
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  signIn: (profile: { name: string; email: string; avatar?: string }) => void;
  signInWithGoogle: (profile: { name: string; email: string; avatar?: string }) => void;
  createAccount: (profile: { name: string; email: string; avatar?: string }) => void;
  signOut: () => Promise<void>;
  switchCoach: (coachId: string) => void;
  refreshAuth: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isSignedIn, setIsSignedIn] = useState<boolean>(() => {
    return localStorage.getItem('pitch_tracker_signed_in') === 'true';
  });
  const [currentCoach, setCurrentCoach] = useState<Coach | null>(getCurrentCoach());
  const [allCoaches, setAllCoaches] = useState<Coach[]>(getAllCoaches());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const refreshAuth = useCallback(() => {
    const coach = getCurrentCoach();
    setCurrentCoach(coach);
    setAllCoaches(getAllCoaches());
  }, []);

  // Sync state from storage changes
  useEffect(() => {
    refreshAuth();
    const unsubscribe = subscribeToStore(refreshAuth);
    return unsubscribe;
  }, [refreshAuth]);

  // Firebase auth listener
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

  const signIn = useCallback((profile: { name: string; email: string; avatar?: string }) => {
    const coach = createCoachAccount(profile);
    setCurrentCoachId(coach.id);
    setCurrentCoach(coach);
    setIsSignedIn(true);
    localStorage.setItem('pitch_tracker_signed_in', 'true');
    refreshAuth();
  }, [refreshAuth]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error(e);
    }
    signOutCoach();
    setIsSignedIn(false);
    localStorage.setItem('pitch_tracker_signed_in', 'false');
    refreshAuth();
  }, [refreshAuth]);

  const switchCoach = useCallback((coachId: string) => {
    setCurrentCoachId(coachId);
    const newCoach = getAllCoaches().find((c) => c.id === coachId);
    if (newCoach) setCurrentCoach(newCoach);
    refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        isSignedIn,
        currentCoach,
        allCoaches,
        syncStatus,
        lastSyncTime,
        signIn,
        signInWithGoogle: signIn,
        createAccount: signIn,
        signOut,
        switchCoach,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
