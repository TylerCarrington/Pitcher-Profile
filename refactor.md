# Refactoring Plan: Aligning with GEMINI.md Conventions

After a comprehensive review of the codebase, it is clear that the project has outgrown its initial flat structure. Several files have become "god objects" (managing state, UI, and business logic simultaneously), and we are currently grouping by file type rather than by feature.

This `refactor.md` serves as a phased blueprint to bring the codebase into strict alignment with our `GEMINI.md` project conventions.

## Current State Analysis (The Biggest Offenders)
1. **`src/storage.ts` (1922 lines):** Currently houses every single data model operation (Teams, Players, Events, Sessions, Pitches), plus Firebase syncing and authentication logic.
2. **`src/components/TeamManagement.tsx` (1488 lines):** A monolithic UI component handling team lists, roster management, event creation, and settings.
3. **`src/components/LiveSessionView.tsx` (988 lines):** Manages the entire live pitch tracking workspace, including pitcher switching, strike zone logging, and game metrics.
4. **`src/components/EventReviewSummary.tsx` (883 lines):** Handles the massive post-event breakdown, including stats mapping and bullpen adjustments.
5. **`src/components/PitcherProfileModal.tsx` (836 lines):** A massive modal for player stats, history, and Pitch Smart status.
6. **`src/App.tsx` (731 lines):** Acts as a global orchestrator, drilling dozens of props down to components instead of utilizing modular state.

---

## Phase 1: Feature-Based Restructuring
*Rule Addressed: Group files by feature, not by file type (component/hook per feature, together).*

We will move away from the flat `src/components/` and `src/storage.ts` structure and adopt a domain-driven `src/features/` structure.

**Action Items:**
- [ ] Create a `src/features/` directory.
- [ ] Define core domains: `auth`, `teams`, `players`, `events`, `sessions`, `pitches`, `sync`.
- [ ] **Split `storage.ts`**: Break the 1900-line monolith into single-purpose feature services:
  - `src/features/teams/teamService.ts`
  - `src/features/players/playerService.ts`
  - `src/features/events/eventService.ts`
  - `src/features/sessions/sessionService.ts`
  - `src/features/sync/firebaseSync.ts`
- [ ] Move corresponding components from `src/components/` into their respective feature folders.

---

## Phase 2: Decoupling God Components
*Rule Addressed: Small, single-purpose files. One component per file. Split a file the moment it takes on more than one responsibility.*

We will break down the massive 800+ line UI files into composable, single-purpose pieces.

**Action Items:**
- [x] **Refactor `TeamManagement.tsx`**:
  - Extract `TeamList.tsx` (displaying available teams).
  - Extract `TeamRoster.tsx` (managing players).
  - Extract `TeamEventsList.tsx` (managing games/bullpens).
  - Extract dedicated modal components (`CreateTeamModal.tsx`, `EditTeamModal.tsx`, `JoinTeamModal.tsx`, `DeleteTeamModal.tsx`, `DeletePlayerModal.tsx`, `PlayerEditModal.tsx`, `TeamCoachesModal.tsx`, `TeamPitchPresetModal.tsx`).
- [x] **Refactor `LiveSessionView.tsx`**:
  - Extract `PitchLocationPicker.tsx`.
  - Extract `PitchOutcomeButtons.tsx`.
  - Extract `PitcherPicker.tsx`.
  - Extract `FastEntryGuideModal.tsx`, `EndSessionModal.tsx`, `EndEventModal.tsx`, `CoachesSharedNotes.tsx`.
- [x] **Refactor `EventReviewSummary.tsx`**:
  - Extract `EventReviewHeader.tsx`.
  - Extract `PitcherReviewCard.tsx`.
  - Extract `BullpenAdjustmentPanel.tsx`.
  - Extract `PitcherNotesEditor.tsx`.
- [x] **Refactor `PitcherProfileModal.tsx`**:
  - Break into separate tabs & components: `PitchSmartCard.tsx`, `PlayerStatsTab.tsx`, `PlayerHeatmapTab.tsx`, `PlayerHistoryTab.tsx`, `PlayerPhotoModal.tsx`.

---

## Phase 3: Eliminating Prop Drilling
*Rule Addressed: Watch for prop drilling — if state is threaded through layers that don't use it, reconsider where it lives.*

`App.tsx` is currently doing too much heavy lifting, passing down state through multiple intermediate components.

**Action Items:**
- [x] **Context Providers:** Introduce scoped React Contexts (or Zustand stores if preferred, but Context is sufficient here) to manage domain state:
  - `AuthContext` (current coach info).
  - `TeamContext` (currently selected team, roster, and team settings).
  - `EventContext` (active event, active sessions, and live pitches).
- [x] **Custom Hooks:** Create feature-collocated hooks (e.g., `useActiveSession()`, `useTeamSync()`, `useUrlJoin()`, `useSyncListener()`) to encapsulate data fetching and real-time listener logic, moving it out of `App.tsx`.
- [x] **Clean `App.tsx`:** Reduce `App.tsx` to just providers, high-level routing/layout, and offline indicators.

---

## Phase 4: Code Quality & Helper Extraction
*Rule Addressed: Extract helpers rather than growing one function. Comment the *why*, not the *what*.*

**Action Items:**
- [x] Audit complex inline logic (e.g., stats calculations inside render methods) and extract them to pure functions in `src/features/[feature]/utils.ts` (`playerStatsUtils.ts`, `eventStatsUtils.ts`, etc.).
- [x] Review all comments. Remove redundant "what" comments and enforce "why" comments explaining domain rules, safety limits, and synchronization guarantees.
- [x] Ensure all extracted components strictly follow the "file name = component name" convention.

---

## Next Steps
To begin, we should execute **Phase 1** first by creating the feature folders and splitting `storage.ts`, as this will lay the architectural foundation for splitting the React components in Phase 2.
