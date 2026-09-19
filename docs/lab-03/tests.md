# Lab 3 Test Plan and Traceability

Tests are planned before implementation. A row remains Planned until the named test exists and passes on the final `main` branch. Required behavior is covered at unit, API/integration, UI, style/accessibility, responsive, security/authorization, migration/regression, and E2E levels.

| ID | Type | Requirement/AC | Scenario | Automated path | Status |
|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-02, BR-03 | Password rules, scrypt hash/verify, session expiry/token handling | `server/tests/lab-03/auth.unit.test.ts` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |
| API-01 | API | AC-01–04 | Valid/invalid/inactive login, `/me`, first-login gate, password change, logout | `server/tests/lab-03/auth.api.test.ts`, `server/tests/lab-03/password-change.api.test.ts` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |
| API-02 | Security/workflow | AC-05–07 | Session ownership overrides requester hints; owned versus non-owned Public Comments; blank-content rejection; authenticated author derivation; resolution signal without formal close | `server/tests/lab-03/requester-workflow.api.test.ts`, `server/tests/lab-03/requester-security.api.test.ts` | Implemented on PR #53; merged into staging; passed on final main commit `da505ee` |
| API-03 | Migration/seed | AC-06, AC-13 | Existing requester backfill preserves ticket ownership; a fresh database creates assigned tickets, comments, notes, and remains idempotent on reseed | `server/tests/lab-03/migration.api.test.ts`, `server/tests/lab-03/seed.integration.test.ts`, `server/tests/lab-02/database-seed.test.ts` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |
| API-04 | API | AC-08 | Queue search/filter/sort/pagination, invalid queries, counts, role protection | `server/tests/lab-03/staff-queue.api.test.ts` | Implemented on PR #54; merged into staging; passed on final main commit `da505ee` |
| API-05 | API | AC-09–10 | Claim race, assignment, IT Priority, transitions, comments, notes, attachments | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Implemented on PR #55; merged into staging; passed on final main commit `da505ee` |
| API-06 | API/security | AC-11–12, AC-17 | Admin list/search/role filter/create/edit/activation/reset, final-admin safeguards, and owner integrity for active, inactive, and CLOSED-ticket owners | `server/tests/lab-03/users-admin.api.test.ts` | Implemented on PR #56; merged into staging; passed on final main commit `da505ee` |
| API-07 | Regression | AC-06 | Authenticated requester ticket/detail/attachment behavior retains Lab 2 validation | Existing Lab 2 tests under `server/tests/lab-02/` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |
| API-08 | Contract | AC-01, AC-08, AC-11, AC-15 | Exact success/error JSON shapes, stable error codes, queue count semantics, defaults, and status codes | `server/tests/lab-03/api-contract.test.ts`, `server/tests/lab-03/staff-admin-contract.api.test.ts` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |
| API-09 | Seed/regression | AC-13, AC-15 | Fresh-database first seed creates owner/comment/note workflow data and a second seed changes no counts or hashes | `server/tests/lab-03/seed.integration.test.ts` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |
| API-10 | Migration/admin regression | AC-11, AC-13, AC-17 | IT Staff/Administrator → Requester reuses an existing link or creates one transactionally; restored Requester reuses its link; existing ticket ownership is preserved | `server/tests/lab-03/staff-admin-contract.api.test.ts`, `server/tests/lab-03/migration.api.test.ts`, `server/tests/lab-03/users-admin.api.test.ts` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |
| UI-01 | UI/accessibility | AC-01–04 | Login, safe errors, busy state, password labels/rules/change/logout | `client/tests/lab-03/Login.test.tsx`, `client/tests/lab-03/AppScreens.test.tsx`, `client/tests/lab-03/ChangePassword.test.tsx` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |
| UI-02 | UI/security | AC-05–07 | Authenticated Requester navigation, detail, Public Comment and resolution interactions, no notes | `client/tests/lab-03/RequesterInteractions.test.tsx`, `client/tests/lab-03/Requester.test.tsx` | Implemented on PRs #53 and #57; merged into staging; passed on final main commit `da505ee` |
| UI-03 | UI/responsive | AC-08 | Queue controls, pagination/reset interactions, empty/no-results/failure states, status/priority/owner badges, and desktop/tablet/mobile representation without horizontal overflow | `client/tests/lab-03/StaffTicketQueue.test.tsx`, `client/e2e/lab-03/staff-queue.spec.ts` | Implemented on PR #54; merged into staging; passed on final main commit `da505ee` |
| UI-04 | UI/security | AC-09–10 | Staff detail ownership/workflow/comments/notes/attachments and privacy | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Implemented on PR #55; merged into staging; passed on final main commit `da505ee` |
| UI-05 | UI/responsive | AC-11–12 | Admin search/list/create/edit/activation/role/reset and safeguards | `client/tests/lab-03/UserManagement.test.tsx` | Implemented on PR #56; merged into staging; passed on final main commit `da505ee` |
| STYLE-01 | Style/a11y | AC-14 | Zen Green tokens, labels, focus, badges, readable states, overflow | `client/tests/lab-03/ZenGreenLab3.test.tsx` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |
| E2E-01 | E2E | AC-01–07 | Login, first-login change, requester create/detail/comment/resolution/attachments/logout | `client/e2e/lab-03/authentication.spec.ts`, `client/e2e/lab-03/authenticated-requester.spec.ts` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |
| E2E-02 | E2E | AC-09–10 | Staff ticket detail claim, status, IT Priority, Public Comment, Internal Note, existing attachment action, and responsive detail behavior | `client/e2e/lab-03/staff-ticket-flow.spec.ts` | Implemented on PR #55; merged into staging; passed on final main commit `da505ee` |
| E2E-03 | E2E | AC-11–12 | Admin search/create/edit/activation/reset and forbidden non-admin access | `client/e2e/lab-03/user-administration.spec.ts` | Implemented on PR #56; merged into staging; passed on final main commit `da505ee` |
| E2E-04 | Responsive | AC-14 | Major screens at desktop/tablet/mobile widths with no overflow | `client/e2e/lab-03/responsive.spec.ts` | Implemented on PR #57; merged into staging; passed on final main commit `da505ee` |

