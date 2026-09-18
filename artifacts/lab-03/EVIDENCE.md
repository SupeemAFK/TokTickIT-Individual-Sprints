# TokTickIT Lab 3 — Verification and Evidence

This evidence was captured from the `lab3-staging` branch after implementation commit `f4be28a` (`fix: complete authenticated Lab 3 workflows and coverage`). The release-evidence commit adds this record, the screenshots, AI-use disclosure, and `TokTickIT-Lab-3-Submission-Report.pdf`. Browser screenshots are deterministic Playwright API-fixture captures; the API and authorization claims are backed by the server Supertest suite.

## Verification results

| Check | Result |
| --- | --- |
| `cd server && npm test` | 14 files, 45 tests passed |
| `cd server && npm run build` | TypeScript build passed |
| `cd client && npm test` | 8 files, 20 tests passed |
| `cd client && npm run build` | TypeScript + Vite production build passed |
| `cd client && npm run test:e2e` | 2 authenticated requester/responsive tests passed |

## Lab 3 scope verified

- Bearer-session authentication, password validation/change, logout, and safe inactive-user errors.
- Legacy ticket and attachment routes require authentication, validate legacy hints, and use the session requester ID for ownership.
- Authenticated requester My Tickets, validated atomic Create Ticket, Ticket Detail, attachments, Public Comments, and Problem Appears Resolved.
- IT Staff queue filtering, ticket detail, atomic claim conflicts, transitions, public comments, and Internal Notes.
- Administrator listing, account creation with forced initial password change, role editing, deactivation guards, and duplicate-email handling at the API layer.
- Responsive requester evidence at 1440px, 768px, and 375px widths.

## Browser captures

- `screenshots/requester-detail.png`
- `screenshots/requester-1440.png`
- `screenshots/requester-768.png`
- `screenshots/requester-375.png`

These captures use the same authenticated browser fixtures as `client/e2e/lab-03/authenticated-requester.spec.ts`; they are not presented as live production records.
