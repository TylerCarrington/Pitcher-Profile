# Youth Baseball Pitcher Profile, Scouting & Coaching App

A comprehensive offline-first, mobile-friendly coaching assistant designed for youth baseball coaches to manage team rosters, execute real-time pitch tracking, automatically enforce safety rules (Pitch Smart rest days), and analyze pitcher performance over the season.

---

## ⚾ Features

### 1. Team & Roster Management
- **Multi-Coach Collaboration:** Secure sign-in with Google Accounts. Real-time member lists showing coaches with access.
- **Dynamic Invite Links:** Revocable, regenerable invite links for joining teams.
- **Player Profiles:** Detail card including season age, jersey number, throwing hand, and dynamic safety status.

### 2. Live Game & Bullpen Pitch Tracking
- **Tactile Fast-Entry Interface:** Tailored for 44px+ mobile touch targets to log pitches quickly from the dugout.
- **Advanced Pitch Metrics:** Track pitch outcomes (ball, strike, foul, play in, hit by pitch), pitch types, and detailed strike sub-categories.
- **Strike Zone Grid Selector:** Direct touch coordinate logging on a responsive visual strike zone grid.
- **In-Game Bookkeeping:** Automatic tracking of balls/strikes counts, batter-by-batter outs, strikeouts, walks, and innings pitched with manual correction overrides.

### 3. Pitch Smart Safety & Rest-Day Tracker
- **Adaptive Safety Presets:** Enforce rule sets like USA Pitch Smart/Little League, determining maximum daily pitch counts and mandatory rest requirements.
- **Age-Bracket Bracket Limits:** Thresholds are applied dynamically based on the pitcher's individual roster season age.
- **Real-Time Visual Alerts:** Soft alerts for bullpen workouts and bold flags for games when a pitcher nears safety limits.
- **Rest Eligibility Tracker:** Live availability countdowns ("Available now" or "Available in X days") automatically populated across all rosters and selectors.

### 4. Post-Event Review & Analytics
- **Informal Scouting Reports:** Visual game summaries for completed events.
- **Interactive Strike Zone Heatmap:** Color-coded location tracking by outcome (ball/strike/foul/in-play) with quick filtering.
- **Shared Coaching Notes:** Real-time editable notes per pitcher by contributing coaches.
- **Advanced Derived Statistics:** Calculations for strike percentage, swing-and-miss rate, first-pitch strike rate, walks/strikeouts, and pitches-per-inning.

### 5. Multi-Event Player Profiles
- **Season Aggregations:** Comprehensive statistics across events.
- **Dynamic Performance Heatmaps:** Hot/cold zones scaling dynamically with data volume across customizable session windows.

---

## 🛠️ Technology Stack

- **Frontend:** React 18+ (Vite, TypeScript, Tailwind CSS)
- **Database & Sync:** Firebase Firestore & Firebase Authentication
- **Local Persistence:** LocalStorage offline-first cache facade (`localStore.ts` & `storage.ts`) with bi-directional synchronization (`syncService.ts`)
- **Icons & Animations:** Lucide React icons & Motion layout transitions

---

## 📂 Project Architecture

The codebase follows a strict feature-modular folder structure:

```
src/
├── components/          # Shared layout and general utility components
├── features/            # Feature modules
│   ├── admin/           # Super-admin dashboard
│   ├── auth/            # Firebase auth context & screens
│   ├── events/          # Event management, summaries, adjustments, and review cards
│   ├── pitches/         # Strike zone grids, heatmaps, outcome controls, and edit modals
│   ├── players/         # PitchSmart badges, player stats tabs, and photo modals
│   ├── sessions/        # Live tracking dashboards, pitcher pickers, and coach note boards
│   ├── sync/            # Offline-first Firestore synchronization listeners
│   └── teams/           # Team switchers, rosters, and invitations
├── store/               # Offline-first LocalStore mechanism
├── utils/               # PitchSmart rule algorithms and general helpers
├── storage.ts           # Facade storage data-access layer
└── types.ts             # Shared application TypeScript interfaces and types
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or bun

### Installation
1. Install the dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quality & Standards Compliance
To ensure strict code cleanliness, run verification checks:
- **Lint Codebase:** `npm run lint`
- **Build Production Bundle:** `npm run build`

---

## 📜 Safety Rule Single Source of Truth
The core algorithm for determining youth safety rest requirements resides entirely in `src/utils/pitchSmart.ts`. This file implements the rule-set presets (e.g. `usa_pitch_smart`) and is the exclusive source for:
- Maximum daily pitch thresholds
- Pitcher age-bracket classification
- Mandatory calendar days of rest based on pitch volume
