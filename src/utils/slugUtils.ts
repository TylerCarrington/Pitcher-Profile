import { BaseballEvent, Team } from '../types';

/**
 * Strips special characters, converts spaces to hyphens, and lowercases text.
 */
export function sanitizeSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-') // convert spaces & underscores to hyphens
    .replace(/[^a-z0-9-]/g, '') // remove remaining invalid characters
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, ''); // trim leading & trailing hyphens
}

/**
 * Formats a date string (ISO or timestamp) into short readable format (e.g. 'sep18').
 */
export function formatSlugDate(dateString?: string): string {
  if (!dateString) return 'event';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'event';

  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  return `${month}${day}`;
}

/**
 * Extracts a short 3-4 character hash from an entity ID (e.g. 'event_1789745355781_pfxo' -> 'pfxo').
 */
export function extractShortId(id: string): string {
  if (!id) return '';
  const parts = id.split('_');
  if (parts.length >= 3) {
    return parts[parts.length - 1];
  }
  return id.slice(-4).replace(/[^a-z0-9]/gi, '').toLowerCase();
}

/**
 * Generates the base human-readable slug for an event.
 * Examples:
 *  - Game vs Raptors on Sep 18 -> 'vs-raptors-sep18'
 *  - Game with no opponent -> 'game-sep18'
 *  - Bullpen on Sep 18 -> 'bullpen-sep18'
 */
export function generateEventBaseSlug(event: Partial<BaseballEvent>): string {
  const dateSlug = formatSlugDate(event.scheduledAt || event.createdAt);

  if (event.type === 'bullpen') {
    return `bullpen-${dateSlug}`;
  }

  if (event.type === 'game') {
    const opp = event.opponent ? sanitizeSlug(event.opponent) : '';
    if (opp) {
      return `vs-${opp}-${dateSlug}`;
    }
    return `game-${dateSlug}`;
  }

  return `event-${dateSlug}`;
}

/**
 * Returns the unique canonical slug for an event, adding a short suffix if collisions exist.
 */
export function getCanonicalEventSlug(event: BaseballEvent, allEvents: BaseballEvent[] = []): string {
  const baseSlug = generateEventBaseSlug(event);
  if (!allEvents || allEvents.length === 0) return baseSlug;

  const duplicates = allEvents.filter(
    (e) => e.id !== event.id && !e.isDeleted && generateEventBaseSlug(e) === baseSlug
  );

  if (duplicates.length > 0) {
    const short = extractShortId(event.id);
    return `${baseSlug}-${short}`;
  }

  return baseSlug;
}

/**
 * Generates the base human-readable slug for a team.
 * Example: 'Eastside Sluggers 12U' -> 'eastside-sluggers-12u'
 */
export function generateTeamBaseSlug(team: Partial<Team>): string {
  const sanitized = sanitizeSlug(team.name || '');
  if (sanitized) return sanitized;
  return `team-${extractShortId(team.id || 'team')}`;
}

/**
 * Returns the unique canonical slug for a team, adding a short suffix if collisions exist.
 */
export function getCanonicalTeamSlug(team: Team, allTeams: Team[] = []): string {
  const baseSlug = generateTeamBaseSlug(team);
  if (!allTeams || allTeams.length === 0) return baseSlug;

  const duplicates = allTeams.filter(
    (t) => t.id !== team.id && !t.isDeleted && generateTeamBaseSlug(t) === baseSlug
  );

  if (duplicates.length > 0) {
    const short = extractShortId(team.id);
    return `${baseSlug}-${short}`;
  }

  return baseSlug;
}
