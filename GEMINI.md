# GEMINI.md — project conventions

**Project:** Pitcher profile/scouting/coaching app for youth baseball — live pitch tracking (outcome + location), pitch-limit/rest-day rules, post-event scouting reports, season player profiles. Check requirements/phased-plan docs for current scope before coding.

**Stack:** React 18+ (Vite, TypeScript, Tailwind CSS), Firebase Firestore/Auth, LocalStorage offline-first cache.

**Architecture & State:**
- **Feature Modules (`src/features/`):** Group by feature (`auth`, `teams`, `events`, `pitches`, `sessions`, `players`, `sync`), each containing its own `components/`, `hooks/`, `context/`, `utils/`.
- **State Management:** Use scoped React contexts via custom hooks: `useAuth()`, `useTeam()`, `useEvent()`, and `useSyncListener()`. Do not prop-drill across views.
- **Data Layer:** `storage.ts` facade delegates to domain services (`src/features/*/services.ts`) backed by `localStore.ts` with Firestore bi-directional cloud synchronization (`syncService.ts`).
- **Safety / Rest Rules:** `src/utils/pitchSmart.ts` is the single source of truth for age-bracket thresholds, daily pitch limits, and required rest days.

**Code rules:**
- Small, single-purpose files. One component per file, file name = component name.
- Split a file the moment it takes on more than one responsibility — don't wait.
- Group files by feature, not by file type.
- Descriptive names over short/clever ones.
- Extract computational/formatting logic to pure functions in feature `utils/` files.
- Comment the *why* (domain logic, sync invariants, safety rules), not the *what*.

**Responsive & UX:**
- Phone-first layout with touch-friendly controls (min 44px touch targets). Must scale gracefully to tablet and desktop.

**Scope discipline:** Build only the current phase. Ask rather than guess on ambiguous requirements.
