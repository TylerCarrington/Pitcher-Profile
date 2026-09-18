/**
 * Multi-Device Verification Matrix Test Runner
 * Tests the 5 multi-device scenarios outlined in Phase 5 of SYNC_PLAN.md:
 * 1. Team Deletion Persistence (Tombstones prevent resurrection)
 * 2. Admin Team Deletion (Cascades to coach cache and stops re-upload)
 * 3. Session Reopen Sticking (LWW timestamp reconciliation preserves reopen state)
 * 4. Offline Action & Reconnect (Local edits with newer timestamp merge cleanly)
 * 5. Concurrent Pitch Entry (Pitches from multiple coaches merge additively with 0 lost pitches)
 */

import { mergeWithLWW, mergeAppData } from '../src/features/sync/syncService';
import { AppData } from '../src/store/localStore';
import { Team, Player, PitcherSession, Pitch, BaseballEvent } from '../src/types';

function createMockTeam(id: string, name: string, updatedAt: string, isDeleted = false, deletedAt?: string): Team {
  return {
    id,
    name,
    createdBy: 'coach-1',
    createdAt: '2026-09-18T00:00:00.000Z',
    updatedAt,
    memberCoachIds: ['coach-1', 'coach-2'],
    inviteCode: `INV-${id}`,
    isDeleted,
    deletedAt,
  };
}

function createMockSession(id: string, eventId: string, pitcherId: string, status: 'active' | 'completed', updatedAt: string): PitcherSession {
  return {
    id,
    eventId,
    pitcherId,
    status,
    startedAt: '2026-09-18T10:00:00.000Z',
    updatedAt,
    coachNotes: {},
  };
}

function createMockPitch(id: string, sessionId: string, eventId: string, pitcherId: string, pitchNumber: number, updatedAt: string): Pitch {
  return {
    id,
    sessionId,
    eventId,
    pitcherId,
    pitchNumber,
    pitchType: 'fastball',
    outcome: 'strike',
    strikeDetail: 'called',
    ballsBefore: 0,
    strikesBefore: 0,
    ballsAfter: 0,
    strikesAfter: 1,
    timestamp: updatedAt,
    updatedAt,
    recordedBy: 'coach-1',
  };
}

