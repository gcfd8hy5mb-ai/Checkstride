# Checkstride release audit — 2026-10-09

Baseline: main at `8a3f07d29d53cc02a8a8b8a78bdf2377a47f5551`. Existing design, accounts, repository, and Firebase project retained. No real credentials or production financial records were used. No production security settings were changed.

## Completed fixes

- Ordered, immutable cloud-save snapshots; confirmed conditional Firestore commits reject stale document versions instead of overwriting newer data.
- Account-scoped device journals preserve changes during network failure, interruption, token refresh, reload, and sign-out. Timeouts abort write requests. Permission failures, permanent expiration, and conflicts stop inappropriate retries.
- “Saved” and form success messages require a confirmed write. A failed device backup warns the user, supports a recovery download, and prevents silent loss during sign-out.
- Cloud/device conflicts offer a recovery download and an explicit choice to continue with the cloud plan while archiving the device copy. Archived copies remain downloadable from Account. No automatic financial-record merge or cloud overwrite occurs.
- Malformed financial records stop loading/migration instead of being silently filtered away. Unknown income fields and retired-source overrides are preserved.
- Half-cent rounding, fractional-cent recommendations, and short calendar lookup horizons corrected. Approved plans invalidate for a one-cent change.
- Monthly payday anchors survive February and completion, so a January 31 schedule returns to March 31. Paycheck history is no longer truncated at 52 entries. Bill deletion retains historical payment records.
- Stale delayed bill-editor closes cannot close a newly reopened editor.
- Escaped bill identifiers in HTML attributes; malicious names/IDs remain inert text.
- Password-reset network failures no longer claim an email will be sent.
- Existing plan approval and rebuild controls are reachable under Plan → More plan details.
- PNG PWA icons and Apple touch icon added using the existing logo. Cache version advanced; caches remain scoped to Checkstride and exclude external financial/auth requests.
- Repeatable tests and a read-only GitHub Actions regression workflow added. Development tooling updated; patched gRPC and FTP dependencies selected.

## Validation evidence

| Area | Automated evidence | Scope |
| --- | --- | --- |
| Save reliability | Ordered writes, immutable snapshots, conditional conflicts including HTTP 400, failures, aborted timeouts, unconfirmed responses, recovery archival, archival failure | Unit tests; no production records |
| Financial calculations | 400 calendar cases, 600 split cases, 200 forecast/savings cases, plus known rounding, zero-income, deficit, multiple-source, edit/delete and date-boundary results | 1,200 simulated scenarios plus focused regressions |
| Account isolation | Ordinary local A/B users; cross-account reads/writes/deletes denied; signed-out requests denied; A → B → A restoration | Firebase Auth/Firestore Emulator Suite with a clearly labeled ownership fixture |
| REST transport | Successful ordinary-user conditional commits; stale update rejected without changing the record | Actual local emulator REST requests, not mocked Firestore |
| Mobile app flows | Chromium 320×568 and 430×932; WebKit 390×844; rapid edits, reload, failure recovery, account switching | Mobile browser simulations, not physical iPhones |
| Functional screens | Today, Bills, Plan, More; tab/swipe navigation, filters, detail/back/cancel controls, jobs, calendars, overrides, first-job onboarding, bills, paid toggles, goals, scenarios, approvals, feedback, coach mode, paycheck completion, history, empty states, recovery downloads | Browser automation with mocked external services |
| Authentication | Form validation, Enter submission, visibility toggle, reset request/errors, restored sessions, refresh retries, injected expired-token failures | Local emulator and browser mocks; production expiry/revocation not verified |
| PWA | Manifest sizes, Apple icon reference, service worker, offline public shell, offline restoration recovery, account journal retention, preservation of unrelated caches | Local browser automation |
| Security | HTML injection regressions; source checked for privileged credentials; runtime npm audit: zero advisories | Source/local tests; Firebase client API key is public app configuration |

Commands are recorded in `package.json`. CI runs the same groups using Node 22, Java 21, and Chromium/WebKit. See the hardening PR checks for the final CI result; this audit does not substitute local tests for GitHub CI.

Completed earlier patches:

- [PR #1](https://github.com/gcfd8hy5mb-ai/Checkstride/pull/1), commit `72a032438e33f73d643be78c17180997b0b0afaa`: initial save sequencing/recovery safeguards.
- [PR #2](https://github.com/gcfd8hy5mb-ai/Checkstride/pull/2), commit `b2466bf893c0e02cbe19b5c6a6118e5362f64c5f`: financial precision/calendar fixes and editor race.

## Remaining verification and limitations

1. **Production Firestore security is unverified.** No deployed rules file, deployment evidence, or authenticated read-only Firebase administration connection was available. `tests/firestore.fixture.rules` is an emulator-only proposed ownership fixture, not a retrieved copy of deployed rules. Do not deploy it as part of this audit. Production authorization, API-key restrictions, authorized domains, and actual token revocation still require authorized production configuration verification.
2. Physical iPhone Safari and installed-PWA checks remain unverified: keyboard, safe areas, scrolling, install/update behavior, and real-device stability. WebKit automation is a simulation.
3. Production password-reset delivery and link completion were not exercised. Automated tests verify request construction, validation, and honest failure handling, not inbox delivery.
4. Development-only npm advisories remain: 7 total (3 high, 4 moderate), centered on Firebase CLI/transitive tooling. No npm runtime dependencies are shipped with the static app; the runtime audit is clean. The emulator jobs use only local demo users, trusted test inputs, and read-only GitHub permissions. These tooling advisories are not being described as resolved.
5. Offline financial editing is not newly introduced. Offline startup provides recovery/retry instead of loading an account without revalidating its session. Conflicts preserve both copies; automatically merging a downloaded recovery file into the cloud is outside this patch.

**Release decision:** Automated coding/functionality checks support the implemented fixes. Public-release sign-off remains blocked by production security verification and real-device validation. Browser/emulator success is not production or physical-device verification.
