# Lab 3 Final Candidate Evidence

This evidence set is prepared on `feature/lab3-issue-59-final-evidence` from the merged `origin/lab3-staging` candidate after PR #58. It is intentionally **not** the final `main` evidence yet. The complete verification and screenshot capture must be repeated after `lab3-staging` is merged into `main` before the submission PDF is created.

## Source and capture provenance

- Staging base: `805e88c` (PR #58 merge into `lab3-staging`)
- Evidence commit: `16aac15`
- Capture script: [`client/scripts/capture-lab3-final-evidence.ts`](../../client/scripts/capture-lab3-final-evidence.ts)
- Capture command: `PATH=/home/supeem/.nvm/versions/node/v24.15.0/bin:$PATH server/node_modules/.bin/tsx client/scripts/capture-lab3-final-evidence.ts`
- Captured UI states use the same authenticated Lab 3 Playwright fixture behavior exercised by the E2E suite; no production secrets are included.

## Screen-capture inventory

All required Lab 3 evidence screens are captured at 1440px desktop, 768px tablet, and 390px mobile widths.

| Screen | Desktop | Tablet | Mobile |
|---|---|---|---|
| Login | [`login-desktop.png`](screenshots/final/authentication/login-desktop.png) | [`login-tablet.png`](screenshots/final/authentication/login-tablet.png) | [`login-mobile.png`](screenshots/final/authentication/login-mobile.png) |
| Mandatory Change Password | [`change-password-desktop.png`](screenshots/final/authentication/change-password-desktop.png) | [`change-password-tablet.png`](screenshots/final/authentication/change-password-tablet.png) | [`change-password-mobile.png`](screenshots/final/authentication/change-password-mobile.png) |
| IT Staff Ticket Queue | [`ticket-queue-desktop.png`](screenshots/final/staff-queue/ticket-queue-desktop.png) | [`ticket-queue-tablet.png`](screenshots/final/staff-queue/ticket-queue-tablet.png) | [`ticket-queue-mobile.png`](screenshots/final/staff-queue/ticket-queue-mobile.png) |
| IT Staff Ticket Detail | [`staff-ticket-detail-desktop.png`](screenshots/final/staff-ticket-detail/staff-ticket-detail-desktop.png) | [`staff-ticket-detail-tablet.png`](screenshots/final/staff-ticket-detail/staff-ticket-detail-tablet.png) | [`staff-ticket-detail-mobile.png`](screenshots/final/staff-ticket-detail/staff-ticket-detail-mobile.png) |
| Administrator User Management | [`user-management-desktop.png`](screenshots/final/user-management/user-management-desktop.png) | [`user-management-tablet.png`](screenshots/final/user-management/user-management-tablet.png) | [`user-management-mobile.png`](screenshots/final/user-management/user-management-mobile.png) |

The visual requirements are defined in [`docs/lab-03/ui-spec.md`](../../docs/lab-03/ui-spec.md), and the required Lab 3 screen/evidence scope is defined in the labsheet Part 5–9 requirements.

## Automated test evidence

Full captured output is in [`staging-verification.txt`](staging-verification.txt). The candidate run passed:

- Server: 24 test files, 122 tests; TypeScript build.
- Client: 15 test files, 45 tests; TypeScript/Vite production build.
- Playwright: 9 E2E tests covering authentication, authenticated Requester regression, Staff Queue, Staff Ticket Detail, Administrator flow, and responsive behavior.
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
