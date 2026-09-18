import { BaseballEvent } from '../../types';
import { loadData, saveData } from '../../store/localStore';
import { syncTeamByEventId, syncSingleTeamToCloud } from '../sync/syncService';

export function getEventsForTeam(teamId: string): BaseballEvent[] {
  const data = loadData();
  return data.events
    .filter((e) => e.teamId === teamId)
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
}

export function getEventById(eventId: string): BaseballEvent | undefined {
  return loadData().events.find((e) => e.id === eventId);
}

export function createEvent(eventInput: {
  teamId: string;
  type: 'game' | 'bullpen';
  opponent?: string;
  location?: string;
  scheduledAt?: string;
  createdBy: string;
}): BaseballEvent {
  const data = loadData();
  const now = new Date().toISOString();
  const newEvent: BaseballEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teamId: eventInput.teamId,
    type: eventInput.type,
    opponent: eventInput.opponent?.trim() || undefined,
    location: eventInput.location?.trim() || undefined,
    scheduledAt: eventInput.scheduledAt || now,
    status: 'in_progress',
    createdBy: eventInput.createdBy,
    createdAt: now,
    updatedAt: now,
    currentInning: eventInput.type === 'game' ? 1 : undefined,
    currentOuts: eventInput.type === 'game' ? 0 : undefined,
    inningHalf: eventInput.type === 'game' ? 'top' : undefined,
  };

  data.events.push(newEvent);
  saveData(data);
  const team = data.teams.find((t) => t.id === eventInput.teamId);
  if (team) {
    syncSingleTeamToCloud(team).catch(() => {});
  }
  return newEvent;
}

export function updateEventInningAndOuts(
  eventId: string,
  update: { currentInning?: number; currentOuts?: number; inningHalf?: 'top' | 'bottom' },
): BaseballEvent | undefined {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    if (update.currentInning !== undefined) {
      event.currentInning = Math.max(1, update.currentInning);
    }
    if (update.currentOuts !== undefined) {
      if (update.currentOuts >= 3) {
        event.currentInning = (event.currentInning || 1) + 1;
        event.currentOuts = 0;
      } else {
        event.currentOuts = Math.max(0, update.currentOuts);
      }
    }
    if (update.inningHalf !== undefined) {
      event.inningHalf = update.inningHalf;
    }
    event.updatedAt = new Date().toISOString();
    saveData(data);
    syncTeamByEventId(eventId, data);
  }
  return event;
}

export function advanceEventInning(eventId: string): BaseballEvent | undefined {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    event.currentInning = (event.currentInning || 1) + 1;
    event.currentOuts = 0;
    event.updatedAt = new Date().toISOString();
    saveData(data);
    syncTeamByEventId(eventId, data);
  }
  return event;
}

export function setEventOuts(eventId: string, outs: number): BaseballEvent | undefined {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    if (outs >= 3) {
      event.currentInning = (event.currentInning || 1) + 1;
      event.currentOuts = 0;
    } else {
      event.currentOuts = Math.max(0, outs);
    }
    event.updatedAt = new Date().toISOString();
    saveData(data);
    syncTeamByEventId(eventId, data);
  }
  return event;
}

export function endInningManual(eventId: string): BaseballEvent | undefined {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    event.currentInning = (event.currentInning || 1) + 1;
    event.currentOuts = 0;
    event.updatedAt = new Date().toISOString();
    saveData(data);
    syncTeamByEventId(eventId, data);
  }
  return event;
}

export function deleteEvent(eventId: string): void {
  const data = loadData();
  const targetEvent = data.events.find((e) => e.id === eventId);
  const teamId = targetEvent?.teamId;

  data.events = data.events.filter((e) => e.id !== eventId);
  data.sessions = data.sessions.filter((s) => s.eventId !== eventId);
  data.pitches = data.pitches.filter((p) => p.eventId !== eventId);
  saveData(data);

  if (teamId) {
    const team = data.teams.find((t) => t.id === teamId);
    if (team) {
      syncSingleTeamToCloud(team).catch(() => {});
    }
  }
}

export function endEvent(eventId: string): BaseballEvent | undefined {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    const now = new Date().toISOString();
    event.status = 'ended';
    event.endedAt = now;
    event.updatedAt = now;
    // Also complete any active sessions in this event
    data.sessions.forEach((s) => {
      if (s.eventId === eventId && s.status === 'active') {
        s.status = 'completed';
        s.endedAt = now;
        s.updatedAt = now;
      }
    });
    saveData(data);
    syncTeamByEventId(eventId, data);
  }
  return event;
}

export function reopenEvent(eventId: string): void {
  const data = loadData();
  const event = data.events.find((e) => e.id === eventId);
  if (event) {
    const now = new Date().toISOString();
    event.status = 'in_progress';
    event.updatedAt = now;
    delete event.endedAt;

    // Reactivate the most recent pitcher session if no session is active
    const eventSessions = data.sessions.filter((s) => s.eventId === eventId);
    const hasActive = eventSessions.some((s) => s.status === 'active');
    if (!hasActive && eventSessions.length > 0) {
      const sorted = [...eventSessions].sort(
        (a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime(),
      );
      if (sorted[0]) {
        sorted[0].status = 'active';
        sorted[0].updatedAt = now;
        delete sorted[0].endedAt;
      }
    }

    saveData(data);
    syncTeamByEventId(eventId, data);
  }
}

// Sessions