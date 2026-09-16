# Pitcher profile / scouting / coaching app — phased implementation plan

This plan picks up after the initial phase-1 build (teams, roster, events, and the live pitch-recording session) and lays out everything else in order. Each phase is additive and should be functional on its own before moving to the next. No technology/stack decisions are made here — that's intentionally left to whoever implements this.

## Engineering guidelines (apply to every phase)

- The whole app must be responsive — phone-first, since coaches use it live from the field, but usable on tablet/desktop too.
- Favor small, single-purpose, readable files over large multi-responsibility ones.
- Design each phase's data model so the *next* phase doesn't require a rewrite, without speculatively building features ahead of when they're needed.

## Phase 1 catch-up — close these gaps before moving on

The original phase-1 prompt was written before several foundational decisions were made. These are small individually but touch core data model and auth, so land them now rather than bolting them on after later phases are built on top:

- Roster entries need a **season age** field (used later for pitch-limit brackets).
- **Hit by pitch** needs to be added as a sub-option under "in play" (alongside safe/out/error).
- Sign-in is specifically via **Google account** — coaches must be signed in to use the app.
- Team join links must be **revocable and regenerable** by any coach on the team, not permanent.
- A **member list** showing everyone with access to a team.
- A coach can **leave a team** voluntarily; **only the team creator can remove** other coaches.
- Events and sessions, once ended, can be **reopened** rather than being permanently final.
- Events can be **deleted** entirely, not just edited.
- A coach can **delete a session** that was started for the wrong pitcher by mistake.

## Phase 2 — Full game mechanics (innings & outs)

Phase 1 tracks balls/strikes/pitch count. This phase adds the rest of the in-game bookkeeping:

- Additional header row for games: count, outs, first-pitch strikes.
- Auto-track strikeouts and walks from the count and pitch outcomes.
- Track innings pitched and batters faced (no opposing-batter identity needed).
- Inning ends automatically at 3 outs, plus a manual "end inning" button (for youth run-limit / bat-around rules).
- Outs auto-increment but are always manually editable — this single control covers corrections for anything not otherwise modeled (double plays, caught stealing, passed-ball outs, etc.). No dedicated UI for those individual event types — GameChanger is the team's system of record for full scorekeeping; this app only needs the manual out-count correction.

## Phase 3 — Pitch limits & rest days

A team-level safety feature, independent of the analytics work in later phases:

- Coach picks a pitch-limit preset for the team from a provided list (e.g. Little League vs. various travel-ball rule sets). No custom rule-set builder for now.
- Presets define limits by age bracket; each pitcher's individual limit comes from applying their roster season age against the team's chosen preset — not one flat number for the whole team.
- Both bullpen and game pitches count toward the limit, but a bullpen pitch nearing/hitting the limit shows a softer-styled warning than a game pitch at the same threshold.
- Limits and rest-day tracking are per team only — not aggregated across a player's other teams.
- Rest-day eligibility auto-calculates ("not eligible until [date]") and displays as "available now" / "available in X days" wherever the pitcher list appears (e.g. the roster) — no separate dedicated dashboard.
- Warnings never block the coach — they can always continue, whether the pitcher is over the pitch limit or still in mandatory rest.
- When a warning fires, flag it for later review — visible inside that event's review (phase 4), not in any team-wide alert list.
- No need to track/exclude warm-up throws separately.

## Phase 4 — Event review (post-event scouting report)

Once an event ends, give coaches a summary that works as an informal scouting report:

- List of pitchers who threw in the event with quick stats; selecting one opens more detail.
- Player detail: all pitch locations on one heatmap, color-coded by outcome (ball/strike/foul/in-play), with quick filters for those plus strikeouts.
- Any pitch-limit/rest-day warnings flagged during the event are visible here.
- All coaches' notes for that pitcher, each still editable by its author.
- Derived stats: balls, strikes, strikeouts, walks, first-pitch strike rate, swing-and-miss rate, strike percentage, pitches per inning, and other stats that make sense to add.

## Phase 5 — Player profile (season-level)

Aggregate a pitcher's data across events:

- Stats for the whole season, or a recent window (e.g. last 5) — recent-window default is games only, with an option to switch to games+bullpens combined or bullpens only.
- Location heatmap that scales with data volume: a hot/cold map style for a full season, or capped to the last 3 games, or a manual pick of up to 3 games.

## Later — not yet scoped in detail

These are real, stated goals but intentionally left undesigned until the phases above are solid:

- Exporting/sharing a post-event summary outside the app (e.g. PDF).
- Linking the same real player across their different teams' rosters.
- Any tracking related to arm-care/strength-and-conditioning programs.