Queue search, filtering, pagination, reset, and queue responsive representation are traced by API-04 and UI-03. E2E-02 intentionally covers the staff-ticket detail workflow only; it does not claim queue-query interaction coverage.

## Acceptance traceability

- AC-01: UNIT-01, API-01, UI-01, E2E-01
- AC-02: API-01, UI-01, E2E-01
- AC-03: API-01, UI-01, E2E-01
- AC-04: API-01, UI-01, E2E-01
- AC-05: API-02, API-07, UI-02
- AC-06: API-02, API-03, API-07, UI-02, E2E-01
- AC-07: API-02, API-05, UI-02, UI-04, E2E-01
- AC-08: API-04, UI-03
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

## Historical staging validation before final main integration

These results are retained as historical evidence from PR #57 head `1f8d7d6` after it merged into `lab3-staging`.

- Server: 24 test files, 122 tests passed; TypeScript build passed.
- Client: 15 test files, 45 tests passed; TypeScript check and production Vite build passed.
- Playwright: 9 tests passed, including Lab 2 requester regression, Lab 3 authentication, authenticated Requester, IT Staff queue/detail, Administrator, and desktop/tablet/mobile responsive flows.
- `git diff --check` passed.

## Final main verification

The following results are authentic checks from final `main` commit `da505ee` after PR #61 merged `lab3-staging` into `main`. The complete output is recorded in `artifacts/lab-03/final-main-verification.txt`.

- Server: 24 test files, 122 tests passed; TypeScript build passed.
- Client: 15 test files, 47 tests passed; TypeScript/Vite production build passed.
- Playwright: 9 tests passed, including the Requester tablet filter-width/readability assertion and all Lab 3 role, workflow, and responsive flows.
- Final evidence capture: 27 PNGs generated from final `main`, covering 18 responsive major-screen captures and 9 error/boundary captures.
- `git diff --check` passed.

The checks used Node.js `v24.15.0` because the local `npm` launcher can resolve an incompatible legacy Node runtime. The final commands and counts above were run from the final-main verification branch at `da505ee`.
