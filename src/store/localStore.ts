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
  SafetyWarningFlag,
} from '../types';
import { db, auth } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  
} from 'firebase/firestore';

const STORAGE_KEY = 'pitch_tracker_data_v2';
export const CURRENT_COACH_KEY = 'pitch_tracker_current_coach_v2';
export const AUTH_STATUS_KEY = 'pitch_tracker_auth_status_v2';

export function extractCleanInviteCode(input: string): string {
  if (!input) return '';
  let cleaned = input.trim();
  if (cleaned.includes('/join/')) {
    const parts = cleaned.split('/join/');
    if (parts[1]) {
      cleaned = parts[1];
    }
  } else if (cleaned.includes('join=')) {
    try {
      const url = new URL(cleaned.startsWith('http') ? cleaned : `https://${cleaned}`);
      cleaned = url.searchParams.get('join') || cleaned;
    } catch (e) {
      const match = cleaned.match(/join=([^&]+)/i);
      if (match) cleaned = decodeURIComponent(match[1]);
    }
  }
  // Strip any trailing slashes, quotes, URL query parameters or hash fragments
  cleaned = cleaned.replace(/[?#&/].*$/, '').replace(/['"]/g, '').trim().toUpperCase();
  return cleaned;
}

export interface AppData {
  coaches: Coach[];
  teams: Team[];
  players: Player[];
  events: BaseballEvent[];
  sessions: PitcherSession[];
  pitches: Pitch[];
  deletedTeamIds?: Record<string, string>;
}

const DEFAULT_COACHES: Coach[] = [];
const DEFAULT_TEAMS: Team[] = [];
const DEFAULT_PLAYERS: Player[] = [];
const DEFAULT_EVENTS: BaseballEvent[] = [];
const DEFAULT_SESSIONS: PitcherSession[] = [];
const DEFAULT_PITCHES: Pitch[] = [];
const DEFAULT_DELETED_TEAM_IDS: Record<string, string> = {};

type Listener = () => void;
const listeners = new Set<Listener>();

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';
let currentSyncStatus: SyncStatus = 'synced';
let lastSyncTimestamp: string | null = null;
const syncStatusListeners = new Set<(status: SyncStatus, lastSync: string | null) => void>();

const syncChannel =
  typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('pitch_tracker_sync_channel')
    : null;

if (syncChannel) {
  syncChannel.onmessage = (event) => {
    if (event.data?.type === 'DATA_UPDATED') {
      listeners.forEach((fn) => fn());
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      listeners.forEach((fn) => fn());
    }
  });
}

export function notify(broadcast = true) {
  listeners.forEach((fn) => fn());
  if (broadcast && syncChannel) {
    try {
      syncChannel.postMessage({ type: 'DATA_UPDATED', timestamp: Date.now() });
    } catch {
      // ignore channel errors
    }
  }
}

export function notifySyncStatus(status: SyncStatus) {
  currentSyncStatus = status;
  if (status === 'synced') {
    lastSyncTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  syncStatusListeners.forEach((fn) => fn(currentSyncStatus, lastSyncTimestamp));
}

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function subscribeToSyncStatus(
  listener: (status: SyncStatus, lastSync: string | null) => void,
): () => void {
  syncStatusListeners.add(listener);
  listener(currentSyncStatus, lastSyncTimestamp);
  return () => {
    syncStatusListeners.delete(listener);
  };
}

export function getSyncStatus(): { status: SyncStatus; lastSync: string | null } {
  return { status: currentSyncStatus, lastSync: lastSyncTimestamp };
}









export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.teams)) {
        if (!parsed.deletedTeamIds || typeof parsed.deletedTeamIds !== 'object') {
          parsed.deletedTeamIds = {};
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load pitch tracker data:', err);
  }

  const initial: AppData = {
    coaches: DEFAULT_COACHES,
    teams: DEFAULT_TEAMS,
    players: DEFAULT_PLAYERS,
    events: DEFAULT_EVENTS,
    sessions: DEFAULT_SESSIONS,
    pitches: DEFAULT_PITCHES,
    deletedTeamIds: DEFAULT_DELETED_TEAM_IDS,
  };
  saveData(initial);
  return initial;
}

export function saveData(data: AppData, skipCloud = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to persist pitch tracker data locally:', err);
  }
  notify();

  if (!skipCloud) {
    if (onDataSaved) onDataSaved(data);
  }
}

export function cleanForFirestore<T>(val: T): T {
  if (val === undefined) return null as any;
  if (val === null || typeof val !== 'object') return val;
  try {
    return JSON.parse(JSON.stringify(val));
  } catch {
    return val;
  }
}

export let onDataSaved: ((data: AppData) => void) | null = null;
export function setOnDataSaved(callback: (data: AppData) => void) {
  onDataSaved = callback;
}
