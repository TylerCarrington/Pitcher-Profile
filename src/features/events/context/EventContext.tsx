import React, { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import {
  BaseballEvent,
  PitcherSession,
  Pitch,
  Player,
  PitchOutcome,
  PitchType,
  StrikeSubDetail,
  InPlaySubDetail,
  PitchLocation,
} from '../../../types';
import {
  getEventById,
  createEvent as storageCreateEvent,
  endEvent as storageEndEvent,
  reopenEvent as storageReopenEvent,
  deleteEvent as storageDeleteEvent,
  setEventOuts,
  endInningManual,
  getSessionById,
  getSessionsForEvent,
  startPitcherSession,
  endPitcherSession,
  reopenPitcherSession,
  deletePitcherSession,
  updateSessionNotes,
  updateSessionUncountedPitches as storageUpdateSessionUncountedPitches,
  getPitchesForSession,
  getPitchesForEvent,
  addPitchToSession,
  updatePitch as storageUpdatePitch,
  deletePitch as storageDeletePitch,
  getPlayerById,
  subscribeToStore,
} from '../../../storage';
import { useAuth } from '../../auth/hooks/useAuth';
import { useTeam } from '../../teams/hooks/useTeam';

export interface EventContextType {
  selectedEventId: string | null;
  selectedEvent: BaseballEvent | null;
  activeSessionId: string | null;
  activeSession: PitcherSession | null;
  activePitcher: Player | null;
  sessionPitches: Pitch[];
  allEventPitches: Pitch[];
  allEventSessions: PitcherSession[];
  selectEvent: (eventId: string | null) => void;
  createEvent: (input: {
    teamId: string;
    type: 'game' | 'bullpen';
    opponent?: string;
    location?: string;
    scheduledAt: string;
  }) => BaseballEvent | undefined;
  endEvent: (eventId: string) => void;
  reopenEvent: (eventId: string) => void;
  deleteEvent: (eventId: string) => void;
  startSession: (pitcherId: string) => void;
  endSession: (sessionId: string) => void;
  reopenSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  recordPitch: (params: {
    sessionId: string;
    eventId: string;
    pitcherId: string;
    outcome: PitchOutcome;
    pitchType?: PitchType;
    strikeDetail?: StrikeSubDetail;
    inPlayDetail?: InPlaySubDetail;
    location?: PitchLocation | null;
    recordedBy: string;
  }) => Pitch;
  updatePitch: (pitchUpdate: Partial<Pitch> & { id: string; sessionId: string }) => void;
  deletePitch: (pitchId: string, sessionId: string) => void;
  saveNotes: (sessionId: string, coachId: string, notes: string) => void;
  updateSessionUncountedPitches: (sessionId: string, count: number) => void;
  updateOuts: (outs: number) => void;
  endInning: () => void;
  refreshEventData: () => void;
}

export const EventContext = createContext<EventContextType | undefined>(undefined);

interface EventProviderProps {
  children: ReactNode;
}

export const EventProvider: React.FC<EventProviderProps> = ({ children }) => {
  const { currentCoach } = useAuth();
  const { setActiveTab } = useTeam();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  const refreshEventData = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToStore(refreshEventData);
    return unsubscribe;
  }, [refreshEventData]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return getEventById(selectedEventId) || null;
  }, [selectedEventId, dataVersion]);

  // Active session
  const activeSession = useMemo(() => {
    if (!selectedEvent || !activeSessionId) return null;
    const found = getSessionById(activeSessionId);
    if (found && found.status === 'active') return found;
    return null;
  }, [selectedEvent, activeSessionId, dataVersion]);

  // Active pitcher
  const activePitcher = useMemo(() => {
    if (!activeSession || !activeSession.pitcherId) return null;
    return getPlayerById(activeSession.pitcherId) || null;
  }, [activeSession, dataVersion]);

  // Synchronize activeSessionId if the current session ended or changed
  useEffect(() => {
    if (selectedEvent && activeSessionId) {
      const candidate = getSessionById(activeSessionId);
      if (!candidate || candidate.status === 'completed') {
        setActiveSessionId(null);
      }
    }
  }, [selectedEvent?.id, activeSessionId, dataVersion]);

  const sessionPitches = useMemo(() => {
    if (!activeSession) return [];
    return getPitchesForSession(activeSession.id);
  }, [activeSession, dataVersion]);

  const allEventPitches = useMemo(() => {
    if (!selectedEvent) return [];
    return getPitchesForEvent(selectedEvent.id);
  }, [selectedEvent, dataVersion]);

  const allEventSessions = useMemo(() => {
    if (!selectedEvent) return [];
    return getSessionsForEvent(selectedEvent.id);
  }, [selectedEvent, dataVersion]);

  const selectEvent = useCallback((eventId: string | null) => {
    setSelectedEventId(eventId);
    if (eventId) {
      const sessions = getSessionsForEvent(eventId);
      const active = sessions.find((s) => s.status === 'active');
      setActiveSessionId(active ? active.id : null);
    } else {
      setActiveSessionId(null);
      setActiveTab('events');
    }
  }, [setActiveTab]);

  const createEvent = useCallback(
    (input: {
      teamId: string;
      type: 'game' | 'bullpen';
      opponent?: string;
      location?: string;
      scheduledAt: string;
    }) => {
      if (!currentCoach) return undefined;
      const newEv = storageCreateEvent({
        ...input,
        createdBy: currentCoach.id,
      });
      setSelectedEventId(newEv.id);
      refreshEventData();
      return newEv;
    },
    [currentCoach, refreshEventData],
  );

  const endEvent = useCallback(
    (eventId: string) => {
      storageEndEvent(eventId);
      refreshEventData();
    },
    [refreshEventData],
  );

  const reopenEvent = useCallback(
    (eventId: string) => {
      storageReopenEvent(eventId);
      setSelectedEventId(eventId);
      refreshEventData();
    },
    [refreshEventData],
  );

  const deleteEvent = useCallback(
    (eventId: string) => {
      storageDeleteEvent(eventId);
      if (selectedEventId === eventId) {
        setSelectedEventId(null);
      }
      refreshEventData();
    },
    [selectedEventId, refreshEventData],
  );

  const startSession = useCallback(
    (pitcherId: string) => {
      if (!selectedEvent) return;
      const existing = getSessionsForEvent(selectedEvent.id).find((s) => s.pitcherId === pitcherId);
      if (existing) {
        if (existing.status === 'completed') {
          reopenPitcherSession(existing.id);
        }
        setActiveSessionId(existing.id);
      } else {
        const session = startPitcherSession(selectedEvent.id, pitcherId);
        setActiveSessionId(session.id);
      }
      refreshEventData();
    },
    [selectedEvent, refreshEventData],
  );

  const endSession = useCallback(
    (sessionId: string) => {
      endPitcherSession(sessionId);
      setActiveSessionId(null);
      refreshEventData();
    },
    [refreshEventData],
  );

  const reopenSession = useCallback(
    (sessionId: string) => {
      const session = reopenPitcherSession(sessionId);
      if (session) {
        setSelectedEventId(session.eventId);
        setActiveSessionId(session.id);
        refreshEventData();
      }
    },
    [refreshEventData],
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      deletePitcherSession(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
      refreshEventData();
    },
    [activeSessionId, refreshEventData],
  );

  const recordPitch = useCallback(
    (params: {
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
      const pitch = addPitchToSession(params);
      refreshEventData();
      return pitch;
    },
    [refreshEventData],
  );

  const updatePitch = useCallback(
    (pitchUpdate: Partial<Pitch> & { id: string; sessionId: string }) => {
      storageUpdatePitch(pitchUpdate);
      refreshEventData();
    },
    [refreshEventData],
  );

  const deletePitch = useCallback(
    (pitchId: string, sessionId: string) => {
      storageDeletePitch(pitchId, sessionId);
      refreshEventData();
    },
    [refreshEventData],
  );

  const saveNotes = useCallback(
    (sessionId: string, coachId: string, notes: string) => {
      updateSessionNotes(sessionId, coachId, notes);
      refreshEventData();
    },
    [refreshEventData],
  );

  const updateSessionUncountedPitches = useCallback(
    (sessionId: string, count: number) => {
      storageUpdateSessionUncountedPitches(sessionId, count);
      refreshEventData();
    },
    [refreshEventData],
  );

  const updateOuts = useCallback(
    (outs: number) => {
      if (!selectedEvent) return;
      setEventOuts(selectedEvent.id, outs);
      refreshEventData();
    },
    [selectedEvent, refreshEventData],
  );

  const endInning = useCallback(() => {
    if (!selectedEvent) return;
    endInningManual(selectedEvent.id);
    refreshEventData();
  }, [selectedEvent, refreshEventData],
  );

  return (
    <EventContext.Provider
      value={{
        selectedEventId,
        selectedEvent,
        activeSessionId,
        activeSession,
        activePitcher,
        sessionPitches,
        allEventPitches,
        allEventSessions,
        selectEvent,
        createEvent,
        endEvent,
        reopenEvent,
        deleteEvent,
        startSession,
        endSession,
        reopenSession,
        deleteSession,
        recordPitch,
        updatePitch,
        deletePitch,
        saveNotes,
        updateSessionUncountedPitches,
        updateOuts,
        endInning,
        refreshEventData,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};
