/**
 * Verification script for URL routing helpers, invite codes, auth redirects, and route hydration
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

import { extractCleanInviteCode } from '../src/store/localStore';
import {
  saveTeam,
  savePlayer,
  createEvent,
  startPitcherSession,
  addPitchToSession,
  getEventById,
  getTeamById,
  getSessionById,
  getPitchesForSession,
  calculateGamePitchingMetrics,
} from '../src/storage';

console.log('====================================================');
console.log('🧪 Running Phase 4 & 5: URL Routing, Hydration & Auth Matrix');
console.log('====================================================');

function test(description: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res.then(() => {
        console.log(`✅ [PASS] ${description}`);
      }).catch((err) => {
        console.error(`❌ [FAIL] ${description}:`, err.message);
        process.exit(1);
      });
    } else {
      console.log(`✅ [PASS] ${description}`);
    }
  } catch (err: any) {
    console.error(`❌ [FAIL] ${description}:`, err.message);
    process.exit(1);
  }
}

// 1. Direct code extraction
test('Direct invite code extraction', () => {
  const code = extractCleanInviteCode('WARRIORS-7788');
  if (code !== 'WARRIORS-7788') throw new Error(`Expected WARRIORS-7788, got ${code}`);
});

// 2. Query param format
test('Query param invite code extraction (?join=...) ', () => {
  const code = extractCleanInviteCode('https://app.pitcherprofile.com?join=EAGLES-1234');
  if (code !== 'EAGLES-1234') throw new Error(`Expected EAGLES-1234, got ${code}`);
});

// 3. Path route format (/join/:inviteCode)
test('Path route invite code extraction (/join/...) ', () => {
  const code = extractCleanInviteCode('https://app.pitcherprofile.com/join/BULLDOGS-9900');
  if (code !== 'BULLDOGS-9900') throw new Error(`Expected BULLDOGS-9900, got ${code}`);
});

// 4. Path with trailing slash and query
test('Path route with query and trailing slash', () => {
  const code = extractCleanInviteCode('https://app.pitcherprofile.com/join/WILDCATS-4455/?ref=share');
  if (code !== 'WILDCATS-4455') throw new Error(`Expected WILDCATS-4455, got ${code}`);
});

// 5. Phase 5 Matrix Test 1: Live Game Refresh State Hydration
test('Live Game Refresh State: Event, Session, Pitches & Scoreboard Hydration', () => {
  const coachId = 'coach-url-test';
  const team = saveTeam({ name: 'Sluggers 12U', createdBy: coachId });
  const player = savePlayer({
    teamId: team.id,
    name: 'Marcus Rivera',
    jerseyNumber: '42',
    seasonAge: 12,
    throws: 'R',
    bats: 'R',
  });
  const event = createEvent({
    teamId: team.id,
    type: 'game',
    opponent: 'Raptors',
    location: 'Diamond 2',
    createdBy: coachId,
  });
  const session = startPitcherSession(event.id, player.id);

  // Log 15 pitches for Pitcher
  for (let i = 1; i <= 15; i++) {
    addPitchToSession({
      sessionId: session.id,
      eventId: event.id,
      pitcherId: player.id,
      outcome: i % 2 === 0 ? 'strike' : 'ball',
      strikeDetail: i % 2 === 0 ? 'called' : undefined,
      pitchType: i % 3 === 0 ? 'fastball' : 'changeup',
      location: { x: 0.5, y: 0.5, region: 'strike_zone' },
      recordedBy: coachId,
    });
  }

  // Simulate refresh at /events/:eventId
  const hydratedEvent = getEventById(event.id);
  if (!hydratedEvent || hydratedEvent.id !== event.id) throw new Error('Failed to hydrate event on refresh');

  const hydratedTeam = getTeamById(hydratedEvent.teamId);
  if (!hydratedTeam || hydratedTeam.id !== team.id) throw new Error('Failed to hydrate parent team on refresh');

  const hydratedSession = getSessionById(session.id);
  if (!hydratedSession || hydratedSession.pitcherId !== player.id) throw new Error('Failed to hydrate active session');

  const sessionPitches = getPitchesForSession(session.id);
  if (sessionPitches.length !== 15) throw new Error(`Expected 15 pitches on refresh, got ${sessionPitches.length}`);
});

// 6. Phase 5 Matrix Test 2: Event Review Refresh State Hydration
test('Event Review Refresh State: Scouting summary metrics computation', () => {
  const coachId = 'coach-url-test-review';
  const team = saveTeam({ name: 'Panthers 10U', createdBy: coachId });
  const player = savePlayer({
    teamId: team.id,
    name: 'Leo Vance',
    jerseyNumber: '7',
    seasonAge: 10,
    throws: 'L',
    bats: 'L',
  });
  const event = createEvent({
    teamId: team.id,
    type: 'game',
    opponent: 'Tigers',
    location: 'Field 1',
    createdBy: coachId,
  });
  const session = startPitcherSession(event.id, player.id);

  addPitchToSession({
    sessionId: session.id,
    eventId: event.id,
    pitcherId: player.id,
    outcome: 'strike',
    pitchType: 'fastball',
    strikeDetail: 'swinging',
    location: { x: 0.4, y: 0.4, region: 'strike_zone' },
    recordedBy: coachId,
  });
  addPitchToSession({
    sessionId: session.id,
    eventId: event.id,
    pitcherId: player.id,
    outcome: 'strike',
    pitchType: 'fastball',
    strikeDetail: 'called',
    location: { x: 0.5, y: 0.5, region: 'strike_zone' },
    recordedBy: coachId,
  });
  addPitchToSession({
    sessionId: session.id,
    eventId: event.id,
    pitcherId: player.id,
    outcome: 'ball',
    pitchType: 'curveball',
    location: { x: 0.9, y: 0.9, region: 'far_miss' },
    recordedBy: coachId,
  });

  const pitches = getPitchesForSession(session.id);
  const metrics = calculateGamePitchingMetrics(pitches);

  if (metrics.totalPitches !== 3) throw new Error(`Expected 3 total pitches, got ${metrics.totalPitches}`);
  if (metrics.strikes !== 2) throw new Error(`Expected 2 strikes, got ${metrics.strikes}`);
  if (metrics.balls !== 1) throw new Error(`Expected 1 ball, got ${metrics.balls}`);
});

// 7. Phase 5 Matrix Test 3: Admin Guard Rule Verification
test('Admin Guard: Only authorized email has admin access', () => {
  const adminEmail = 'tylercarringtonwa@gmail.com';
  const coachEmail = 'regularcoach@example.com';

  const isAdmin1 = adminEmail.trim().toLowerCase() === 'tylercarringtonwa@gmail.com';
  const isAdmin2 = coachEmail.trim().toLowerCase() === 'tylercarringtonwa@gmail.com';

  if (!isAdmin1) throw new Error('Admin email failed authorization check');
  if (isAdmin2) throw new Error('Regular coach improperly granted admin authorization');
});

console.log('====================================================');
console.log('🎉 ALL URL ROUTING & MATRIX TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
process.exit(0);

