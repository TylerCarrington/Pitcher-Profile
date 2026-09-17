# GEMINI.md — project conventions

**Project:** Pitcher profile/scouting/coaching app for youth baseball — live pitch tracking (outcome + location), pitch-limit/rest-day rules, post-event scouting reports, season player profiles. Check the requirements/phased-plan docs for the current phase's scope before coding — don't assume.

**Stack:** React (frontend), Firebase (backend/data/auth), hosted on GitHub Pages.

**Code rules:**
- Small, single-purpose files. One component per file, file name = component name.
- Split a file the moment it takes on more than one responsibility — don't wait.
- Group files by feature, not by file type (component/hook per feature, together).
- Descriptive names over short/clever ones.
- Extract helpers rather than growing one function.
- Watch for prop drilling — if state is threaded through layers that don't use it, reconsider where it lives.
- Comment the *why*, not the *what*.

**Responsive:** every screen is phone-first, and must also work on tablet/desktop.

**Scope discipline:** build only the current phase. Ask rather than guess on ambiguous requirements.
