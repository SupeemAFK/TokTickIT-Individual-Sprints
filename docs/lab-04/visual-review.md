# Lab 4 Visual and Accessibility Review

Reviewed 2026-10-30 on PR #81's local evidence branch. Captures use local Playwright fixtures with synthetic ticket data. The full Lab 1–4 Playwright suite passed: 20 tests. The suite also asserts that the document has no horizontal overflow at each recorded viewport.

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

## Scope and remaining work

The state-specific captures are generally desktop screenshots; the major screens and the create form, Requester history, and both resolution outcomes have the requested 1440/768/375 viewport set. The screenshots show test fixtures, not a live database. API and database assertions for inactive assignees, role enforcement, metric parity, append-only history, and ordering are documented in [`tests.md`](tests.md).

This is PR/staging evidence, not a claim about the final release. Repeat the visual review on the exact final `main` commit, record that commit and test output, and attach the final screenshots to the separate submission PDF.
