# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Passed |
| 2 | Vitest | Heading renders | Passed |
| 3 | Vitest | Success state shows Online from the real health API helper | Passed |
| 4 | Vitest | Error state shows Offline + message | Passed |

## Evidence

### Server

Command: `cd server && npm test`

```text
RUN  v2.1.9 /home/supeem/works/toktickit/server

↓ tests/lab-01/categories.test.ts (1 test | 1 skipped)
✓ tests/lab-01/health.test.ts (1 test) 13ms

Test Files  1 passed | 1 skipped (2)
Tests  1 passed | 1 todo (2)
```

Note: the existing Issue 4 category todo appears in the server test output but was not implemented for this ticket. This test needed permission to open an ephemeral local port for Supertest.

### Client

Command: `cd client && npm test`

```text
RUN  v2.1.9 /home/supeem/works/toktickit/client

✓ tests/lab-01/App.test.tsx (3 tests) 106ms

Test Files  1 passed (1)
Tests  3 passed (3)
```

### Build Checks

Commands:

```text
cd server && npm run build
cd client && npm run build
```

Both completed successfully.
