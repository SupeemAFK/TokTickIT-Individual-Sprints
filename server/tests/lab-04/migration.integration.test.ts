import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed-data.js";

const testDatabaseUrl = process.env.LAB4_TEST_DATABASE_URL;
const describeWithDatabase = describe.skipIf(!testDatabaseUrl);
const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationRoot = resolve(serverRoot, "prisma/migrations");
const baselineMigrations = [
  "20260808190000_init/migration.sql",
  "20260824132847_lab2_ticketing/migration.sql",
  "20260918000000_lab3_users_roles/migration.sql",
];
const lab4Migration = "20261028120000_lab4_action_taken/migration.sql";

function connectionUrlForSchema(databaseUrl: string, schema: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set("schema", schema);
  return url.toString();
}

function statements(sql: string): string[] {
  return sql.split(";").map((statement) => statement.trim()).filter(Boolean);
}

function migrationStatements(sql: string): string[] {
  return statements(sql).filter((statement) => !/^(BEGIN|COMMIT)$/i.test(statement));
}

describeWithDatabase("Lab 4 additive migration and recovery", () => {
  it("preserves Lab 1–3 data, leaves legacy resolution time unknown, and rolls back a failed pre-write migration", async () => {
    const parsedUrl = new URL(testDatabaseUrl!);
    if (!["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname)) {
      throw new Error("LAB4_TEST_DATABASE_URL must target a loopback PostgreSQL instance; no remote database may be used.");
    }

    const schema = `lab4_migration_${randomBytes(6).toString("hex")}`;
    const admin = new PrismaClient({ datasources: { db: { url: connectionUrlForSchema(testDatabaseUrl!, "public") } } });
    const prisma = new PrismaClient({ datasources: { db: { url: connectionUrlForSchema(testDatabaseUrl!, schema) } } });

    try {
      await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);

      for (const file of baselineMigrations) {
        const sql = await readFile(resolve(migrationRoot, file), "utf8");
        for (const statement of statements(sql)) await prisma.$executeRawUnsafe(statement);
      }

      await prisma.$executeRawUnsafe(`INSERT INTO "Category" ("name", "createdAt", "isActive", "updatedAt") VALUES ('Hardware', CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP)`);
      await prisma.$executeRawUnsafe(`INSERT INTO "RelatedSystem" ("name", "isActive", "createdAt", "updatedAt") VALUES ('Laptop', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
      await prisma.$executeRawUnsafe(`INSERT INTO "DevelopmentRequester" ("name", "email", "isActive", "createdAt", "updatedAt") VALUES ('Legacy Requester', 'legacy@migration.test', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
      await prisma.$executeRawUnsafe(`INSERT INTO "User" ("name", "email", "passwordHash", "role", "isActive", "mustChangePassword", "createdAt", "updatedAt") VALUES ('Legacy Staff', 'staff@migration.test', 'hash', 'IT_STAFF', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('Second Staff', 'staff-two@migration.test', 'hash', 'IT_STAFF', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ('Legacy Requester', 'legacy@migration.test', 'hash', 'REQUESTER', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);
      await prisma.$executeRawUnsafe(`INSERT INTO "Ticket" ("ticketNumber", "requesterId", "categoryId", "relatedSystemId", "summary", "requestedPriority", "description", "currentStatus", "createdAt", "updatedAt", "itPriority", "ownerUserId") VALUES ('TKT-MIGRATION-RESOLVED', 1, 1, 1, 'Legacy resolved ticket', 'HIGH', 'Preserve the resolved ticket.', 'RESOLVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'HIGH', 1), ('TKT-MIGRATION-NEW', 1, 1, 1, 'Legacy open ticket', 'LOW', 'Preserve the open ticket.', 'NEW', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'LOW', 1)`);
      await prisma.$executeRawUnsafe(`INSERT INTO "Attachment" ("ticketId", "originalFilename", "storageKey", "mimeType", "byteSize") VALUES (1, 'evidence.txt', 'migration-test-file', 'text/plain', 12)`);
      await prisma.$executeRawUnsafe(`INSERT INTO "PublicComment" ("ticketId", "authorId", "content") VALUES (1, 1, 'Legacy public comment')`);
      await prisma.$executeRawUnsafe(`INSERT INTO "InternalNote" ("ticketId", "authorId", "content") VALUES (1, 1, 'Legacy private note')`);

      const before = {
        tickets: await prisma.$queryRawUnsafe(`SELECT "id", "ticketNumber", "requesterId", "ownerUserId", "currentStatus" FROM "Ticket" ORDER BY "id"`),
        users: await prisma.$queryRawUnsafe(`SELECT "id", "email", "role" FROM "User" ORDER BY "id"`),
        attachments: await prisma.$queryRawUnsafe(`SELECT "id", "ticketId", "storageKey" FROM "Attachment" ORDER BY "id"`),
        comments: await prisma.$queryRawUnsafe(`SELECT "id", "ticketId", "authorId", "content" FROM "PublicComment" ORDER BY "id"`),
        notes: await prisma.$queryRawUnsafe(`SELECT "id", "ticketId", "authorId", "content" FROM "InternalNote" ORDER BY "id"`),
      };

      const lab4Sql = await readFile(resolve(migrationRoot, lab4Migration), "utf8");
      const nextStatements = migrationStatements(lab4Sql);
      const enumStatement = nextStatements.find((statement) => /CREATE TYPE "ActionTakenStatus"/.test(statement));
      const resolvedAtStatement = nextStatements.find((statement) => /ALTER TABLE "Ticket" ADD COLUMN/.test(statement));
      expect(enumStatement).toBeDefined();
      expect(resolvedAtStatement).toContain('"resolvedAt"');
      expect(statements(lab4Sql)[0].toUpperCase()).toBe("BEGIN");
      expect(statements(lab4Sql).at(-1)?.toUpperCase()).toBe("COMMIT");

      await expect(prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(enumStatement!);
        await tx.$executeRawUnsafe(resolvedAtStatement!);
        throw new Error("Injected pre-write migration failure");
      })).rejects.toThrow("Injected pre-write migration failure");

      const rolledBackColumn = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'Ticket' AND column_name = 'resolvedAt'`, schema,
      );
      const rolledBackEnum = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
        `SELECT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = $1 AND t.typname = 'ActionTakenStatus') AS exists`, schema,
      );
      expect(rolledBackColumn).toHaveLength(0);
      expect(rolledBackEnum[0]?.exists).toBe(false);

      await prisma.$transaction(async (tx) => {
        for (const statement of nextStatements) await tx.$executeRawUnsafe(statement);
      });

      const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
        `SELECT indexname FROM pg_indexes WHERE schemaname = $1 AND tablename IN ('Ticket', 'ActionTaken')`, schema,
      );
      expect(indexes.map(({ indexname }) => indexname)).toEqual(expect.arrayContaining([
        "Ticket_resolvedAt_id_idx",
        "ActionTaken_idempotencyKey_key",
        "ActionTaken_ticketId_actionAt_id_idx",
        "ActionTaken_ticketId_status_idx",
        "ActionTaken_assignedToUserId_status_actionAt_id_idx",
      ]));

      const after = {
        tickets: await prisma.$queryRawUnsafe(`SELECT "id", "ticketNumber", "requesterId", "ownerUserId", "currentStatus" FROM "Ticket" ORDER BY "id"`),
        users: await prisma.$queryRawUnsafe(`SELECT "id", "email", "role" FROM "User" ORDER BY "id"`),
        attachments: await prisma.$queryRawUnsafe(`SELECT "id", "ticketId", "storageKey" FROM "Attachment" ORDER BY "id"`),
        comments: await prisma.$queryRawUnsafe(`SELECT "id", "ticketId", "authorId", "content" FROM "PublicComment" ORDER BY "id"`),
        notes: await prisma.$queryRawUnsafe(`SELECT "id", "ticketId", "authorId", "content" FROM "InternalNote" ORDER BY "id"`),
      };
      expect(after).toEqual(before);

      const legacyTimestamp = await prisma.$queryRawUnsafe<Array<{ resolvedAt: Date | null }>>(
        `SELECT "resolvedAt" FROM "Ticket" WHERE "ticketNumber" = 'TKT-MIGRATION-RESOLVED'`,
      );
      expect(legacyTimestamp[0]?.resolvedAt).toBeNull();

      await prisma.$executeRawUnsafe(`INSERT INTO "ActionTaken" ("ticketId", "actionAt", "description", "result", "status", "followUpRequired", "assignedToUserId", "performedByUserId", "idempotencyKey", "idempotencyPayloadHash", "updatedAt") VALUES (2, CURRENT_TIMESTAMP, 'Action assigned to staff', 'Action remains distinct from its performer.', 'OPEN', false, 1, 2, 'migration-test-action', repeat('a', 64), CURRENT_TIMESTAMP)`);
      const createdAction = await prisma.$queryRawUnsafe<Array<{ ticketId: number; assignedToUserId: number | null; performedByUserId: number }>>(
        `SELECT "ticketId", "assignedToUserId", "performedByUserId" FROM "ActionTaken" WHERE "idempotencyKey" = 'migration-test-action'`,
      );
      expect(createdAction[0]).toEqual({ ticketId: 2, assignedToUserId: 1, performedByUserId: 2 });

      await expect(prisma.$executeRawUnsafe(`INSERT INTO "ActionTaken" ("ticketId", "actionAt", "description", "result", "followUpRequired", "performedByUserId", "idempotencyKey", "idempotencyPayloadHash", "updatedAt") VALUES (2, CURRENT_TIMESTAMP, 'Missing required follow-up note', 'Must fail the database constraint.', true, 1, 'migration-test-invalid-follow-up', repeat('b', 64), CURRENT_TIMESTAMP)`)).rejects.toThrow();

      await seedDatabase(prisma);
      const firstSeededActions = await prisma.actionTaken.findMany({
        where: { idempotencyKey: { startsWith: "seed:lab4:" } },
        select: { id: true, idempotencyKey: true, status: true, assignedToUserId: true, performedByUserId: true, ticket: { select: { ticketNumber: true } } },
        orderBy: { idempotencyKey: "asc" },
      });
      expect(firstSeededActions).toHaveLength(8);
      expect(firstSeededActions.filter((action) => action.ticket.ticketNumber === "TKT-2026-000901")).toHaveLength(2);
      expect(firstSeededActions.filter((action) => action.ticket.ticketNumber === "TKT-2026-000902")).toHaveLength(0);

      const activeAssignedCounts = await prisma.actionTaken.groupBy({
        by: ["assignedToUserId"],
        where: { status: { in: ["OPEN", "IN_PROGRESS"] }, idempotencyKey: { startsWith: "seed:lab4:" }, assignedToUserId: { not: null } },
        _count: { _all: true },
      });
      expect(activeAssignedCounts.length).toBeGreaterThanOrEqual(3);

      await seedDatabase(prisma);
      const secondSeededActions = await prisma.actionTaken.findMany({
        where: { idempotencyKey: { startsWith: "seed:lab4:" } },
        select: { id: true, idempotencyKey: true },
        orderBy: { idempotencyKey: "asc" },
      });
      expect(secondSeededActions).toEqual(firstSeededActions.map(({ id, idempotencyKey }) => ({ id, idempotencyKey })));
    } finally {
      await prisma.$disconnect();
      await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.$disconnect();
    }
  });
});
