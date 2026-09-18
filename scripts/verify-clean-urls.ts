/**
 * Verification script for Clean Human-Readable URLs & Dual-Key Resolution
 */

// Node CLI localStorage mock
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => {
      store.set(key, String(val));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] || null,
    length: 0,
  } as any;
}

import {
  sanitizeSlug,
  formatSlugDate,
  generateEventBaseSlug,
  getCanonicalEventSlug,
  generateTeamBaseSlug,
  getCanonicalTeamSlug,
  extractShortId,
} from '../src/utils/slugUtils';
import {
  saveData,
  loadData,
  getEventByIdOrSlug,
  getTeamByIdOrSlug,
  getCanonicalEventSlugForEvent,
  getCanonicalTeamSlugForTeam,
} from '../src/storage';
import { BaseballEvent, Team } from '../src/types';

function runCleanUrlTests() {
  console.log('====================================================');
  console.log('🧪 Running Clean URLs & Dual-Key Resolution Matrix');
  console.log('====================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, description: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${description}`);
      process.exitCode = 1;
    }
  }

  // 1. Slug Sanitization Tests
  assert(sanitizeSlug('Eastside Sluggers 12U!') === 'eastside-sluggers-12u', 'Sanitizes team name with punctuation');
  assert(sanitizeSlug('  vs.  Red Sox -- Elite  ') === 'vs-red-sox-elite', 'Sanitizes and collapses multiple hyphens');
  assert(sanitizeSlug('Raptors_14U') === 'raptors-14u', 'Sanitizes underscores to hyphens');

  // 2. Date Formatting Tests
  assert(formatSlugDate('2026-09-18T14:30:00.000Z') === 'sep18', 'Formats ISO date to short month/day');
  assert(formatSlugDate('2026-05-04T09:00:00.000Z') === 'may4', 'Formats single-digit day correctly');

  // 3. Short ID Extraction
  assert(extractShortId('event_1789745355781_pfxo') === 'pfxo', 'Extracts suffix from 3-part event ID');
  assert(extractShortId('team_1234567890_abcd') === 'abcd', 'Extracts suffix from 3-part team ID');

  // 4. Base Slug Generation
  const gameEvent: BaseballEvent = {
    id: 'event_1789745355781_pfxo',
    teamId: 'team_1',
    type: 'game',
    opponent: 'Raptors',
    scheduledAt: '2026-09-18T16:00:00Z',
    status: 'in_progress',
    createdBy: 'coach_1',
    createdAt: '2026-09-18T16:00:00Z',
    updatedAt: '2026-09-18T16:00:00Z',
  };

  assert(generateEventBaseSlug(gameEvent) === 'vs-raptors-sep18', 'Generates vs-raptors-sep18 for game vs Raptors on Sep 18');

  const bullpenEvent: BaseballEvent = {
    id: 'event_1789745355782_blpn',
    teamId: 'team_1',
    type: 'bullpen',
    scheduledAt: '2026-09-18T18:00:00Z',
    status: 'ended',
    createdBy: 'coach_1',
    createdAt: '2026-09-18T18:00:00Z',
    updatedAt: '2026-09-18T18:00:00Z',
  };

  assert(generateEventBaseSlug(bullpenEvent) === 'bullpen-sep18', 'Generates bullpen-sep18 for bullpen event on Sep 18');

  // 5. Collision Disambiguation
  const duplicateGameEvent: BaseballEvent = {
    id: 'event_1789745355783_zxy9',
    teamId: 'team_1',
    type: 'game',
    opponent: 'Raptors',
    scheduledAt: '2026-09-18T19:00:00Z',
    status: 'in_progress',
    createdBy: 'coach_1',
    createdAt: '2026-09-18T19:00:00Z',
    updatedAt: '2026-09-18T19:00:00Z',
  };

  const allEvents = [gameEvent, duplicateGameEvent];
  assert(getCanonicalEventSlug(gameEvent, allEvents) === 'vs-raptors-sep18-pfxo', 'Disambiguates collision with short ID suffix');
  assert(getCanonicalEventSlug(duplicateGameEvent, allEvents) === 'vs-raptors-sep18-zxy9', 'Disambiguates second collision with unique suffix');

  // 6. Dual-Key Resolution with Storage
  const testTeam: Team = {
    id: 'team_1789745355781_sqd1',
    name: 'Eastside Sluggers 12U',
    inviteCode: 'SLUG12',
    createdBy: 'coach_1',
    memberCoachIds: ['coach_1'],
    pitchRulePresetId: 'usa_pitch_smart',
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-09-18T10:00:00Z',
  };

  const testData = {
    coaches: [],
    teams: [testTeam],
    players: [],
    events: [gameEvent, bullpenEvent],
    sessions: [],
    pitches: [],
    deletedTeamIds: {},
  };
  saveData(testData);

  // Test Team Resolution
  const teamByRawId = getTeamByIdOrSlug('team_1789745355781_sqd1');
  assert(teamByRawId?.id === testTeam.id, 'Resolves team by raw ID (team_1789745355781_sqd1)');

  const teamBySlug = getTeamByIdOrSlug('eastside-sluggers-12u');
  assert(teamBySlug?.id === testTeam.id, 'Resolves team by clean slug (eastside-sluggers-12u)');

  assert(getCanonicalTeamSlugForTeam(testTeam) === 'eastside-sluggers-12u', 'Generates canonical team slug correctly');

  // Test Event Resolution
  const eventByRawId = getEventByIdOrSlug('event_1789745355781_pfxo');
  assert(eventByRawId?.id === gameEvent.id, 'Resolves event by raw ID (event_1789745355781_pfxo)');

  const eventBySlug = getEventByIdOrSlug('vs-raptors-sep18');
  assert(eventBySlug?.id === gameEvent.id, 'Resolves event by clean slug (vs-raptors-sep18)');

  const bullpenBySlug = getEventByIdOrSlug('bullpen-sep18');
  assert(bullpenBySlug?.id === bullpenEvent.id, 'Resolves bullpen by clean slug (bullpen-sep18)');

  console.log('====================================================');
  console.log(`📊 Clean URL Verification Results: ${passed}/${total} tests passed`);
  console.log('====================================================');

  if (passed === total) {
    console.log('🎉 ALL CLEAN URL & DUAL RESOLUTION TESTS PASSED SUCCESSFULLY!');
  }
}

runCleanUrlTests();

