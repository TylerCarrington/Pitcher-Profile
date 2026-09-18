/**
 * Verification test for Leave Team & Remove Coach functionality.
 * Ensures that leaving/removing a coach:
 * 1. Purges all matching coach ID variants (ID, email, stable coach email ID).
 * 2. Updates team.updatedAt to a fresh timestamp so LWW reconciliation keeps the change.
 * 3. Prevents older remote snapshots from resurrecting the coach.
 */

// Polyfill localStorage for Node CLI environment
const mockStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
};

import { leaveTeam, removeCoachFromTeam, deleteTeam, getTeamsForCoach } from '../src/features/teams/teamService';
import { mergeWithLWW } from '../src/features/sync/syncService';
import { loadData, saveData } from '../src/store/localStore';
import { Team, Coach } from '../src/types';

console.log('====================================================');
console.log('🧪 Running Leave Team & Remove Coach Verification');
console.log('====================================================');

let passed = 0;
let total = 0;

function assert(condition: boolean, description: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${description}`);
  } else {
    console.error(`❌ [FAIL] ${description}`);
    process.exitCode = 1;
  }
}

// Setup initial store state
const coachCreator: Coach = { id: 'coach_creator_123', name: 'Creator Coach', email: 'creator@example.com', role: 'head_coach' };
const coachMember: Coach = { id: 'coach_member_456', name: 'Assistant Coach', email: 'assistant@example.com', role: 'assistant_coach' };

const testTeam: Team = {
  id: 'team_test_999',
  name: 'Test Tigers',
  createdBy: coachCreator.id,
  createdAt: '2026-09-18T10:00:00.000Z',
  updatedAt: '2026-09-18T10:00:00.000Z',
  memberCoachIds: [
    coachCreator.id,
    coachMember.id,
    coachMember.email,
    `coach_email_assistant_example_com`
  ],
  inviteCode: 'TEST999',
};

const store = loadData();
store.coaches = [coachCreator, coachMember];
store.teams = [testTeam];
saveData(store);

// --- Test 1: Verify member coach is initially recognized ---
const initialTeams = getTeamsForCoach(coachMember.id);
assert(initialTeams.some((t) => t.id === testTeam.id), 'Member coach initially sees team in getTeamsForCoach');

// --- Test 2: Assistant Coach leaves team ---
const leaveRes = leaveTeam(testTeam.id, coachMember.id);
assert(leaveRes.success === true, 'leaveTeam returns success: true');

const updatedData = loadData();
const updatedTeam = updatedData.teams.find((t) => t.id === testTeam.id)!;

assert(
  !updatedTeam.memberCoachIds.includes(coachMember.id) &&
  !updatedTeam.memberCoachIds.includes(coachMember.email) &&
  !updatedTeam.memberCoachIds.includes('coach_email_assistant_example_com'),
  'leaveTeam purges ALL matching coach ID variants from memberCoachIds'
);

assert(
  new Date(updatedTeam.updatedAt).getTime() > new Date(testTeam.updatedAt).getTime(),
  'leaveTeam updates team.updatedAt timestamp to current time'
);

const remainingTeamsForCoach = getTeamsForCoach(coachMember.id);
assert(!remainingTeamsForCoach.some((t) => t.id === testTeam.id), 'Coach no longer sees team in getTeamsForCoach after leaving');

// --- Test 3: LWW Reconciliation against older remote snapshot ---
const olderRemoteTeamDoc: Team = { ...testTeam }; // Still contains assistant coach and old timestamp
const mergedResult = mergeWithLWW(updatedTeam, olderRemoteTeamDoc);

assert(
  !mergedResult.memberCoachIds.includes(coachMember.id),
  'LWW Reconciliation preserves coach removal when merged against older remote snapshot'
);

// --- Test 4: Delete Team Permission Check (Non-owner/Non-admin should fail) ---
const unauthorizedDeleteRes = deleteTeam(testTeam.id, coachMember.id);
assert(
  unauthorizedDeleteRes.success === false && Boolean(unauthorizedDeleteRes.error),
  'Non-owner/non-admin coach is rejected when attempting to delete team'
);

// --- Test 5: Delete Team Permission Check (Owner/Creator or Admin should succeed) ---
const authorizedDeleteRes = deleteTeam(testTeam.id, coachCreator.id);
assert(
  authorizedDeleteRes.success === true,
  'Team owner/creator is allowed to delete team'
);

console.log('====================================================');
console.log(`📊 Leave Team Results: ${passed}/${total} tests passed`);
console.log('====================================================');

if (passed === total) {
  console.log('🎉 ALL LEAVE TEAM TESTS PASSED SUCCESSFULLY!');
} else {
  process.exit(1);
}
