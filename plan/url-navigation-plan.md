# URL Navigation & Route Persistence Plan

This plan outlines a phased architectural strategy to introduce full URL-based routing to the youth baseball pitcher tracking app, ensuring page refreshes, direct deep links, browser back/forward actions, and invite links deterministically restore the exact screen, team, event, and sub-view state.

---

## 🎯 Executive Summary & Objectives

### Current State
- The application currently relies primarily on **in-memory React state** (`selectedEvent`, `activeSession`, `activeTab`, `showAdminView`) layered over a `localStorage` cache (`pitch_tracker_last_team_id`).
- When a user refreshes the browser (F5 / Cmd+R) while scoring a live bullpen/game or reviewing game scouting reports, the view resets back to the top-level Team Hub view because `selectedEventId` in `EventContext` defaults to `null`.
- Users cannot bookmark or share direct links to a specific game, bullpen session, team roster, or review summary.

### Core Objectives
1. **Deterministic Refresh Restoration:** Refreshing any page (live pitch tracking, completed game review, roster tab, events list, admin panel) must restore the exact same view and state.
2. **Clean, RESTful URL Schema:** Human-readable paths representing the application hierarchy (teams, events, reviews, sessions).
3. **Deep Linking & Invite URLs:** Enable direct linking to specific teams, events, and join codes (`/join/:inviteCode`).
4. **Offline-First Resilience:** Navigation must function 100% offline from local cache without requiring server round-trips.
5. **Back/Forward Browser History:** Standard browser navigation must operate predictably without clobbering active pitch counts or session mutations.

---

## 🗺️ Target URL Architecture & Route Map

| URL Route | View / Component | State Restored on Refresh | Fallback if Missing |
| :--- | :--- | :--- | :--- |
| `/` | Default Team Hub | Restores last active team or first available team | Create/Join screen if no teams |
| `/teams/:teamId` | Team Hub (Redirects to tab) | Selects `teamId`, loads roster/events | Redirects to `/` with toast |
| `/teams/:teamId/roster` | Team Roster & Pitch Limits | Selects `teamId`, sets `activeTab = 'roster'` | Redirects to `/` |
| `/teams/:teamId/events` | Team Events & Schedule | Selects `teamId`, sets `activeTab = 'events'` | Redirects to `/` |
| `/events/:eventId` | Live Pitch Tracker | Selects event, restores active pitcher & pitch stream | Redirects to `/teams/:teamId/events` |
| `/events/:eventId/review` | Completed Game/Event Review | Selects event, displays scouting summary & charts | Redirects to `/teams/:teamId/events` |
| `/join/:inviteCode` | Team Join Landing | Initiates invite verification & auto-selects team | Redirects to `/` with error banner |
| `/admin` | System Admin Dashboard | Loads admin panel (restricted to admin emails) | Redirects to `/` if unauthorized |

### Optional Modal / Filter Query Parameters
- `?player=:playerId` — Restores the open Pitcher Profile / Season Stats modal.
- `?export=:pitcherId` — Restores the single-player session review export dialog.
- `?tab=roster|events` — Query-based tab alternative or sub-route alias.

---

## 📅 Phased Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Router Foundation & Routing Infrastructure         │
│  - Install/configure React Router or lightweight route sync │
│  - Set up SPA fallback & Vite history routing               │
│  - Define route tree and layout wrappers                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 2: Context State Synchronization & Deep Link Hydration│
│  - Bi-directional sync between URL params & Context state   │
│  - Hydrate `selectedTeamId` & `selectedEventId` on boot     │
│  - Handle async cache loading & data-ready race conditions  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 3: Route Transitions, Navigation & Action Upgrades    │
│  - Replace manual state switches with programmatic navigate │
│  - Update Event creation, completion, and review navigation │
│  - Upgrade Team Switcher and Tab buttons to link elements   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 4: Invite Codes, Auth Guards & Deep Redirects         │
│  - Handle `/join/:code` direct landing                      │
│  - Post-auth redirect preservation (remember target URL)    │
│  - Admin route security guard (`/admin`)                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 5: Verification, Offline Testing & Edge-Case Matrix   │
│  - Refresh testing matrix across all 6 core view states     │
│  - Browser Back/Forward history validation                  │
│  - Automated regression and route recovery verification     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Detailed Breakdown by Phase

### Phase 1: Router Foundation & Routing Infrastructure
**Goal:** Establish client-side routing support that works in Vite development, production SPA hosting, and PWA offline modes.

- [ ] **1.1. Add Router Library / Foundation**:
  - Add `react-router-dom` (or lightweight URL router wrapper matching React 19).
  - Configure `<BrowserRouter>` or `<HashRouter>` / HTML5 History wrapper inside `src/main.tsx` or `src/App.tsx`.
- [ ] **1.2. Configure Server & Vite Fallback**:
  - Ensure `vite.config.ts` and Express production server (`dist/index.html` fallback) properly route all non-API paths to `index.html`.
- [ ] **1.3. Define Route Structure**:
  - Create route declarations in `src/routes/` or within `AppContent.tsx`:
    - Root route with auth gate
    - Team layout with nested tabs (`/teams/:teamId/roster`, `/teams/:teamId/events`)
    - Event tracking route (`/events/:eventId`)
    - Event review route (`/events/:eventId/review`)
    - Join invite route (`/join/:inviteCode`)
    - Admin route (`/admin`)

---

### Phase 2: Context State Synchronization & Deep Link Hydration
**Goal:** Guarantee that refreshing any URL immediately hydrates `TeamContext`, `EventContext`, and `AuthContext` without flicker or state mismatch.

