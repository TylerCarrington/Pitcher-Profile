# Local Storage Strategy & Remediation Proposal

**Project:** Youth Baseball Pitch Tracker  
**Date:** October 2026  
**Status:** Evaluation & Recommendation  

---

## 1. Executive Summary

The application currently operates on a hybrid architecture: it maintains an entire copy of the database inside the browser's `localStorage` (`pitch_tracker_data_v2`) while simultaneously running bidirectional synchronization with Cloud Firestore (`teams/{teamId}` and `coaches/{coachId}`).

While originally designed to support offline field use, **this custom caching layer is currently causing more critical failures than the benefits it provides**. Most notably:
1. **Vanishing Teams:** The local cache frequently manufactures false deletion tombstones (`deletedTeamIds`), which permanently suppress active cloud teams and make the user appear to have no teams.
2. **Dual Source of Truth:** Changes in Firestore fight with stale data in `localStorage`, causing sync loops and profile overwrites.
3. **Redundancy with Firestore:** The Firebase SDK already provides built-in offline persistence (via IndexedDB) that natively handles offline reads, offline queued writes, and atomic server reconciliation without the 5MB limits or race conditions of manual `localStorage` serialization.

This document details:
- Everything currently stored in `localStorage` and how it works.
- The architectural friction and bugs it causes.
- A proposed strategy detailing **what to keep** vs. **what to eliminate**.

---

## 2. Current Local Storage Inventory

The application currently uses the following keys in `localStorage`:

| Storage Key | Data Shape / Contents | Read Frequency | Written By | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `pitch_tracker_data_v2` | Monolithic JSON `AppData`: `{ coaches, teams, players, events, sessions, pitches, deletedTeamIds }` | Every read (`loadData()`) across the app | `saveData()` on every mutation, pitch, team edit, or sync merge | Primary offline database cache |
| `pitch_tracker_current_coach_v2` | String coach ID (e.g. `coach_email_tylercarringtonwa_gmail_com`) | `getCurrentCoach()` on app boot & auth checks | `signInWithGoogle()`, `setCurrentCoachId()` | Remembers the selected coach account |
| `pitch_tracker_auth_status_v2` | String: `'signed_in'` or `'signed_out'` | `getIsSignedIn()` | `signInWithGoogle()`, `signOutCoach()` | Fast auth status check |
| `pitch_tracker_signed_in` | String boolean: `'true'` or `'false'` | `AuthContext` initialization | `AuthContext` | Component-level sign-in flag |
| `pitch_tracker_last_team_id` | String team ID (e.g. `team_1789603241570_kq9m`) | `TeamContext` initialization | `selectTeam()`, `createTeam()`, `joinTeam()` | Remembers last selected team across page reloads |

---

## 3. How the Current System Operates

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Action / UI                              │
│              (Add Pitch, Edit Team, Create Session)                    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │    saveData() to LocalStore   │
                   │ (Serializes ALL app data to   │
                   │  'pitch_tracker_data_v2')     │
                   └───────┬───────────────┬───────┘
                           │               │
             Direct / Queued               │ Debounced
             Cloud Sync                    ▼
                   │         ┌───────────────────────────────┐
                   │         │   syncCoachProfileToCloud()   │
                   │         │ (Reads data.teams from local; │
                   │         │  overwrites joinedTeamIds in  │
                   │         │  coaches/{docId})             │
                   │         └───────────────────────────────┘
                   ▼
