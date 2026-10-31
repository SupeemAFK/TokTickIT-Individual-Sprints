# Lab 4 Visual and Accessibility Review

Initial visual review: 2026-10-30 on PR #81's local evidence branch. Final-main recheck: 2026-10-31 on commit `5dd4ff09b425e64352cc74318bb0af9063e7ab82` (tree `35126d193c93dc26767f92efea7ce5ebee573d1c`). Application captures use local Playwright fixtures with synthetic Ticket data. The final-main Playwright suite passed all 20 tests and reproduced the application screenshots from the verified source tree. The index also includes dated GitHub-rendered repository and review snapshots. Responsive flows assert no horizontal page overflow at each recorded viewport.

## Review checklist

- [x] Zen Green colors, card hierarchy, and spacing remain consistent with the Lab 2/3 visual baseline.
- [x] Requester and Staff Dashboards captured at desktop 1440 px, tablet 768 px, and mobile 375 px.
- [x] Dashboard metrics, action lists, recent-ticket cards, and empty lists reflow without obscuring controls or text.
- [x] Staff Ticket Detail with Actions Taken captured at desktop 1440 px, tablet 768 px, and mobile 375 px.
- [x] Action Taken create form, including assignee, conditional follow-up note, and attachment notes, captured at all three viewports.
- [x] The conditional follow-up requirement stays with its labelled field; the failed-create alert is visible and entered values remain in the form.
- [x] Requester Ticket Detail with read-only Action Taken history captured at all three viewports; staff-only controls and Internal Notes are absent.
- [x] Active-action resolution conflict and successful resolution after cancellation captured at all three viewports.
- [x] Action create/edit, in-progress, complete, cancellation confirmation/cancelled, empty, load failure, recoverable create failure, dashboard empty/loading/forbidden/failure, and visible keyboard focus captured.
- [x] Editable staff controls and read-only Requester/performed-by information are visually distinguishable.
- [x] Form fields have visible labels; status, success, and error states have text and semantic live/alert roles.
- [x] Action status and role controls remain understandable without relying on color; terminal actions and Requester history expose no staff mutation controls.
- [x] Dashboard navigation exposes an active-page indication; keyboard-focus styling is asserted and captured for an Action Taken control.
- [x] Screenshots were checked for clipped content and overlapping elements; responsive flows assert no horizontal page overflow, and full-page captures include content below the viewport.
- [x] No transient hover state is intentionally retained in captures; animations are disabled and the pointer is moved away before each screenshot.

## Scope and evidence limits

The state-specific captures are generally desktop screenshots; the major screens and the create form, Requester history, and both resolution outcomes have the 1440/768/375 viewport set. The screenshots show local test fixtures, not a live database. API and database assertions for inactive assignees, role enforcement, metric parity, append-only history, and ordering are documented in [`tests.md`](tests.md).

The final-main recheck confirms the committed application screenshots match the verified source tree. It does not claim a production deployment or production-data test. The separate submission PDF includes the final-main commit identity, screenshot index, and these scope limits.
