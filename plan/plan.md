# Navigation Consistency & App Header Plan

This document outlines the architectural design and step-by-step implementation plan to ensure the top navigation header (`AppHeader`) is consistently available across application views (excluding distraction-free live tracking sessions) and provides seamless return-to-home navigation when clicking the app icon.

---

## 🎯 Objectives & Requirements

1. **Consistent Navigation Header (`AppHeader`)**:
   - The top navigation bar must be present on all primary views, including:
     - Team Hub (`/teams/:teamSlug/roster`, `/teams/:teamSlug/events`)
     - Event Review & Post-Game Scouting (`/events/:eventSlug/review`)
     - Admin Dashboard & Settings (`/admin`)
     - Standalone / fallback error views
   - **Exclusion (Live Sessions)**:
     - Live pitch-tracking sessions (`/events/:eventSlug` or `/events/:eventId`) MUST remain in full-screen focus mode without the standard top nav bar to maximize screen real estate and prevent accidental taps during active game scoring.

2. **Interactive Brand Logo Return-to-Home**:
   - Clicking the app logo/icon in `AppHeader` should reliably navigate the user back "home":
     - Clears any selected event state.
     - Routes to the active team's roster view (e.g. `/teams/:teamSlug/roster`) or root `/` if no team is selected.
     - Provides clear visual hover/touch states and cursor feedback.

3. **Unified Layout Shell Structure**:
   - Consolidate layout wrappers into a reusable layout shell or standard view wrappers to avoid boilerplate repetition and ensure uniform spacing, header placement, sync status, and offline indicators.

---

## 📐 View Breakdown & Navigation Matrix

| View Route | Route Path | Show Top Nav (`AppHeader`)? | Purpose / Justification |
| :--- | :--- | :---: | :--- |
| **Team Hub (Roster)** | `/teams/:teamSlug/roster` | ✅ **Yes** | Primary coach dashboard & roster management |
| **Team Hub (Events)** | `/teams/:teamSlug/events` | ✅ **Yes** | Schedule, previous games, and bullpen list |
| **Select Pitcher Screen** | `/events/:eventSlug` (Picker) | ✅ **Yes** | Pitcher selection, bullpen session start & session manager |
| **Event Review / Report** | `/events/:eventSlug/review` | ✅ **Yes** | Post-game scouting summary, pitcher metrics & chart export |
| **Admin Dashboard** | `/admin` | ✅ **Yes** | System configuration, coach switches, data management |
| **Live Pitch Session** | `/events/:eventSlug` (Active) | ❌ **No (Focus Mode)** | Fast touch controls, strike zone canvas, live pitch logging |
| **Invite Landing** | `/join/:inviteCode` | ❌ / ➖ *Optional* | Dedicated join/authentication landing card |

---

## 🏛️ Architecture & Component Design

```
┌─────────────────────────────────────────────────────────────┐
│ Application Layout Shell (AppHeader + Main Content)         │
├─────────────────────────────────────────────────────────────┤
│ [ App Icon (-> Home) ]  [ Pitcher Profile ]   [ Sync | Team | Coach ] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Main View Content:                                         │
│   • Team Hub (/teams/:slug/roster | events)                 │
│   • Event Review (/events/:slug/review)                     │
│   • Admin Dashboard (/admin)                                │
│                                                             │
│  (Live Pitch Tracker runs standalone without AppHeader)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 Phased Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Brand Icon Click & Home Navigation Logic          │
│  - Update `AppHeader.tsx` icon click handler                │
│  - Resolve active team slug or fallback to '/'              │
│  - Clear selected event in `EventContext`                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 2: Add Top Nav to Event Review Route                  │
│  - Integrate `AppHeader` in `EventReviewRoute`              │
│  - Maintain breadcrumb / back button within review header   │
│  - Ensure responsive container max-width & padding          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 3: Header Consistency for Admin & Secondary Views     │
│  - Standardize `AdminDashboardView` header integration      │
│  - Standardize error & fallback screen layouts              │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ Phase 4: Automated Verification & Layout Regression Tests   │
│  - Add routing tests verifying header presence and paths    │
│  - Verify live session remains distraction-free             │
│  - Verify clicking icon resets event and navigates home     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Detailed Checklist

### Phase 1: Brand Icon Click & Home Navigation Logic
- [ ] **1.1. Update `AppHeader.tsx` Brand Click**:
  - Use `useTeam()` and `useEvent()` hooks inside `AppHeader`.
  - On brand logo click:
    - Call `selectEvent(null)` to exit any stale event context.
    - If `selectedTeam` exists, navigate to `/teams/${getCanonicalTeamSlugForTeam(selectedTeam)}/roster`.
    - If no team exists, navigate to `'/'`.
  - Add explicit `aria-label="Return to Home"` and focus/hover indicator for accessibility.

### Phase 2: Add Top Nav to Event Review Route
- [ ] **2.1. Update `EventReviewRoute` in `AppRoutes.tsx`**:
  - Wrap the view with `<AppHeader onOpenAdmin={() => navigate('/admin')} />`.
  - Maintain the page content wrapped in a consistent `<main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1">` shell.
  - Include `<OfflineIndicator />` at the bottom.

### Phase 3: Header Consistency for Admin & Secondary Views
- [ ] **3.1. Admin Dashboard Alignment**:
  - Ensure the admin screen integrates smoothly with the top nav or has a clear return path.
- [ ] **3.2. Error / Missing Team States**:
  - Ensure 404 or missing event states render `<AppHeader>` so coaches can easily navigate away without browser back-button dependency.

### Phase 4: Verification & Automated Tests
- [ ] **4.1. Unit & Regression Tests (`scripts/verify-header-navigation.ts`)**:
  - Verify live tracker route remains standalone without top nav distraction.
  - Verify review route has top nav enabled.
  - Verify brand icon home resolution logic.
