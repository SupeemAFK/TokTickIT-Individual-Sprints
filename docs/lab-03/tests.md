# Lab 3 Test Plan and Traceability
Lab 3 coverage is intentionally split between API authorization, client role screens, and browser-level requester/responsive checks.

| ID | Coverage | Automated evidence |
| --- | --- | --- |
| API-01 | valid, invalid, and inactive login; safe errors | `server/tests/lab-03/auth.api.test.ts` |
| API-02 | session `/me`, password validation/change | `server/tests/lab-03/auth.api.test.ts` |
| API-03 | bearer-session ownership overrides legacy requester hints | `server/tests/lab-03/requester-security.api.test.ts`; authenticated Lab 2 regressions |
| API-04 | requester cannot access staff queue/internal notes; internal notes omitted from requester detail | `server/tests/lab-03/requester-security.api.test.ts` |
| API-05 | staff queue filtering, pagination, and detail | `server/tests/lab-03/staff-workflow.api.test.ts` |
| API-06 | atomic claim conflict, workflow transition, public comments, internal notes | `server/tests/lab-03/staff-workflow.api.test.ts` |
| API-07 | administrator listing/creation, initial-password gate, self-deactivation guard | `server/tests/lab-03/admin.api.test.ts` |
| UI-01–02 | login/password shell and authenticated requester detail workflow | `client/tests/lab-03/Login.test.tsx`, `client/tests/lab-03/Requester.test.tsx` |
| UI-03–05 | staff queue/detail and administrator management controls | `client/tests/lab-03/StaffAdmin.test.tsx` |
| E2E-01 | authenticated requester create/detail/comment/resolution/attachments | `client/e2e/lab-03/authenticated-requester.spec.ts` |
| E2E-02 | desktop/tablet/mobile overflow and usable navigation | `client/e2e/lab-03/authenticated-requester.spec.ts` |

The full verification command set is:

```text
cd server && npm test && npm run build
cd client && npm test && npm run build
cd client && npm run test:e2e
```

The E2E suite uses authenticated browser API fixtures, so it is deterministic and does not require a local database. Final release evidence must be attached to the release PR after the collaborator review is complete.
