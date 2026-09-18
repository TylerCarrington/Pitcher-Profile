// Polyfill localStorage for Node CLI environment
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => {
    store[key] = val;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k in store) delete store[k];
  },
};

import {
  saveData,
  saveTeam,
  savePlayer,
  createEvent,
  startPitcherSession,
  addPitchToSession,
  undoPreviousPitch,
  getPitchesForSession,
  getSessionById,
} from '../src/storage';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log('--- Starting Undo Previous Pitch Verification ---');

// Clean slate in localStorage
saveData({
  coaches: [
    {
      id: 'coach-1',
      name: 'Coach Dave',
      email: 'dave@example.com',
      avatar: 'coach1',
    },
  ],
  teams: [],
  players: [],
  events: [],
  sessions: [],
  pitches: [],
});

// Setup team, pitcher, event, and session
const team = saveTeam({
  name: 'Thunderbolts',
  createdBy: 'coach-1',
  pitchRulePresetId: 'usa_pitch_smart',
});
assert(!!team, 'Team should be created');

const player = savePlayer({
  teamId: team.id,
  name: 'Tyler Glass',
  jerseyNumber: '14',
  seasonAge: 12,
  bats: 'R',
  throws: 'R',
});
assert(!!player, 'Player should be created');

const event = createEvent({
  teamId: team.id,
  type: 'game',
  opponent: 'Hawks',
  scheduledAt: new Date().toISOString(),
  createdBy: 'coach-1',
});
assert(!!event, 'Event should be created');

const session = startPitcherSession(event.id, player.id);
assert(!!session, 'Session should be created');

// Step 1: Add 3 pitches
console.log('1. Adding 3 pitches...');
const p1 = addPitchToSession({
  sessionId: session.id,
  eventId: event.id,
  pitcherId: player.id,
  outcome: 'ball',
  pitchType: 'fastball',
  recordedBy: 'coach-1',
});
assert(p1.pitchNumber === 1, 'Pitch 1 should have pitchNumber 1');
assert(p1.ballsBefore === 0 && p1.strikesBefore === 0, 'Pitch 1 count before should be 0-0');
assert(p1.ballsAfter === 1 && p1.strikesAfter === 0, 'Pitch 1 count after should be 1-0');

const p2 = addPitchToSession({
  sessionId: session.id,
  eventId: event.id,
  pitcherId: player.id,
  outcome: 'strike',
  strikeDetail: 'called',
  pitchType: 'changeup',
  recordedBy: 'coach-1',
});
assert(p2.pitchNumber === 2, 'Pitch 2 should have pitchNumber 2');
assert(p2.ballsBefore === 1 && p2.strikesBefore === 0, 'Pitch 2 count before should be 1-0');
assert(p2.ballsAfter === 1 && p2.strikesAfter === 1, 'Pitch 2 count after should be 1-1');

const p3 = addPitchToSession({
  sessionId: session.id,
  eventId: event.id,
  pitcherId: player.id,
  outcome: 'strike',
  strikeDetail: 'swinging',
  pitchType: 'fastball',
  recordedBy: 'coach-1',
});
assert(p3.pitchNumber === 3, 'Pitch 3 should have pitchNumber 3');
assert(p3.ballsBefore === 1 && p3.strikesBefore === 1, 'Pitch 3 count before should be 1-1');
assert(p3.ballsAfter === 1 && p3.strikesAfter === 2, 'Pitch 3 count after should be 1-2');

let sessionPitches = getPitchesForSession(session.id);
let sessionRec = getSessionById(session.id);
assert(sessionPitches.length === 3, 'Should have 3 pitches in session');
assert(!!sessionRec, 'Session should exist');
console.log('✅ 3 pitches recorded successfully (Count 1-2)');

// Step 2: Undo Pitch 3
console.log('2. Undoing Pitch 3 (swinging strike)...');
const undone3 = undoPreviousPitch(session.id);
assert(!!undone3, 'undone3 should not be null');
assert(undone3.id === p3.id, 'Undone pitch should be pitch 3');
assert(undone3.outcome === 'strike', 'Undone outcome should be strike');

sessionPitches = getPitchesForSession(session.id);
sessionRec = getSessionById(session.id);
assert(sessionPitches.length === 2, 'Should have 2 pitches remaining');
assert(sessionPitches[sessionPitches.length - 1].id === p2.id, 'Latest pitch should now be pitch 2');
console.log('✅ Pitch 3 undone successfully. 2 pitches remain. Count restored to 1-1.');

// Step 3: Undo Pitch 2
console.log('3. Undoing Pitch 2 (called strike)...');
const undone2 = undoPreviousPitch(session.id);
assert(!!undone2, 'undone2 should not be null');
assert(undone2.id === p2.id, 'Undone pitch should be pitch 2');

sessionPitches = getPitchesForSession(session.id);
sessionRec = getSessionById(session.id);
assert(sessionPitches.length === 1, 'Should have 1 pitch remaining');
assert(sessionPitches[0].id === p1.id, 'Remaining pitch should be pitch 1');
console.log('✅ Pitch 2 undone successfully. 1 pitch remains. Count restored to 1-0.');

// Step 4: Undo Pitch 1
console.log('4. Undoing Pitch 1 (ball)...');
const undone1 = undoPreviousPitch(session.id);
assert(!!undone1, 'undone1 should not be null');
assert(undone1.id === p1.id, 'Undone pitch should be pitch 1');

sessionPitches = getPitchesForSession(session.id);
sessionRec = getSessionById(session.id);
assert(sessionPitches.length === 0, 'Should have 0 pitches remaining');
console.log('✅ Pitch 1 undone successfully. 0 pitches remain.');

// Step 5: Undo on empty session
console.log('5. Testing undo on empty session...');
const undoneEmpty = undoPreviousPitch(session.id);
assert(undoneEmpty === null, 'Undo on empty session should return null');
console.log('✅ Gracefully handled undo on empty session.');

// Step 6: Log a new pitch after full undo
console.log('6. Logging a fresh pitch after full undo...');
const newP1 = addPitchToSession({
  sessionId: session.id,
  eventId: event.id,
  pitcherId: player.id,
  outcome: 'strike',
  strikeDetail: 'called',
  pitchType: 'fastball',
  recordedBy: 'coach-1',
});
assert(newP1.pitchNumber === 1, 'New pitch after full undo should have pitchNumber 1');
assert(newP1.ballsBefore === 0 && newP1.strikesBefore === 0, 'New pitch count before should be 0-0');
assert(newP1.ballsAfter === 0 && newP1.strikesAfter === 1, 'New pitch count after should be 0-1');
console.log('✅ Fresh pitch logged with pitchNumber 1 and correct count 0-1.');

console.log('🎉 ALL UNDO TESTS PASSED SUCCESSFULLY!');
process.exit(0);
