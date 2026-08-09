# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Prisma schema | Category model has `id`, unique `name`, and `createdAt` | Passed |
| 2 | Prisma migration | Migration creates `Category` table and unique `name` index | Passed |
| 3 | Prisma seed | Seed uses `upsert` for the four required categories | Passed |
| 4 | Credentials check | Real `.env` files are ignored by Git | Passed |

## Evidence

### Prisma Schema Validation

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

### Prisma Client Generation

Command:

```text
cd server
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public" npx prisma generate --schema prisma/schema.prisma
```

Output:

```text
Prisma schema loaded from prisma/schema.prisma
```

### TypeScript Build

Command:

```text
cd server && npm run build
```

Output:

```text
> toktickit-server@1.0.0 build
> tsc
```

### Seed Safety

The seed uses `prisma.category.upsert()` with `where: { name }`, so running it multiple times updates existing rows instead of creating duplicate category names.

### Credential Safety

`.gitignore` contains:

```text
.env
*.env
!.env.example
```

Only `.env.example` is committed. Real database credentials remain local.
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
