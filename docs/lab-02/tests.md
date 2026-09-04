# Lab 2 Test Plan and Results

## 1. Test Strategy

Tests are planned before implementation and trace to the approved specification. API tests use Vitest/Supertest, UI tests use Vitest/Testing Library, and E2E/responsive coverage uses Playwright. Results remain Planned until each test exists and passes.

## 2. Planned Tests

| ID | Type | AC | Scenario | Planned path | Status |
|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-04 | unique ticket-number format | `server/tests/lab-02/ticket-number.test.ts` | Automated |
| API-01 | API | AC-01–03 | active requester list and inactive exclusion | `server/tests/lab-02/requesters.api.test.ts` | Pass |
| API-02 | API | AC-04–05,14 | valid/invalid and malformed ticket creation, reference rejection, and safe failure | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-03 | API | AC-06–08 | owned list, query validation, search/filter/sort/page, and requester protection | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-04 | API | AC-08–09,14 | active requester, owned detail, invalid ID, and safe missing/non-owner response | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| API-05 | API | AC-10–12,14 | metadata, invalid/oversized/max files, and removed download rejection | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| UI-01 | UI | AC-01–03,14 | selector loading/error/empty/selection/switch | `client/tests/lab-02/RequesterSelection.test.tsx` | Pass |
| UI-02 | UI | AC-04–05,14 | create form validation, busy, success, and failed-request retention | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| UI-03 | UI | AC-06–08,14 | list states, query controls, requester reload, and accessible navigation | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| UI-04 | UI | AC-09–12,14 | detail display/failure plus upload, download, and removal controls | `client/tests/lab-02/TicketDetail.test.tsx` | Pass |
| STYLE-01 | UI style | AC-13 | Zen Green tokens, labels, asterisks, focus, busy/disabled and responsive classes | `client/tests/lab-02/zen-green-style.test.tsx` | Automated |
| E2E-01 | E2E/responsive | AC-01–14 | select requester, validate/create/find/view ticket, upload/remove attachment, switch requester, and verify three widths | `client/e2e/lab-02/requester-ticket-flow.spec.ts` | Automated |

## 3. Acceptance-Criterion Traceability

AC-01: API-01, UI-01, E2E-01; AC-02: UI-01, E2E-01; AC-03: API-01, UI-01, UI-03, E2E-01; AC-04: UNIT-01, API-02, UI-02, E2E-01; AC-05: API-02, UI-02, E2E-01; AC-06: API-03, UI-03, E2E-01; AC-07: API-03, UI-03, E2E-01; AC-08: API-03, API-04, E2E-01; AC-09: API-04, UI-04, E2E-01; AC-10–12: API-05, UI-04, E2E-01; AC-13: STYLE-01, E2E-01; AC-14: API-01–05, UI-01–04, E2E-01.

## 4. Responsive and Visual Checklist

All visual checks use mocked active-requester data at 1440px, 768px, and 375px. Each view has a focused control so the Secondary Green keyboard-focus treatment is visible. No horizontal page scroll, clipped labels, overlapping validation messages, or hidden controls were observed.

| Screen/state | Evidence | Observation |
| --- | --- | --- |
| Requester selection | `artifacts/lab-02/screenshots/requester-selection-1440.png`, `artifacts/lab-02/screenshots/requester-selection-768.png`, `artifacts/lab-02/screenshots/requester-selection-375.png` | Selector and Continue action remain usable at every width. |
| My Tickets | `artifacts/lab-02/screenshots/my-tickets-1440.png`, `artifacts/lab-02/screenshots/my-tickets-768.png`, `artifacts/lab-02/screenshots/my-tickets-375.png` | Responsive navigation, filters, focused search control, desktop table, and mobile ticket card are visible. |
| Create Ticket validation | `artifacts/lab-02/screenshots/create-ticket-validation-1440.png`, `artifacts/lab-02/screenshots/create-ticket-validation-768.png`, `artifacts/lab-02/screenshots/create-ticket-validation-375.png` | Required-field errors and their controls remain separate and readable; focused Category control and submit action remain visible. |
| Ticket Detail attachments | `artifacts/lab-02/screenshots/ticket-detail-attachments-1440.png`, `artifacts/lab-02/screenshots/ticket-detail-attachments-768.png`, `artifacts/lab-02/screenshots/ticket-detail-attachments-375.png` | Focused upload control, active Download/Remove controls, and a Removed attachment state are visible at every width. |

`STYLE-01` provides the automated CSS baseline; `E2E-01` is the passing requester-to-ticket flow.

## 5. Test Commands

```text
cd server && npm test
cd client && npm test
cd server && npm run build
cd client && npm run build
cd client && npm run test:e2e
```

## 6. Final Results

On 2026-08-30, `npm test` passed 31 server tests and 19 client tests; both server and client builds passed; and `npm run test:e2e` passed 2 Playwright requester-flow tests. API-01–05, UI-01–04, STYLE-01, UNIT-01, and E2E-01 have automated coverage.

## 7. Known Limitations or Deferred Tests

Real authentication and authorization are intentionally deferred to Lab 3. The Playwright flow intercepts API calls with stateful fixture data so it can test the requester UI workflow without requiring a developer's local PostgreSQL instance; API ownership and attachment boundary rules remain covered by server API tests.
