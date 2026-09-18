# Clean & Human-Readable URLs Plan

This document details the architectural design and phased implementation plan to transform raw internal database keys (e.g. `/events/event_1789745355781_pfxo` and `/teams/team_1789745300123_abcd`) into clean, meaningful, human-readable URLs (e.g. `/events/vs-raptors-sep18` or `/events/game-vs-raptors-k4x` and `/teams/sluggers-12u/roster`).

---

## 🎯 Executive Summary & Objectives

### The Problem
Currently, the application exposes internal timestamp-based database identifiers directly in the URL address bar:
- **Events:** `/events/event_1789745355781_pfxo` and `/events/event_1789745355781_pfxo/review`
- **Teams:** `/teams/team_1789745300123_abcd/roster` and `/teams/team_1789745300123_abcd/events`

While functional for state hydration, these URLs present several UX drawbacks:
1. **Visual Clutter:** High cognitive load for coaches and parents when looking at or sharing links.
2. **Lack of Context:** A URL like `event_1789745355781_pfxo` gives zero hint about the opponent, date, or event type (e.g., game vs. bullpen).
3. **Fragility in Communication:** Copying and pasting long string keys into text messages or emails looks like raw technical error codes.

### Core Objectives
1. **Human-Readable Semantic Slugs:** Transform URLs to reflect meaningful domain information (e.g., `/events/vs-raptors-sep18` or `/events/bullpen-marcus-sep18`).
2. **Zero Breaking Changes / 100% Backwards Compatibility:** Existing raw IDs (`event_...`, `team_...`) must continue to resolve instantly so existing links, stored cache data, and Firestore sync invariants never break.
3. **Deterministic Collision Handling:** If two events have the same opponent or date, append a compact 3-character hash suffix (e.g., `vs-raptors-sep18-7k2`).
4. **Automatic Canonicalization:** Navigating to an old raw ID automatically replaces the browser URL state with the canonical pretty slug without causing full page reloads.
5. **Clean Share Links:** In-app share and export actions produce short, clean, human-readable URLs.

---

## 📐 URL Schema Comparison

| Resource Type | Current "Ugly" URL | Target Clean URL (Recommended) | Fallback / Collision URL |
| :--- | :--- | :--- | :--- |
| **Team Roster** | `/teams/team_1789745300123_abcd/roster` | `/teams/sluggers-12u/roster` | `/teams/sluggers-12u-8k/roster` |
| **Team Events** | `/teams/team_1789745300123_abcd/events` | `/teams/sluggers-12u/events` | `/teams/sluggers-12u-8k/events` |
| **Live Game** | `/events/event_1789745355781_pfxo` | `/events/vs-raptors-sep18` | `/events/vs-raptors-sep18-4x9` |
| **Live Bullpen** | `/events/event_1789745355781_pfxo` | `/events/bullpen-sep18` | `/events/bullpen-sep18-2m1` |
| **Game Review** | `/events/event_1789745355781_pfxo/review` | `/events/vs-raptors-sep18/review` | `/events/vs-raptors-sep18-4x9/review` |
| **Team Invite** | `/join/EAGLES-1234` | `/join/EAGLES-1234` *(Already clean)* | `/join/EAGLES-1234` |

---

## 🏛️ Architectural Strategy

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Immutable Primary Key (Database & Firestore)             │
│    - Underlying Firestore & LocalStorage key stays:         │
│      id: "event_1789745355781_pfxo"                         │
│    - Guarantees data sync invariants and offline cache      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 2. Dual-Key Slug Resolver Layer                             │
│    - Slug computed from metadata:                           │
│      e.g., event.type + opponent/title + date (+ shortId)   │
│    - Lookup index: `getEventByIdOrSlug(identifier)`         │
│    - Matches either `id === identifier` OR `slug === id`    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ 3. Router & Canonical URL Sync                              │
│    - Route definition: `/events/:eventIdentifier`           │
│    - If URL contains raw `event_...`, update address bar   │
│      to canonical slug via `history.replaceState`           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 Phased Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Slug Generation & Formatting Utilities             │
│  - Create `src/utils/slugUtils.ts`                          │
│  - Pure formatting functions for teams and events           │
│  - Add collision prevention hash helpers                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 2: Dual-Key Resolution in Storage & Services          │
│  - Update `eventService.ts` with `getEventByIdOrSlug()`     │
│  - Update `teamService.ts` with `getTeamByIdOrSlug()`       │
│  - Optional `slug` field cached on models for fast indexing │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 3: Route Integration & URL Canonicalization           │
│  - Update `AppRoutes.tsx` event & team route loaders        │
│  - Use canonical slug in `navigate()` calls                 │
│  - Auto-canonicalize raw IDs to pretty slugs in browser bar │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 4: UI Share Controls & Navigation Triggers            │
│  - Update event cards and action buttons to use clean URLs  │
│  - Update share dialogs and clipboard links                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 5: Test Matrix & Verification                         │
│  - Verify deep-linking via clean slug vs legacy raw ID      │
│  - Verify browser refresh on clean slug routes              │
│  - Run sync regression matrix & verify no broken references │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Detailed Phase Checklist

