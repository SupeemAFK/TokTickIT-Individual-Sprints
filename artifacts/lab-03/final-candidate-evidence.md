# Lab 3 Final Candidate Evidence

This evidence set is prepared on `feature/lab3-issue-59-final-evidence` from the merged `origin/lab3-staging` candidate after PR #58. It is intentionally **not** final `main` evidence yet. The complete verification and screenshot capture must be repeated after `lab3-staging` is merged into `main` before the submission PDF is created.

## Source and capture provenance

- Staging base: `805e88c` (PR #58 merge into `lab3-staging`)
- Evidence PR: [PR #60](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/60)
- Capture script: [`client/scripts/capture-lab3-final-evidence.ts`](../../client/scripts/capture-lab3-final-evidence.ts)
- Capture command: `PATH=/home/supeem/.nvm/versions/node/v24.15.0/bin:$PATH server/node_modules/.bin/tsx client/scripts/capture-lab3-final-evidence.ts`
- Captured UI states use an explicit realistic Lab 3 evidence fixture with ten workflow tickets, multiple requester identities, all eight statuses, all three priorities, assigned and unassigned ownership, and non-sensitive public/internal examples. Functional E2E tests retain their smaller deterministic fixture so assertions remain stable; no production secrets are included.
- The real server seed is idempotent and now contains twelve workflow tickets in addition to the preserved Lab 2 legacy row, five requester accounts (four active and one inactive), four IT Staff accounts (three active and one inactive), one active Administrator, and seeded comments/notes.
- Every error capture waits for the expected visible heading, alert, or empty/no-results message before writing the PNG.

## Screen-capture inventory

The candidate contains 27 readable PNG captures. The 18 required major-screen captures cover desktop (1440px), tablet (768px), and mobile (390px). The 9 additional desktop captures cover representative failure and boundary states required by the labsheet.

| Screen | Desktop | Tablet | Mobile |
|---|---|---|---|
| Login | [`login-desktop.png`](screenshots/final/authentication/login-desktop.png) | [`login-tablet.png`](screenshots/final/authentication/login-tablet.png) | [`login-mobile.png`](screenshots/final/authentication/login-mobile.png) |
| Mandatory Change Password | [`change-password-desktop.png`](screenshots/final/authentication/change-password-desktop.png) | [`change-password-tablet.png`](screenshots/final/authentication/change-password-tablet.png) | [`change-password-mobile.png`](screenshots/final/authentication/change-password-mobile.png) |
| Requester My Tickets and Create Ticket | [`requester-desktop.png`](screenshots/final/requester/requester-desktop.png) | [`requester-tablet.png`](screenshots/final/requester/requester-tablet.png) | [`requester-mobile.png`](screenshots/final/requester/requester-mobile.png) |
| IT Staff Ticket Queue | [`ticket-queue-desktop.png`](screenshots/final/staff-queue/ticket-queue-desktop.png) | [`ticket-queue-tablet.png`](screenshots/final/staff-queue/ticket-queue-tablet.png) | [`ticket-queue-mobile.png`](screenshots/final/staff-queue/ticket-queue-mobile.png) |
| IT Staff Ticket Detail | [`staff-ticket-detail-desktop.png`](screenshots/final/staff-ticket-detail/staff-ticket-detail-desktop.png) | [`staff-ticket-detail-tablet.png`](screenshots/final/staff-ticket-detail/staff-ticket-detail-tablet.png) | [`staff-ticket-detail-mobile.png`](screenshots/final/staff-ticket-detail/staff-ticket-detail-mobile.png) |
| Administrator User Management | [`user-management-desktop.png`](screenshots/final/user-management/user-management-desktop.png) | [`user-management-tablet.png`](screenshots/final/user-management/user-management-tablet.png) | [`user-management-mobile.png`](screenshots/final/user-management/user-management-mobile.png) |

### Error and boundary-state captures

| Requirement/state | Evidence capture | UI test mapping |
|---|---|---|
| Invalid credentials safe failure | [`login-invalid-desktop.png`](screenshots/final/authentication/login-invalid-desktop.png) | `client/tests/lab-03/Login.test.tsx` |
| Inactive account does not reveal account state | [`login-inactive-desktop.png`](screenshots/final/authentication/login-inactive-desktop.png) | `client/tests/lab-03/Login.test.tsx`; `server/tests/lab-03/api-contract.test.ts` |
| Invalid first-login password and mismatch | [`change-password-invalid-desktop.png`](screenshots/final/authentication/change-password-invalid-desktop.png) | `client/tests/lab-03/ChangePassword.test.tsx` |
| Queue empty state | [`queue-empty-desktop.png`](screenshots/final/staff-queue/queue-empty-desktop.png) | `client/tests/lab-03/StaffTicketQueue.test.tsx` |
| Queue no-results state | [`queue-no-results-desktop.png`](screenshots/final/staff-queue/queue-no-results-desktop.png) | `client/tests/lab-03/StaffTicketQueue.test.tsx` |
| Queue safe API failure and retry state | [`queue-failure-desktop.png`](screenshots/final/staff-queue/queue-failure-desktop.png) | `client/tests/lab-03/StaffTicketQueue.test.tsx` |
| Staff Public Comment safe failure | [`staff-ticket-comment-failure-desktop.png`](screenshots/final/staff-ticket-detail/staff-ticket-comment-failure-desktop.png) | `client/tests/lab-03/StaffTicketDetail.test.tsx` |
| Administrator list safe API failure | [`user-management-failure-desktop.png`](screenshots/final/user-management/user-management-failure-desktop.png) | `client/tests/lab-03/UserManagement.test.tsx` failure fixture and UI load-error branch |
| Duplicate-email conflict feedback | [`user-management-conflict-desktop.png`](screenshots/final/user-management/user-management-conflict-desktop.png) | `client/tests/lab-03/UserManagement.test.tsx` |

The visual requirements are defined in [`docs/lab-03/ui-spec.md`](../../docs/lab-03/ui-spec.md), and the required Lab 3 screen/evidence scope is defined in the labsheet Part 5–9 requirements.

## Coverage audit against the labsheet

- Authentication: valid login, invalid credentials, inactive-account safe response, busy state, mandatory first-login change, logout, and session invalidation are covered by the server auth suites, `Login.test.tsx`, `ChangePassword.test.tsx`, and `authentication.spec.ts`.
- Authorization and safe errors: unauthenticated/forbidden access, requester ownership protection, internal-note restrictions, missing resources, invalid input, conflicts, and unexpected server failures are covered in `server/tests/lab-03/`.
- Requester regression: authenticated My Tickets/Create Ticket and requester-only navigation are covered by `Requester.test.tsx`, `RequesterInteractions.test.tsx`, `authenticated-requester.spec.ts`, and the three responsive Requester captures.
- Queue: the realistic capture shows ten tickets with search, filters, sorting, pagination, ownership/status/priority display, responsive representations, empty, no-results, retryable failure, and requester navigation restriction covered by `StaffTicketQueue.test.tsx`, `staff-queue.spec.ts`, and the responsive captures.
- Ticket detail: claim/reassign, IT Priority, status transitions, Public Comments, Internal Notes, attachment continuity, requester restrictions, and safe comment failure are covered by `StaffTicketDetail.test.tsx`, `staff-ticket-flow.spec.ts`, and API tests.
- Administrator safety: search/filter, create/edit/deactivate/reset, duplicate email, invalid values, self-deactivation/final-administrator safeguards, forbidden access, and safe failures are covered by `UserManagement.test.tsx`, `user-administration.spec.ts`, and `users-admin.api.test.ts`.
- Migration/seed/regression: additive backfill, idempotent seed data with all required role/status/priority/ownership distributions, preserved Lab 2 requester behavior, and existing ticket/attachment flows are covered by migration, seed, requester-security, requester-workflow, and Lab 2 regression suites.
- Responsive/accessibility/style: desktop/tablet/mobile E2E checks, Requester tablet filter-width/readability and no-overflow assertions, semantic roles/labels, focus/style checks, and the 18 responsive PNGs cover the visual and usability requirements.

## Automated test evidence

Full captured output is in [`staging-verification.txt`](staging-verification.txt). The candidate run passed:

- Server: 24 test files, 122 tests; TypeScript build.
- Client: 15 test files, 47 tests; TypeScript/Vite production build.
- Playwright: 9 E2E tests covering authentication, authenticated Requester regression, Staff Queue, Staff Ticket Detail, Administrator flow, and responsive behavior, including the Requester tablet filter-width assertion.
- `git diff --check` passed.

The traceability plan is [`docs/lab-03/tests.md`](../../docs/lab-03/tests.md). The implementation test sources are retained in the staging base:

- Server Lab 3 API/unit/security/migration/seed suites: [`server/tests/lab-03/`](../../server/tests/lab-03/)
- Client Lab 3 component/accessibility/style suites: [`client/tests/lab-03/`](../../client/tests/lab-03/)
- Lab 3 Playwright suites: [`client/e2e/lab-03/`](../../client/e2e/lab-03/)

## Repository integrity evidence

The current `.gitignore` was checked with `git check-ignore` for `server/.env`, `server/uploads/`, `client/playwright-report/`, and `client/test-results/`. No tracked files match secrets, uploads, build output, or generated test reports. The final `main` verification must repeat these checks.

## Review and release boundary

- Reviewer history: [`docs/lab-03/reviewer.md`](../../docs/lab-03/reviewer.md)
- PR for this evidence set: [PR #60](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/pull/60)
- Continuation issue: [Issue #59](https://github.com/SupeemAFK/TokTickIT-Individual-Sprints/issues/59)
- Final PDF: intentionally not present in this PR.
- Final `main` integration and final-main verification: still required before the PDF stage.