┌──────────────────────────────────────────┐
│        syncSingleTeamToCloud()           │
│   (Writes payload to teams/{teamId})     │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│      Firestore onSnapshot Listeners      │
│   (Receives remote team & session state; │
│    runs mergeWithLWW() & mergeAppData()) │
└──────────────────────────────────────────┘
```

---

## 4. Key Failure Modes Caused by Current Local Storage

### 4.1. The "Vanishing Teams" False-Tombstone Trap
In `src/features/sync/syncService.ts`:
```ts
if (!snapshot.exists()) {
  const localData = loadData();
  const now = new Date().toISOString();
  localData.deletedTeamIds = {
    ...(localData.deletedTeamIds || {}),
    [team.id]: now,
  };
  localData.teams = localData.teams.filter((t) => t.id !== team.id);
  saveData(localData, true);
}
```
* **Failure Mechanism:** On startup, if Firestore returns `!snapshot.exists()` before the connection is established or while a new team is writing, the local code assumes the team was deleted remotely.
* **The Lockout:** It sets `deletedTeamIds[team.id] = new Date().toISOString()`. Because this timestamp is newer than the team's `updatedAt` in Firestore, the Last-Write-Wins rule forever rejects the team during future syncs.
* **Why Sign Out/In Fails:** `signOutCoach()` does not clear `pitch_tracker_data_v2`. The tombstone remains in `localStorage`.
* **Why Admin Refresh Fails:** The admin "Refresh Data" button only fetches data into component state without touching `localStorage` or repairing `deletedTeamIds`.
* **Why Clearing Cookies Works:** Clearing browser cookies wipes `localStorage`, purging the poisoned `deletedTeamIds` map and allowing Firestore to re-download the teams.

### 4.2. Stale Local State Poisoning Cloud Profiles
When teams are suppressed locally, `data.teams` becomes `[]`. Any subsequent call to `saveData()` triggers `syncCoachProfileDebounced()`, which reads the empty local array and writes:
```json
{ "joinedTeamIds": [] }
```
to `coaches/{coachId}` in Cloud Firestore. This overwrites the coach's profile in the cloud, propagating the empty state to other devices.

### 4.3. High Overhead & 5MB Local Storage Limits
* Local storage has a **5MB per-origin limit** and runs **synchronously on the main thread**.
* Storing every pitch, coordinate, timestamp, session note, and event for entire rosters in a single JSON string means serializing and parsing megabytes of data on every pitch recorded.
* As seasons progress, the app risks hitting the `QuotaExceededError` limit.

### 4.4. Duplicating Firestore's Native Offline Engine
Firebase Firestore already includes an enterprise-grade offline persistence engine using **IndexedDB**:
- Automatically caches documents locally.
- Serves reads instantly from cache while offline.
- Queues writes in IndexedDB and commits them automatically when connectivity resumes.
- Avoids custom Last-Write-Wins and array reconciliation logic.

By maintaining a manual `localStorage` database on top of Firestore, the app is effectively running two databases that frequently get out of sync.

---

## 5. Proposed Strategy: What to Keep vs. What to Eliminate

### ✅ What We Should KEEP in `localStorage`

We should keep only **lightweight, non-authoritative transient UI preferences**:

1. **`pitch_tracker_last_team_id`**
   - **Why keep:** Coach convenience. When refreshing or reopening the app, it immediately selects the team they were previously viewing rather than defaulting to the first team.
2. **`pitch_tracker_current_coach_v2` / Active Coach Identifier**
   - **Why keep:** Provides an instantaneous hint for which coach is active while Firebase Auth asynchronously verifies credentials on boot.
3. **Active View / UI Preferences (e.g. `pitch_tracker_active_tab: 'roster' | 'events'`)**
   - **Why keep:** Purely aesthetic UI state that does not affect data integrity.
4. **Emergency Offline Pitch Outbox (Optional transient queue)**
   - **Why keep:** If completely offline on the diamond, pending pitch mutations can be queued in an outbox until acknowledged by the network.

---

### ❌ What We Should ELIMINATE from `localStorage`

1. **Eliminate Monolithic `pitch_tracker_data_v2` (`coaches`, `teams`, `players`, `events`, `sessions`, `pitches`)**
   - **Recommendation:** Do not store the full database in `localStorage`.
   - **Alternative:** Treat Firestore (with IndexedDB persistence enabled) as the **single source of truth**. React Contexts (`TeamContext`, `EventContext`) hold active in-memory state hydrated directly from Firestore listeners.
2. **Eliminate Client-Side `deletedTeamIds` Tombstone Map**
   - **Recommendation:** Remove local deletion registries entirely.
   - **Alternative:** Authoritative deletions live exclusively on the Firestore document (`isDeleted: true`, `deletedAt`). If a team document exists in Firestore and is not tombstoned, it is active. Local code should never second-guess the server.
3. **Eliminate `syncCoachProfileToCloud` Overwriting `joinedTeamIds` with Empty Arrays**
   - **Recommendation:** Never allow a blank local array to erase cloud team associations. Team membership is derived authoritatively from `teams` where `memberCoachIds` contains the coach or `createdBy == coach.id`.
4. **Eliminate Manual LWW Array Merging in JavaScript**
   - **Recommendation:** Transition to Firestore sub-collections or scoped documents (`teams/{teamId}/pitches` or granular updates) rather than serializing arrays in `localStorage`.

---

## 6. Comparison Matrix: Current vs. Proposed Architecture

| Capability | Current (`localStorage` + Manual Sync) | Proposed (Firestore Single Source of Truth + UI Storage) |
| :--- | :--- | :--- |
| **Source of Truth** | Dual (`localStorage` and Firestore competing) | Single (Firestore with IndexedDB cache) |
| **Team Persistence** | Subject to false tombstones & local corruption | Guaranteed by Firestore collection queries |
| **Storage Capacity** | Capped at ~5MB (Synchronous) | Virtually unlimited (IndexedDB asynchronous) |
| **Main Thread Impact** | Heavy JSON parsing on every pitch | Zero serialization overhead; instant React state |
| **Offline Support** | Hand-rolled LWW merge code prone to edge cases | Built-in Firestore offline cache & queued mutations |
| **Fix for Disappearing Teams** | Requires clearing browser cookies | Permanently resolved; no local tombstones exist |
| **Resync / Repair** | Broken; admin button cannot repair corrupted storage | Admin button directly re-queries Firestore and resets memory |

---

## 7. Migration Roadmap

1. **Immediate Phase (Quick Fix for Current Bug):**
   - Strip `!snapshot.exists()` false tombstones from `syncService.ts`.
   - Add auto-clearing of `localData.deletedTeamIds` when active teams are found in Firestore.
   - Upgrade the Admin "Refresh Data" button into a true "Force Cloud Resync & Clear Local Tombstones" action.
2. **Longer-Term Modernization (Eliminating `pitch_tracker_data_v2`):**
   - Configure Firebase Firestore persistence explicitly:
     ```ts
     // Enable native IndexedDB offline cache
     import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
     ```
   - Streamline `storage.ts` so `TeamContext` and `EventContext` subscribe directly to Firestore queries with local memory caching.
   - Restrict `localStorage` strictly to `pitch_tracker_last_team_id` and UI session keys.
