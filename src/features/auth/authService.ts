import { Coach } from '../../types';
import { loadData, saveData, AUTH_STATUS_KEY, CURRENT_COACH_KEY, notify } from '../../store/localStore';
import { initCloudSync as initSync, stopCloudSync, syncCoachProfileToCloud } from '../sync/syncService';

export function getIsSignedIn(): boolean {
  const status = localStorage.getItem(AUTH_STATUS_KEY);
  return status !== 'signed_out';
}

export function signInWithGoogle(profile: {
  name: string;
  email: string;
  avatar?: string;
}): Coach {
  const data = loadData();
  const cleanEmail = profile.email.trim().toLowerCase();
  
  // Deterministic stable ID for email-based coaches
  const stableId = `coach_email_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
  
  let coach = data.coaches.find((c) => c.email.toLowerCase() === cleanEmail);

  if (!coach) {
    coach = {
      id: stableId,
      name: profile.name.trim(),
      email: profile.email.trim(),
      avatar: profile.avatar || undefined,
      role: 'head_coach',
      googleId: `google_${Date.now()}`,
    };
    data.coaches.push(coach);
  } else {
    // Update profile details if provided
    coach.name = profile.name.trim() || coach.name;
    if (profile.avatar) coach.avatar = profile.avatar;
  }

  // Ensure any teams created by or associated with this email include this coach ID
  data.teams.forEach((team) => {
    const creator = data.coaches.find((c) => c.id === team.createdBy);
    if (creator?.email?.toLowerCase() === cleanEmail || team.createdBy === coach.id) {
      if (!team.memberCoachIds.includes(coach.id)) {
        team.memberCoachIds.push(coach.id);
      }
    }
  });

  localStorage.setItem(CURRENT_COACH_KEY, coach.id);
  localStorage.setItem(AUTH_STATUS_KEY, 'signed_in');
  saveData(data);
  initSync(coach.email, coach.id);
  syncCoachProfileToCloud(coach).catch(() => {});
  notify();
  return coach;
}

export const createCoachAccount = signInWithGoogle;

export function signOutCoach(): void {
  localStorage.setItem(AUTH_STATUS_KEY, 'signed_out');
  stopCloudSync();
  notify();
}

export function getCurrentCoach(): Coach | null {
  const data = loadData();
  const currentId = localStorage.getItem(CURRENT_COACH_KEY);
  const found = data.coaches.find((c) => c.id === currentId);
  if (found) return found;
  return data.coaches[0] || null;
}

export function setCurrentCoachId(coachId: string): void {
  localStorage.setItem(CURRENT_COACH_KEY, coachId);
  localStorage.setItem(AUTH_STATUS_KEY, 'signed_in');
  const coach = getCurrentCoach();
  if (coach) {
    initSync(coach.email, coach.id);
  }
  notify();
}

export function getAllCoaches(): Coach[] {
  return loadData().coaches;
}

// Teams