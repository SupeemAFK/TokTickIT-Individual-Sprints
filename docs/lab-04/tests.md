# Lab 4 Test Plan and Traceability

This plan is created before implementation. Results remain Planned until the named check is run on the candidate branch. Each acceptance criterion in specification.md maps to at least one test row.

| Test ID | Type | AC | Scenario / expected result | Planned file or check | Result |
|---|---|---|---|---|---|
| DB-01 | Migration integration | AC-01, AC-14 | Apply additive migration to disposable Lab 3 data; preserve counts/FKs and backfill resolvedAt; restore pre-migration backup in recovery drill | server/tests/lab-04/migration.integration.test.ts | Planned |
| DB-02 | Seed integration | AC-14 | Run seed twice; row counts and identities stay stable; all status/priority/action combinations exist | server/tests/lab-03/seed.integration.test.ts | Planned |
| API-01 | API validation | AC-02, AC-04 | Create valid action; trim/bound text; validate ISO offset and conditional follow-up note | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-02 | API authorization | AC-03, AC-06 | Performer derives from session; Requester own-ticket read succeeds; cross-owner read is 404; Requester writes fail | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-03 | API assignment | AC-03, AC-04 | Active IT Staff/Admin can be assigned; inactive, missing, or Requester assignees fail; owner/assignee/performer remain distinct | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-04 | API action lifecycle | AC-05, AC-13 | Allowed status changes pass; terminal actions reject edits; stale expectedUpdatedAt returns 409 without overwrite | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-05 | Idempotency | AC-13 | Same Idempotency-Key, actor, Ticket, and payload replay returns the same action; conflicting reuse safely returns 409 | server/tests/lab-04/actions-taken.api.test.ts | Planned |
| API-06 | Ticket workflow | AC-07, AC-08, AC-09 | Exercise the full transition matrix; active action blocks resolve; zero-action/terminal-action ticket resolves; resolvedAt set/retained/cleared | server/tests/lab-04/ticket-workflow.api.test.ts and server/tests/lab-03/staff-ticket-detail.api.test.ts | Planned |
| API-07 | Concurrency | AC-13 | Concurrent resolve/action writes serialize; stale expectedCurrentStatus/expectedUpdatedAt returns 409 and persists no partial change | server/tests/lab-04/ticket-workflow.api.test.ts | Planned |
| API-08 | Staff dashboard | AC-10, AC-12 | Full counts, owned/unassigned, status/priority zero buckets, current-user actions, recent ordering, UTC 7-day boundary, role denial | server/tests/lab-04/staff-dashboard.api.test.ts | Planned |
| API-09 | Requester dashboard | AC-11, AC-12 | Every query is own-ticket scoped; attention, recently updated/resolved, UTC 30-day boundary, empty state, role denial | server/tests/lab-04/requester-dashboard.api.test.ts | Planned |
| UI-01 | Component | AC-02–AC-06, AC-13 | Create/assign/edit/transition/complete/cancel, performer read-only, conditional note, requester read-only, busy/validation/error/retry behavior | client/tests/lab-04/ActionsTaken.test.tsx | Planned |
| UI-02 | Component | AC-10, AC-12 | Staff metrics, My Actions, Ticket drill-down, loading/error/empty states | client/tests/lab-04/StaffDashboard.test.tsx | Planned |
| UI-03 | Component | AC-11, AC-12 | Requester-only metrics/lists, attention state, detail drill-down, loading/error/empty states | client/tests/lab-04/RequesterDashboard.test.tsx | Planned |
| UI-04 | Component | AC-07–AC-09 | Only allowed Ticket transitions shown; conflict refreshes summary and preserves page | client/tests/lab-04/TicketWorkflow.test.tsx | Planned |
| UI-05 | Accessibility/style | AC-16 | Labels, keyboard path/focus, announcement roles, text status cues, Zen Green consistency | client/tests/lab-04/AccessibilityAndStyle.test.tsx; manual checklist | Planned |
| UI-06 | Responsive | AC-16, AC-17 | Screens fit 375/768/1440 px without clipping, overlap, or horizontal page overflow | client/e2e/lab-04/dashboards.spec.ts and actions-taken-flow.spec.ts; screenshots | Planned |
| E2E-01 | End-to-end | AC-02–AC-06, AC-13 | Staff records multiple actions, assigns another staff member, retries safely, completes/cancels, Requester sees read-only history | client/e2e/lab-04/actions-taken-flow.spec.ts | Planned |
| E2E-02 | End-to-end | AC-07–AC-09 | Allowed Ticket transitions and incomplete-action resolution conflict through real UI/API flow | client/e2e/lab-04/ticket-resolution.spec.ts | Planned |
| E2E-03 | End-to-end | AC-10–AC-12 | Role dashboard navigation, metrics, empty state, and authorized Ticket drill-down | client/e2e/lab-04/dashboards.spec.ts | Planned |
| REG-01 | Regression | AC-15 | Server and client suites/builds preserve Labs 1–3 behavior | server: npm test, npm run build; client: npm test, npm run build | Planned |
| REG-02 | Regression E2E | AC-15 | Full existing and Lab 4 Playwright suite passes without skipped required flows | client: npm run test:e2e | Planned |
| PERF-01 | Performance smoke | AC-10–AC-12 | Seed local PostgreSQL; inspect query plans/index use and record dashboard response timings; recent lists are bounded and no per-row query loop exists | server/tests/lab-04/dashboard-performance.smoke.test.ts and recorded run note | Planned |
| DOC-01 | Evidence review | AC-17 | Contract, reviewer/AI-use records, screenshot manifest, final results, and PR links match the reviewed commit; no fabricated review | Manual release checklist | Planned |

## Execution notes

- Use a disposable PostgreSQL database for migration/recovery testing. Do not apply a rollback that could delete newly recorded actions.
- API tests cover role/ownership boundaries independently of UI hiding.
- Dashboard tests assert exact query scope, metric windows, stable ordering, and explicit zero buckets.
- Playwright captures the implemented screens at 1440, 768, and 375 px. Inspect screenshots visually and retain them under artifacts/lab-04/screenshots/.
- At final release, replace Planned with exact result and command/run evidence. Do not report live migration/performance checks as passed unless they were run against a database.
