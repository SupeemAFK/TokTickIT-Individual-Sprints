# Lab 2 Test Plan and Results

## 1. Test Strategy

Tests are planned before implementation and trace to the approved specification. API tests use Vitest/Supertest, UI tests use Vitest/Testing Library, and E2E/responsive evidence will use Playwright when introduced. Results remain Planned until each test exists and passes.

## 2. Planned Tests

| ID | Type | AC | Scenario | Planned path | Status |
|---|---|---|---|---|---|
| UNIT-01 | Unit | AC-04 | unique ticket-number format | `server/tests/lab-02/ticket-number.test.ts` | Planned |
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
| E2E-01 | E2E/responsive | AC-01–14 | select requester, create, find, view, attach, remove; screenshot three widths | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |

## 3. Acceptance-Criterion Traceability

AC-01: API-01, UI-01, E2E-01; AC-02: UI-01, E2E-01; AC-03: API-01, UI-01, UI-03, E2E-01; AC-04: UNIT-01, API-02, UI-02, E2E-01; AC-05: API-02, UI-02, E2E-01; AC-06: API-03, UI-03, E2E-01; AC-07: API-03, UI-03, E2E-01; AC-08: API-03, API-04, E2E-01; AC-09: API-04, UI-04, E2E-01; AC-10–12: API-05, UI-04, E2E-01; AC-13: STYLE-01, E2E-01; AC-14: API-01–05, UI-01–04, E2E-01.

## 4. Responsive and Visual Checklist

Requester selection visual checks passed with mocked active-requester data: `artifacts/lab-02/screenshots/requester-selection-1440.png` (1440px), `artifacts/lab-02/screenshots/requester-selection-768.png` (768px), and `artifacts/lab-02/screenshots/requester-selection-375.png` (375px). The screenshots confirm the card, selector, primary action, Zen Green styling, and narrow layout render without horizontal-overflow suppression. `STYLE-01` provides the automated CSS baseline; `E2E-01` remains the planned full requester-to-ticket flow.

## 5. Test Commands

```text
cd server && npm test
cd client && npm test
cd server && npm run build
cd client && npm run build
# after Playwright setup: npx playwright test e2e/lab-02
```

## 6. Final Results

Completed so far: API-01–04 and UI-01–04 implemented coverage pass; attachment, style, and E2E rows remain planned for their scoped Issues.

## 7. Known Limitations or Deferred Tests

Real authentication and authorization are intentionally deferred to Lab 3. Attachment persistence is implemented and covered by API/UI tests; E2E tooling remains planned for Issue #20.