### Phase 1: Slug Generation & Formatting Utilities
**Goal:** Implement pure utility functions to generate clean, URL-safe slugs from event and team metadata.

- [ ] **1.1. Create Slug Utility (`src/utils/slugUtils.ts`)**:
  - `generateTeamSlug(team: Team): string`
    - Converts `"Eastside Sluggers 12U"` -> `"sluggers-12u"`.
  - `generateEventSlug(event: BaseballEvent): string`
    - Game: `"vs-" + sanitize(event.opponent || "opponent") + "-" + formatDate(event.date)` -> `"vs-raptors-sep18"`.
    - Practice/Bullpen: `"bullpen-" + formatDate(event.date)` or `"practice-" + formatDate(event.date)`.
  - `sanitizeSlug(text: string): string` (strips special characters, converts spaces to hyphens, lowercase).
- [ ] **1.2. Short Hash Suffix for Uniqueness**:
  - Helper to append a 3-character compact hash derived from the event ID (e.g. `-pfx`) if needed to guarantee uniqueness across different seasons.

---

### Phase 2: Dual-Key Resolution in Storage & Services
**Goal:** Enable seamless lookup by either the human-readable slug OR the internal ID across all domain services.

- [ ] **2.1. Event Resolution (`src/features/events/eventService.ts`)**:
  - Implement `getEventByIdOrSlug(identifier: string): BaseballEvent | undefined`.
  - Resolves matching `event.id === identifier` OR `getEventSlug(event) === identifier`.
- [ ] **2.2. Team Resolution (`src/features/teams/teamService.ts`)**:
  - Implement `getTeamByIdOrSlug(identifier: string): Team | undefined`.
  - Resolves matching `team.id === identifier` OR `getTeamSlug(team) === identifier`.
- [ ] **2.3. Cache Invariants**:
  - Verify that local storage and Firestore documents maintain stable immutable IDs (`event_...` / `team_...`) to avoid database migrations.

---

### Phase 3: Route Integration & URL Canonicalization
**Goal:** Connect the clean slugs to React Router and canonicalize URLs on page load.

- [ ] **3.1. Route Parameters Update (`src/routes/AppRoutes.tsx`)**:
  - Update route handlers (`/events/:eventIdentifier`, `/events/:eventIdentifier/review`, `/teams/:teamIdentifier/*`) to resolve models via `getEventByIdOrSlug` and `getTeamByIdOrSlug`.
- [ ] **3.2. Browser URL Canonicalization**:
  - When an event view mounts, if the current URL parameter is the raw ID (`event_...`), seamlessly replace the browser history entry with the pretty slug (`/events/vs-raptors-sep18`) using `navigate(canonicalUrl, { replace: true })`.
- [ ] **3.3. Navigation Triggers**:
  - Update `navigate(\`/events/\${eventSlug}\`)` calls when starting games or opening reviews.

---

### Phase 4: UI Share Controls & Navigation Triggers
**Goal:** Ensure all user-facing share links and copy actions present the clean URL format.

- [ ] **4.1. Event Review Share Buttons**:
  - Update copy-link and report sharing to emit `https://.../events/vs-raptors-sep18/review`.
- [ ] **4.2. Team Hub Links**:
  - Ensure links copied from the team management page or event lists use the clean slug format.

---

### Phase 5: Test Matrix & Verification
**Goal:** Guarantee complete resilience across refreshes, offline states, and legacy links.

- [ ] **5.1. Automated Verification Script (`scripts/verify-clean-urls.ts`)**:
  - [ ] **Test Case 1 (Slug Generation):** Validate formatting for games, bullpens, practices, and teams.
  - [ ] **Test Case 2 (Dual-Key Resolution):** Verify both slug and raw ID retrieve the exact same entity.
  - [ ] **Test Case 3 (Legacy ID Canonicalization):** Verify legacy bookmarks resolve correctly without errors.
  - [ ] **Test Case 4 (Refresh on Pretty URL):** Verify refreshing `/events/vs-raptors-sep18` reconstructs full event state, sessions, and pitches.
  - [ ] **Test Case 5 (Offline Mode):** Verify clean URL resolution works purely from local cache when disconnected.