function createEmptyAppData(): AppData {
  return {
    coaches: [],
    teams: [],
    players: [],
    events: [],
    sessions: [],
    pitches: [],
    deletedTeamIds: {},
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

console.log('====================================================');
console.log('🧪 Running Phase 5: Multi-Device Verification Matrix');
console.log('====================================================\n');

// ----------------------------------------------------
// Test 1: Team Deletion Persistence
// ----------------------------------------------------
console.log('--- Test Case 1: Team Deletion Persistence ---');
{
  const t0 = '2026-09-18T08:00:00.000Z';
  const tDelete = '2026-09-18T08:30:00.000Z';

  // Device A creates and deletes Team 1
  const deviceA: AppData = createEmptyAppData();
  deviceA.teams.push(createMockTeam('team-1', 'Hawks', t0));

  // Deletion occurs on Device A
  deviceA.deletedTeamIds = { 'team-1': tDelete };
  deviceA.teams = []; // Removed locally

  // Device B still has stale team locally
  const deviceB: AppData = createEmptyAppData();
  deviceB.teams.push(createMockTeam('team-1', 'Hawks', t0));

  // Cloud broadcast arrives at Device B with tombstone
  const cloudUpdate: AppData = createEmptyAppData();
  cloudUpdate.deletedTeamIds = { 'team-1': tDelete };
  cloudUpdate.teams.push(createMockTeam('team-1', 'Hawks', tDelete, true, tDelete));

  const mergedDeviceB = mergeAppData(deviceB, cloudUpdate);

  assert(
    mergedDeviceB.teams.find((t) => t.id === 'team-1') === undefined,
    'Team Deletion Persistence: Team is removed from Device B after tombstone received'
  );
  assert(
    mergedDeviceB.deletedTeamIds?.['team-1'] === tDelete,
    'Team Deletion Persistence: Tombstone is recorded in Device B deletedTeamIds'
  );

  // Stale Device B tries to re-merge old cache with Device A
  const reMergedDeviceA = mergeAppData(deviceA, mergedDeviceB);
  assert(
    reMergedDeviceA.teams.find((t) => t.id === 'team-1') === undefined,
    'Team Deletion Persistence: Team does NOT resurrect on Device A'
  );
}

// ----------------------------------------------------
// Test 2: Admin Team Deletion
// ----------------------------------------------------
console.log('\n--- Test Case 2: Admin Team Deletion ---');
{
  const t0 = '2026-09-18T07:00:00.000Z';
  const tAdminDelete = '2026-09-18T09:00:00.000Z';

  // Coach device B has team, players, events, sessions, pitches
  const coachDevice: AppData = createEmptyAppData();
  coachDevice.teams.push(createMockTeam('team-99', 'Eagles', t0));
  coachDevice.players.push({ id: 'p1', name: 'John', teamId: 'team-99', jerseyNumber: '10' } as Player);
  coachDevice.events.push({
    id: 'e1',
    teamId: 'team-99',
    type: 'game',
    scheduledAt: '2026-09-18T10:00:00.000Z',
    status: 'in_progress',
    createdBy: 'coach-1',
    createdAt: t0,
  });
  coachDevice.sessions.push(createMockSession('s1', 'e1', 'p1', 'active', t0));
  coachDevice.pitches.push(createMockPitch('pi1', 's1', 'e1', 'p1', 1, t0));

  // Admin deletes team in cloud
  const adminCloudPayload: AppData = createEmptyAppData();
  adminCloudPayload.deletedTeamIds = { 'team-99': tAdminDelete };

  const mergedCoach = mergeAppData(coachDevice, adminCloudPayload);

  assert(
    mergedCoach.teams.find((t) => t.id === 'team-99') === undefined,
    'Admin Team Deletion: Team purged from coach cache'
  );
  assert(
    mergedCoach.players.find((p) => p.teamId === 'team-99') === undefined,
    'Admin Team Deletion: Team players purged from coach cache'
  );
  assert(
    mergedCoach.events.find((e) => e.teamId === 'team-99') === undefined,
    'Admin Team Deletion: Team events purged from coach cache'
  );
  assert(
    mergedCoach.sessions.find((s) => s.id === 's1') === undefined,
    'Admin Team Deletion: Team sessions purged from coach cache'
  );
  assert(
    mergedCoach.pitches.find((p) => p.id === 'pi1') === undefined,
    'Admin Team Deletion: Team pitches purged from coach cache'
  );
}

// ----------------------------------------------------
// Test 3: Session Reopen Sticking
// ----------------------------------------------------
console.log('\n--- Test Case 3: Session Reopen Sticking ---');
{
  const tEnd = '2026-09-18T10:15:00.000Z';
  const tReopen = '2026-09-18T10:16:00.000Z'; // 1 minute later

  // Device A ended the session
  const endedSession = createMockSession('session-1', 'e1', 'p1', 'completed', tEnd);

  // Device B reopens the session
  const reopenedSession = createMockSession('session-1', 'e1', 'p1', 'active', tReopen);

  // Merge on Device A receiving reopened session
  const resolvedOnDeviceA = mergeWithLWW(endedSession, reopenedSession);
  assert(
    resolvedOnDeviceA.status === 'active',
    'Session Reopen Sticking: Reopened state wins over older ended state'
  );
  assert(
    resolvedOnDeviceA.updatedAt === tReopen,
    'Session Reopen Sticking: Newest updatedAt timestamp is preserved'
  );

  // Even if an older end arrives out of order, reopen remains active
  const outOfOrderResolved = mergeWithLWW(reopenedSession, endedSession);
  assert(
    outOfOrderResolved.status === 'active',
    'Session Reopen Sticking: Out-of-order older end does not overwrite active reopen'
  );
}

// ----------------------------------------------------
// Test 4: Offline Action & Reconnect
// ----------------------------------------------------
console.log('\n--- Test Case 4: Offline Action & Reconnect ---');
{
  const tBase = '2026-09-18T11:00:00.000Z';
  const tDeviceA = '2026-09-18T11:05:00.000Z'; // Device A edited online
  const tDeviceBOffline = '2026-09-18T11:10:00.000Z'; // Device B edited later offline

  const baseTeam = createMockTeam('team-2', 'Thunder Initial', tBase);
  const deviceATeam = { ...baseTeam, name: 'Thunder (Online Edit)', updatedAt: tDeviceA };
  const deviceBTeam = { ...baseTeam, name: 'Thunder (Offline Newer Edit)', updatedAt: tDeviceBOffline };

  // Reconnection reconciliation
  const merged = mergeWithLWW(deviceATeam, deviceBTeam);
  assert(
    merged.name === 'Thunder (Offline Newer Edit)',
    'Offline Action & Reconnect: Newer offline edit succeeds over older online edit'
  );
}

// ----------------------------------------------------
// Test 5: Concurrent Pitch Entry
// ----------------------------------------------------
console.log('\n--- Test Case 5: Concurrent Pitch Entry ---');
{
  const t1 = '2026-09-18T12:00:01.000Z';
  const t2 = '2026-09-18T12:00:02.000Z';
  const t3 = '2026-09-18T12:00:03.000Z';
  const t4 = '2026-09-18T12:00:04.000Z';

  // Coach A scores pitches 1 & 2 for Pitcher 1
  const coachAPitches: Pitch[] = [
    createMockPitch('pitch-c1-1', 's1', 'e1', 'pitcher-1', 1, t1),
    createMockPitch('pitch-c1-2', 's1', 'e1', 'pitcher-1', 2, t2),
  ];

  // Coach B concurrently scores pitches 1 & 2 for Pitcher 2 in the same game
  const coachBPitches: Pitch[] = [
    createMockPitch('pitch-c2-1', 's2', 'e1', 'pitcher-2', 1, t3),
    createMockPitch('pitch-c2-2', 's2', 'e1', 'pitcher-2', 2, t4),
  ];

  const appDataA: AppData = {
    ...createEmptyAppData(),
    pitches: coachAPitches,
  };

  const appDataB: AppData = {
    ...createEmptyAppData(),
    pitches: coachBPitches,
  };

  // Merge Coach B into Coach A
  const mergedPitches = mergeAppData(appDataA, appDataB).pitches;

  assert(
    mergedPitches.length === 4,
    `Concurrent Pitch Entry: All 4 pitches preserved (got ${mergedPitches.length})`
  );

  const pitchIds = new Set(mergedPitches.map((p) => p.id));
  assert(
    pitchIds.has('pitch-c1-1') && pitchIds.has('pitch-c1-2') &&
    pitchIds.has('pitch-c2-1') && pitchIds.has('pitch-c2-2'),
    'Concurrent Pitch Entry: Both pitchers have their individual pitches accounted for without drops'
  );
}

console.log('\n====================================================');
console.log(`📊 Matrix Verification Results: ${passedTests}/${totalTests} tests passed`);
console.log('====================================================');

if (passedTests === totalTests) {
  console.log('🎉 ALL MULTI-DEVICE VERIFICATION TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
