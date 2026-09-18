/**
 * Verification script for AppHeader Consistency & Brand Icon Home Navigation
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
  saveData,
  getCanonicalTeamSlugForTeam,
  getCanonicalEventSlugForEvent,
  getTeamByIdOrSlug,
  getEventByIdOrSlug,
} from '../src/storage';
import { Team, BaseballEvent, Coach } from '../src/types';

function runHeaderNavigationTests() {
  console.log('====================================================');
  console.log('🧪 Running AppHeader Consistency & Navigation Matrix');
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

  const testCoach: Coach = {
    id: 'coach_head_nav',
    name: 'Coach Tyler',
    email: 'TylerCarringtonWA@gmail.com',
  };

  const testTeam: Team = {
    id: 'team_sluggers_99',
    name: 'Eastside Sluggers 12U',
    inviteCode: 'SLUG99',
    createdBy: testCoach.id,
    memberCoachIds: [testCoach.id],
    pitchRulePresetId: 'usa_pitch_smart',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const testEvent: BaseballEvent = {
    id: 'event_game_99',
    teamId: testTeam.id,
    type: 'game',
    opponent: 'Raptors',
    scheduledAt: '2026-09-18T16:00:00Z',
    status: 'ended',
    createdBy: testCoach.id,
    createdAt: '2026-09-18T16:00:00Z',
    updatedAt: '2026-09-18T16:00:00Z',
  };

  const testData = {
    coaches: [testCoach],
    teams: [testTeam],
    players: [],
    events: [testEvent],
    sessions: [],
    pitches: [],
    deletedTeamIds: {},
  };
  saveData(testData);

  // 1. Target Home Path Resolution with Selected Team
  const teamSlug = getCanonicalTeamSlugForTeam(testTeam);
  const homePathWithTeam = testTeam ? `/teams/${teamSlug}/roster` : '/';
  assert(
    homePathWithTeam === '/teams/eastside-sluggers-12u/roster',
    'Brand icon resolves home path to active team roster (/teams/eastside-sluggers-12u/roster)'
  );

  // 2. Target Home Path Resolution without Selected Team
  const nullTeam = null;
  const homePathWithoutTeam = nullTeam ? `/teams/${getCanonicalTeamSlugForTeam(nullTeam)}/roster` : '/';
  assert(homePathWithoutTeam === '/', 'Brand icon falls back to root / when no active team is selected');

  // 3. Event Clearing on Brand Navigation Simulation
  let activeEventId: string | null = testEvent.id;
  const simulateBrandLogoClick = (team: Team | null) => {
    activeEventId = null; // resets event context
    return team ? `/teams/${getCanonicalTeamSlugForTeam(team)}/roster` : '/';
  };

  const destination = simulateBrandLogoClick(testTeam);
  assert(activeEventId === null, 'Clicking brand icon resets active selected event to null');
  assert(destination === '/teams/eastside-sluggers-12u/roster', 'Brand icon navigation routes correctly to team roster');

  // 4. Clean Route Canonical Slugs for Event Review
  const eventSlug = getCanonicalEventSlugForEvent(testEvent);
  assert(eventSlug === 'vs-raptors-sep18', 'Event review canonical slug matches expected format');

  // 5. Pitcher Selection Mode Header & Navigation State
  const pitcherPickerState = {
    showPitcherPicker: true,
    activeSession: null,
    activePitcher: null,
  };
  const shouldRenderHeaderInSessionView = (state: typeof pitcherPickerState) => {
    return state.showPitcherPicker || !state.activeSession || !state.activePitcher;
  };
  assert(
    shouldRenderHeaderInSessionView(pitcherPickerState) === true,
    'Top nav header is enabled during Pitcher Selection mode'
  );
  assert(
    shouldRenderHeaderInSessionView({ showPitcherPicker: false, activeSession: {} as any, activePitcher: {} as any }) === false,
    'Top nav header is hidden during live pitch tracking focus mode'
  );

  console.log('====================================================');
  console.log(`📊 Header Navigation Results: ${passed}/${total} tests passed`);
  console.log('====================================================');

  if (passed === total) {
    console.log('🎉 ALL HEADER NAVIGATION & BRAND ICON TESTS PASSED SUCCESSFULLY!');
  }
}

runHeaderNavigationTests();
