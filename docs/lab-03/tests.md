# Lab 3 Test Plan and Traceability
Lab 3 coverage is intentionally split between API authorization, client role screens, and browser-level requester/responsive checks.

| ID | Coverage | Expected result | Automated evidence | Final status |
| --- | --- | --- | --- | --- |
| API-01 | valid, invalid, and inactive login; safe errors | Protected workflow returns the documented result and rejects invalid or unauthorized input. | `server/tests/lab-03/auth.api.test.ts` | PASS |
| API-02 | session `/me`, first-login access, password validation/change | Protected workflow returns the documented result and rejects invalid or unauthorized input. | `server/tests/lab-03/auth.api.test.ts`, `server/tests/lab-03/password-change.api.test.ts` | PASS |
| API-03 | bearer-session ownership overrides legacy requester hints | Protected workflow returns the documented result and rejects invalid or unauthorized input. | `server/tests/lab-03/authorization.api.test.ts`; authenticated Lab 2 regressions | PASS |
| API-04 | requester cannot access staff queue/internal notes; internal notes omitted from requester detail | Protected workflow returns the documented result and rejects invalid or unauthorized input. | `server/tests/lab-03/requester-security.api.test.ts` | PASS |
| API-05 | staff queue filtering, pagination, and detail | Protected workflow returns the documented result and rejects invalid or unauthorized input. | `server/tests/lab-03/staff-queue.api.test.ts`, `server/tests/lab-03/staff-ticket-detail.api.test.ts`, `server/tests/lab-03/comments-notes.api.test.ts` | PASS |
| API-06 | atomic claim conflict, workflow transition, public comments, internal notes | Protected workflow returns the documented result and rejects invalid or unauthorized input. | `server/tests/lab-03/staff-queue.api.test.ts`, `server/tests/lab-03/staff-ticket-detail.api.test.ts`, `server/tests/lab-03/comments-notes.api.test.ts` | PASS |
| API-07 | administrator listing/creation, initial-password gate, self-deactivation guard | Protected workflow returns the documented result and rejects invalid or unauthorized input. | `server/tests/lab-03/users-admin.api.test.ts` | PASS |
| UI-01–02 | login/password shell and authenticated requester detail workflow | The role screen or browser workflow remains usable and shows the expected success/error state. | `client/tests/lab-03/Login.test.tsx`, `client/tests/lab-03/ChangePassword.test.tsx`, `client/tests/lab-03/Requester.test.tsx` | PASS |
| UI-03–05 | staff queue/detail and administrator management controls | The role screen or browser workflow remains usable and shows the expected success/error state. | `client/tests/lab-03/StaffTicketQueue.test.tsx`, `client/tests/lab-03/StaffTicketDetail.test.tsx`, `client/tests/lab-03/UserManagement.test.tsx` | PASS |
| E2E-01 | authenticated requester create/detail/comment/resolution/attachments | The role screen or browser workflow remains usable and shows the expected success/error state. | `client/e2e/lab-03/authentication.spec.ts`, `client/e2e/lab-03/authenticated-requester.spec.ts`, `client/e2e/lab-03/staff-ticket-flow.spec.ts`, `client/e2e/lab-03/user-administration.spec.ts` | PASS |
| E2E-02 | desktop/tablet/mobile overflow and usable navigation | The role screen or browser workflow remains usable and shows the expected success/error state. | `client/e2e/lab-03/authentication.spec.ts`, `client/e2e/lab-03/authenticated-requester.spec.ts`, `client/e2e/lab-03/staff-ticket-flow.spec.ts`, `client/e2e/lab-03/user-administration.spec.ts` | PASS |

The full verification command set is:

```text
cd server && npm test && npm run build
cd client && npm test && npm run build
cd client && npm run test:e2e
```

The E2E suite uses authenticated browser API fixtures, so it is deterministic and does not require a local database. Final release evidence must be attached to the release PR after the collaborator review is complete.
