# Lab 3 Test Plan and Traceability

The plan was approved before implementation. Rows marked `Pass on feature branch; final main pending` have executable coverage on `feature/lab3-test-coverage`; they become final `Pass` only after the same commit is merged into `main` and the release command output is recorded. Required behavior is covered at unit, API/integration, UI, style/accessibility, responsive, security/authorization, migration/regression, and E2E levels.

| ID | Type | Requirement/AC | Scenario | Automated path | Status |
|---|---|---|---|---|---|
| UNIT-01 | Unit/Security | BR-02, BR-03 | Password rules, scrypt hash/verify, and expired-session rejection | `server/tests/lab-03/auth.unit.test.ts`, `authorization.api.test.ts` | Pass on feature branch; final main pending |
| API-01 | API | AC-01–04 | Valid/invalid/inactive login, `/me`, first-login gate, password change, logout | `server/tests/lab-03/auth.api.test.ts`, `password-change.api.test.ts` | Pass on feature branch; final main pending |
| API-02 | Security | AC-05–07 | Session ownership overrides requester hints; requester cannot read notes or other tickets | `server/tests/lab-03/authorization.api.test.ts`, `requester-security.api.test.ts` | Pass on feature branch; final main pending |
| API-03 | Migration/seed | AC-06, AC-13 | Existing requester backfill preserves ticket ownership; a fresh database creates assigned tickets, comments, notes, and remains idempotent on reseed | `server/tests/lab-03/migration.api.test.ts`, `server/tests/lab-03/seed.integration.test.ts` | Pass on feature branch; final main pending |
| API-04 | API | AC-08 | Queue search/filter/sort/pagination, invalid queries, counts, role protection | `server/tests/lab-03/staff-queue.api.test.ts` | Pass on feature branch; final main pending |
| API-05 | API | AC-09–10 | Claim race, assignment, IT Priority, transitions, comments, notes, attachments | `server/tests/lab-03/staff-ticket-detail.api.test.ts`, `comments-notes.api.test.ts`, `staff-admin-contract.api.test.ts`, `server/tests/lab-02/attachments.api.test.ts` | Pass on feature branch; final main pending |
| API-06 | API/security | AC-11–12, AC-17 | Admin list/search/role filter/create/edit/activation/reset, final-admin safeguards, and owner integrity for active, inactive, and CLOSED-ticket owners | `server/tests/lab-03/users-admin.api.test.ts` | Pass on feature branch; final main pending |
| API-07 | Regression | AC-06 | Authenticated requester ticket/detail/attachment behavior retains Lab 2 validation | Existing Lab 2 tests migrated/extended under `server/tests/lab-02/` | Pass on feature branch; final main pending |
| API-08 | Contract | AC-01, AC-08, AC-11, AC-15 | Exact success/error JSON shapes, stable error codes, queue count semantics, defaults, and status codes | `server/tests/lab-03/api-contract.test.ts` | Pass on feature branch; final main pending |
| API-09 | Seed/regression | AC-13, AC-15 | Fresh-database first seed creates owner/comment/note workflow data and a second seed changes no counts or hashes | `server/tests/lab-03/seed.integration.test.ts` | Pass on feature branch; final main pending |
| API-10 | Migration/admin regression | AC-11, AC-13, AC-17 | IT Staff/Administrator → Requester reuses an existing link or creates one transactionally; restored Requester reuses its link; existing ticket ownership is preserved | `server/tests/lab-03/users-admin.api.test.ts`, `server/tests/lab-03/migration.api.test.ts` | Pass on feature branch; final main pending |
| UI-01 | UI/accessibility | AC-01–04 | Login, safe errors, busy state, password labels/rules/change/logout | `client/tests/lab-03/Login.test.tsx`, `ChangePassword.test.tsx` | Pass on feature branch; final main pending |
| UI-02 | UI/security | AC-05–07 | Authenticated Requester navigation, detail, comments, resolution signal, no notes | `client/tests/lab-03/Requester.test.tsx` | Pass on feature branch; final main pending |
| UI-03 | UI/responsive | AC-08 | Queue controls, states, status/priority/owner badges, desktop/tablet/mobile representation | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Pass on feature branch; final main pending |
| UI-04 | UI/security | AC-09–10 | Staff detail ownership/workflow/comments/notes/attachments and privacy | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Pass on feature branch; final main pending |
| UI-05 | UI/responsive | AC-11–12 | Admin search/list/create/edit/activation/role/reset and safeguards | `client/tests/lab-03/UserManagement.test.tsx` | Pass on feature branch; final main pending |
| STYLE-01 | Style/a11y | AC-14 | Zen Green tokens, labels, focus, badges, readable states, overflow | `client/tests/lab-03/ZenGreenLab3.test.tsx` | Pass on feature branch; final main pending |
| E2E-01 | E2E | AC-01–07 | Login, first-login change, requester create/detail/comment/resolution/attachments/logout | `client/e2e/lab-03/authentication.spec.ts`, `authenticated-requester.spec.ts` | Pass on feature branch; final main pending |
| E2E-02 | E2E | AC-08–10 | Staff queue search/filters/page, claim, status, priority, public comment, internal note | `client/e2e/lab-03/staff-ticket-flow.spec.ts` | Pass on feature branch; final main pending |
| E2E-03 | E2E | AC-11–12 | Admin search/create/edit/activation/reset and forbidden non-admin access | `client/e2e/lab-03/user-administration.spec.ts` | Pass on feature branch; final main pending |
| E2E-04 | Responsive | AC-14 | Major screens at desktop/tablet/mobile widths with no overflow | `client/e2e/lab-03/responsive.spec.ts` | Pass on feature branch; final main pending |

## Feature-branch validation snapshot

Validation was run on `feature/lab3-test-coverage` with Node.js 24.15.0 before opening the review PR:

- Server: 23 test files, 70 tests passed; TypeScript build passed.
- Client: 14 test files, 33 tests passed; TypeScript and production build passed.
- Browser: 7 tests passed, including Lab 2 regression plus Lab 3 authentication, authenticated Requester, staff workflow, Administrator, and responsive coverage.
- `git diff --check` passed.

The statuses above remain final-main pending until the same reviewed branch is merged through `lab3-staging` into `main`.

## Acceptance traceability

- AC-01: UNIT-01, API-01, UI-01, E2E-01
- AC-02: API-01, UI-01, E2E-01
- AC-03: API-01, UI-01, E2E-01
- AC-04: API-01, UI-01, E2E-01
- AC-05: API-02, API-07, UI-02
- AC-06: API-02, API-03, API-07, UI-02, E2E-01
- AC-07: API-02, API-05, UI-02, UI-04, E2E-01
- AC-08: API-04, UI-03, E2E-02
- AC-09: API-05, UI-04, E2E-02
- AC-10: API-02, API-05, UI-02, UI-04, E2E-01, E2E-02
- AC-11: API-06, API-10, UI-05, E2E-03
- AC-12: API-06, UI-05, E2E-03
- AC-13: API-03, API-07, API-09, API-10, seed/idempotence regression tests
- AC-14: STYLE-01, UI-03, UI-05, E2E-04
- AC-15: API-08, API-09, all planned rows, and final command set
- AC-16: release evidence and PDF review checklist
- AC-17: API-06, API-10, UI-05, and owner-integrity regression cases

## Required verification commands

```text
cd server && npm test && npm run build
cd client && npm test && npm run build
cd client && npm run test:e2e
```

No required test may be skipped, duplicated as a placeholder, or marked Pass without current output from the final `main` commit. The final record must include test counts, build results, responsive evidence, and links to the exact files.