- [ ] **2.1. URL-Driven Team Hydration in `TeamContext`**:
  - When the URL contains `/teams/:teamId` or `/events/:eventId`, parse the `teamId` from the route or locate the event's parent team.
  - Automatically set `selectedTeamId` to the URL parameter if valid in the coach's teams.
  - Maintain `pitch_tracker_last_team_id` in sync with the active route.
- [ ] **2.2. URL-Driven Event Hydration in `EventContext`**:
  - When loading `/events/:eventId` or `/events/:eventId/review`:
    - Query `getEventById(eventId)` from local storage.
    - Set `selectedEventId = eventId`.
    - If active sessions exist for this event, restore the most recent active session automatically.
- [ ] **2.3. Asynchronous / Cold-Start Loading States**:
  - Display a subtle skeleton/spinner while local storage or initial Firestore snapshot is resolving, preventing premature "Event not found" redirects during cold boot.
- [ ] **2.4. Invalid Entity Handling & Graceful Fallbacks**:
  - If a user visits `/events/invalid-id` or a deleted event, redirect cleanly to `/` or the parent team with an informative toast message ("Event not found or has been deleted").

---

### Phase 3: Route Transitions & Navigation Upgrades
**Goal:** Update all in-app navigation triggers to push/replace browser history entries instead of solely altering local React component state.

- [ ] **3.1. Team Switcher & Tab Navigation**:
  - Clicking a team in `TeamSwitcher` navigates to `/teams/:newTeamId/roster`.
  - Switching between "Roster & Pitch Limits" and "Events & Games" tabs updates the URL to `/teams/:teamId/roster` and `/teams/:teamId/events`.
- [ ] **3.2. Event Lifecycle Transitions**:
  - Clicking "Track Pitches" on an active or scheduled event navigates to `/events/:eventId`.
  - Clicking "View Summary" or "Review" on an ended event navigates to `/events/:eventId/review`.
  - Ending a game/session automatically transitions the URL to `/events/:eventId/review`.
  - Clicking "Back to Events" or "Exit to Team Hub" returns to `/teams/:teamId/events`.
- [ ] **3.3. Browser Back / Forward Button Handling**:
  - Test and verify that pressing the browser Back button while on `/events/:eventId` safely exits to `/teams/:teamId/events` without leaving dangling session state.

---

### Phase 4: Invite Codes, Auth Guards & Deep Redirects
**Goal:** Support seamless sharing of team invite links and preserve destination paths through the sign-in flow.

- [ ] **4.1. Invite Link Handler (`/join/:inviteCode`)**:
  - Replace raw query parameter joins with a dedicated `/join/:inviteCode` route (maintaining backwards compatibility with existing `?join=CODE` query strings).
  - If the coach is not logged in, prompt sign-in and save the destination `/join/:inviteCode` in session storage.
  - Upon successful auth, execute team join and navigate directly to `/teams/:joinedTeamId/roster`.
- [ ] **4.2. Post-Auth Return Path Preservation**:
  - If an unauthenticated user opens `/events/:eventId/review`, store the path and redirect them there immediately after sign-in instead of dropping them at the root.
- [ ] **4.3. Admin Route Protection (`/admin`)**:
  - Route `/admin` directly to `AdminDashboardView`.
  - Restrict access strictly to authorized admin emails (`tylercarringtonwa@gmail.com`), redirecting unauthorized users back to `/`.

---

### Phase 5: Verification, Offline Testing & Edge-Case Matrix
**Goal:** Verify all refresh and navigation pathways across devices and connection states.

- [ ] **5.1. Refresh Verification Matrix**:
  - [ ] **Test Case 1 (Live Game Refresh):** Log 15 pitches for Pitcher A in `/events/:eventId`. Press browser Refresh (F5). Ensure app reloads at `/events/:eventId` with Pitcher A selected, 15 pitches on the scoreboard, and pitch history intact.
  - [ ] **Test Case 2 (Event Review Refresh):** Open `/events/:eventId/review`. Press Refresh. Ensure scouting summary, strike zone heatmap, and pitcher breakdown load immediately.
  - [ ] **Test Case 3 (Roster vs Events Tab Refresh):** Select "Events & Games" tab (`/teams/:teamId/events`). Press Refresh. Ensure user remains on the Events tab rather than defaulting back to Roster.
  - [ ] **Test Case 4 (Offline Refresh):** Go offline (airplane mode). Refresh on `/events/:eventId`. Verify the app loads from service worker / local storage cache with zero errors.
  - [ ] **Test Case 5 (Direct Invite Link):** Paste `https://domain.app/join/ABC123XYZ` in a new tab. Verify team is joined and user is taken to team roster.
  - [ ] **Test Case 6 (Back/Forward Navigation):** Navigate Team Hub -> Live Event -> Review -> Team Hub. Step backward and forward through browser history; verify correct views mount without errors.

---

## 🔒 Safety & Architectural Invariants

1. **Zero Data Loss on Navigation:** Navigating away from a live event or refreshing must NEVER delete or mutate active session data or pitch logs.
2. **Offline Resilience:** All routing and entity hydration must resolve against local IndexedDB / `localStorage` stores without requiring active internet connectivity.
3. **No Breaking Changes to Sync Protocol:** Route changes operate strictly at the UI presentation and navigation layer and will not alter the multi-device tombstone and LWW sync protocols established in `SYNC_PLAN.md`.
