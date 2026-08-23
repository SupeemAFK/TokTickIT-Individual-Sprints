# Lab 1 — Test Plan and Evidence

All test files live under `server/tests/lab-01/` and `client/tests/lab-01/`.

## Issue 2 — API Health Check

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | `GET /api/health` returns 200, `status=ok`, and the service name | Passed |
| 2 | Vitest + Testing Library | TokTickIT heading renders | Passed |
| 3 | Vitest + Testing Library | Health success state shows Online from the API helper | Passed |
| 4 | Vitest + Testing Library | Health failure state shows Offline plus the error message | Passed |

## Issue 3 — Category Schema and Seed

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Prisma schema validation | Category model has `id`, unique `name`, and `createdAt` | Passed |
| 2 | Prisma migration review | Migration creates `Category` table and unique `name` index | Passed |
| 3 | Prisma seed review | Seed uses `upsert` for the four required categories | Passed |
| 4 | Credentials check | Real `.env` files are ignored by Git | Passed |

### Issue 3 Evidence

Command:

```text
cd server
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public" npx prisma validate --schema prisma/schema.prisma
```

Output:

```text
Prisma schema loaded from prisma/schema.prisma
The schema at prisma/schema.prisma is valid
```

Command:

```text
cd server
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public" npx prisma generate --schema prisma/schema.prisma
```

Output:

```text
Prisma schema loaded from prisma/schema.prisma
```

The seed uses `prisma.category.upsert()` with `where: { name }`, so running it multiple times updates existing rows instead of creating duplicate category names.

## Issue 4 — Category List

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | `GET /api/categories` returns category `id` and `name` values in ascending id order | Passed |
| 2 | Supertest | Category route returns a safe 500 error body when Prisma fails | Passed |
| 3 | Vitest + Testing Library | Category loading state appears while the API request is pending | Passed |
| 4 | Vitest + Testing Library | Category names render from the API helper response | Passed |
| 5 | Vitest + Testing Library | Category error state appears when the API helper rejects | Passed |

### Issue 4 Evidence

Server command:

```text
cd server && npm test
```

Output:

```text
RUN  v2.1.9 /home/supeem/works/toktickit/server

✓ tests/lab-01/categories.test.ts (2 tests) 14ms
✓ tests/lab-01/health.test.ts (1 test) 12ms

Test Files  2 passed (2)
Tests  3 passed (3)
```

Client command:

```text
cd client && npm test
```

Output:

```text
RUN  v2.1.9 /home/supeem/works/toktickit/client

✓ tests/lab-01/App.test.tsx (5 tests) 149ms

Test Files  1 passed (1)
Tests  5 passed (5)
```

Build commands:

```text
cd server && npm run build
cd client && npm run build
```

Both completed successfully.

Note: the server Supertest run needs permission to bind an ephemeral local port in this sandbox. It passed after running with that permission.
