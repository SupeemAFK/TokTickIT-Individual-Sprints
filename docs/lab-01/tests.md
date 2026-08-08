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
