# Firebase sync debugging plan

## Symptoms reported

- App is open across multiple devices, browsers, and as an installed PWA.
- Deleted teams reappear later, sometimes on a different device than where they were deleted.
- Sessions fail to reopen on one device, or a reopen doesn't stick — it syncs back to closed.
- Admin-mode delete has the same "comes back" problem, so this isn't just a permissions gap — admin can seemingly delete successfully and it still doesn't stay deleted.

## Why this needs one investigation, not five separate fixes

All of these symptoms share the same shape: **a stale piece of client state eventually gets written back to the server, overwriting a newer/correct state.** That's true whether the "newer state" is "team deleted," "session closed," or "session reopened." Patching each occurrence individually (re-delete the team, force the session closed again) will not fix the underlying cause and will keep resurfacing in new spots. The goal here is to find *why* stale client state is winning, then fix that mechanism once.

## Leading hypothesis — check this first

**Offline persistence writing back stale cached state.** The Firebase client SDK caches data locally (IndexedDB on web) and, by default, queues writes made while offline to replay once reconnected. Across multiple devices, each one has its own independent local cache. If a device was offline (or just had a stale in-memory copy) when a delete/close happened elsewhere, and that device later performs *any* write derived from its stale local state — even something unrelated, like an auto-save or a "last viewed" update — it can recreate the deleted document or flip a status field back.

This fits every symptom described: it doesn't care whether the write came from an admin path or a regular one, and it explains both "reappears later" and "reopen doesn't stick" as the same mechanism in different directions.

Worth noting: offline support was explicitly **not** a stated requirement for this app. If Firestore's offline persistence is enabled (it often is by default depending on setup) without a deliberate decision to support it, this bug class can show up even though nobody asked for offline capability. Two real fixes, not a workaround:
- Disable offline persistence entirely, since it isn't a requirement — the app can assume a connection.
- Or, if it's needed for some reason, configure it properly for multi-tab/multi-device (Firestore has a specific multi-tab persistence mode; the default single-tab mode is a known source of exactly this kind of bug when more than one tab or device is active).

## Other hypotheses to rule out

1. **Full-object overwrites instead of targeted updates.** If any code reads an entire document into local state, mutates it, and writes the whole thing back (rather than a targeted field update or a transaction), two devices can race and the "loser" silently reverts the other's change — including a delete.
2. **Denormalized copies not cleaned up atomically.** If team/session data is duplicated anywhere (e.g. a roster snapshot inside an event, a team reference inside a user's profile), a delete needs to remove all copies in one atomic operation (batched write or transaction). If it's sequential separate writes, a partial failure — or another device reading a copy mid-cleanup — can reintroduce the "deleted" data.
3. **A background process re-creating data.** A Cloud Function trigger or client-side "sync/reconcile" routine that upserts data without first checking whether the parent record still exists could recreate something right after it's deleted.
4. **Stale app version on one device.** If the PWA's service worker is caching an old JS bundle, that device could be running pre-fix logic. Rule this out early so it doesn't confound the real investigation.
5. **Security rules silently rejecting part of a batched/multi-document operation.** Worth checking directly, though the fact that even admin mode has the problem makes this less likely to be the primary cause.

## Investigation steps, in order

1. Confirm which Firebase product is in use (Firestore vs. Realtime Database) and the current persistence configuration — is offline persistence enabled, and if so, single-tab or multi-tab mode?
2. Reproduce with two tabs/devices open side by side. Delete a team on one. Watch the other's network activity (enable Firestore debug logging) — does it send an outgoing write shortly after, and what in the code triggered that write?
3. Audit every delete code path (including the admin one) — do they use a single atomic operation (batch/transaction) that removes the primary doc and every denormalized copy together, or are there separate/sequential writes?
4. Grep for any write built from a full local object (`.set()`/`update()` fed by client-held state) rather than a targeted field update, a transaction, or fresh server data — especially around session open/close and team membership.
5. Confirm all test devices are running the same build before drawing conclusions (hard refresh, unregister the service worker if needed).
6. Review security rules for the affected collections to confirm they're not part of the problem, now that admin mode has been shown to have the same issue.

## Fix principles once the root cause is confirmed

- Prefer transactions or batched writes for any operation touching more than one document.
- Avoid full-document overwrites built from client-held state; use targeted field updates instead.
- If data is denormalized in multiple places, centralize the mutation of all copies (e.g. one Cloud Function on write/delete) rather than relying on every client code path to keep them in sync.
- Make offline persistence a deliberate decision, not a default — either turn it off since it isn't a requirement, or configure it correctly for multi-device use.

## What not to do

Don't fix this by re-applying the delete/close a second time, adding retry loops, or other patches aimed at individual symptoms. That's the whack-a-mole pattern already in play — work through the steps above and confirm the actual mechanism before changing code to fix it.