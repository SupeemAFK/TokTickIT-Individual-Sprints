import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

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
const staffToken = "lab4-dashboard-performance-staff";
const requesterToken = "lab4-dashboard-performance-requester";
const syntheticTickets = 25_000;
const syntheticActions = 40_000;

function connectionUrlForSchema(databaseUrl: string, schema: string) {
  const url = new URL(databaseUrl);
  url.searchParams.set("schema", schema);
  return url.toString();
}

function statements(sql: string) {
  return sql.split(";").map((statement) => statement.trim()).filter(Boolean);
}

function indexNames(plan: any, result: string[] = []) {
  if (plan?.["Index Name"]) result.push(plan["Index Name"]);
  for (const child of plan?.Plans ?? []) indexNames(child, result);
  return result;
}

function explainSummary(rows: Array<Record<string, any>>) {
  const root = rows[0]?.["QUERY PLAN"]?.[0];
  return { indexes: indexNames(root?.Plan), executionMs: Number(root?.["Execution Time"] ?? 0) };
}

describeWithDatabase("Lab 4 dashboard performance smoke", () => {
  let schema = "";
  let originalDatabaseUrl: string | undefined;
  let admin: PrismaClient | undefined;
  let setup: PrismaClient | undefined;
  let runtime: PrismaClient | undefined;
  let staffId = 0;
  let requesterId = 0;

  beforeAll(async () => {
    originalDatabaseUrl = process.env.DATABASE_URL;
    const parsedUrl = new URL(testDatabaseUrl!);
    if (!["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname)) {
      throw new Error("LAB4_TEST_DATABASE_URL must target a loopback PostgreSQL instance; no remote database may be used.");
    }

    schema = `lab4_perf_${randomBytes(6).toString("hex")}`;
    admin = new PrismaClient({ datasources: { db: { url: connectionUrlForSchema(testDatabaseUrl!, "public") } } });
    setup = new PrismaClient({ datasources: { db: { url: connectionUrlForSchema(testDatabaseUrl!, schema) } } });
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);

    for (const file of baselineMigrations) {
      const sql = await readFile(resolve(migrationRoot, file), "utf8");
      for (const statement of statements(sql)) await setup.$executeRawUnsafe(statement);
    }
    const migrationSql = await readFile(resolve(migrationRoot, lab4Migration), "utf8");
    const lab4Statements = statements(migrationSql).filter((statement) => !/^(BEGIN|COMMIT)$/i.test(statement));
    await setup.$transaction(async (tx) => {
      for (const statement of lab4Statements) await tx.$executeRawUnsafe(statement);
    });

    const category = await setup.category.create({ data: { name: "Performance Smoke" } });
    const system = await setup.relatedSystem.create({ data: { name: "Performance Smoke" } });
    const requester = await setup.developmentRequester.create({ data: { name: "Performance Smoke Requester", email: "performance-requester@toktickit.test" } });
    const staffUsers = [];
    for (let index = 1; index <= 4; index += 1) {
      staffUsers.push(await setup.user.create({ data: {
        name: `Performance Smoke Staff ${index}`,
        email: `performance-staff-${index}@toktickit.test`,
        passwordHash: "local-smoke-only",
        role: "IT_STAFF",
        mustChangePassword: false,
      } }));
    }
    const requesterUser = await setup.user.create({ data: {
      name: requester.name,
      email: requester.email,
      passwordHash: "local-smoke-only",
      role: "REQUESTER",
      legacyRequesterId: requester.id,
      mustChangePassword: false,
    } });
    staffId = staffUsers[0].id;
    requesterId = requesterUser.id;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await setup.session.createMany({ data: [
      { tokenHash: createHash("sha256").update(staffToken).digest("hex"), userId: staffId, expiresAt },
      { tokenHash: createHash("sha256").update(requesterToken).digest("hex"), userId: requesterId, expiresAt },
    ] });

    await setup.$executeRawUnsafe(`
      INSERT INTO "Ticket" ("ticketNumber", "requesterId", "categoryId", "relatedSystemId", "summary", "requestedPriority", "description", "currentStatus", "createdAt", "updatedAt", "itPriority", "ownerUserId", "resolvedAt")
      SELECT 'TKT-PERF-' || sample::text, ${requester.id}, ${category.id}, ${system.id},
        'Synthetic dashboard performance row', 'MEDIUM'::"RequestedPriority", 'Synthetic local data for a disposable performance smoke.',
        CASE sample % 5
          WHEN 0 THEN 'RESOLVED'::"TicketStatus"
          WHEN 1 THEN 'CLOSED'::"TicketStatus"
          WHEN 2 THEN 'WAITING_FOR_REQUESTER'::"TicketStatus"
          WHEN 3 THEN 'IN_PROGRESS'::"TicketStatus"
          ELSE 'NEW'::"TicketStatus"
        END,
        CURRENT_TIMESTAMP - sample * INTERVAL '1 minute',
        CURRENT_TIMESTAMP - sample * INTERVAL '1 minute',
        'MEDIUM'::"RequestedPriority",
        CASE WHEN sample % 2 = 0 THEN ${staffId} ELSE NULL END,
        CASE WHEN sample % 5 IN (0, 1) THEN CURRENT_TIMESTAMP - sample * INTERVAL '1 minute' ELSE NULL END
      FROM generate_series(1, ${syntheticTickets}) AS sample
    `);
    await setup.$executeRawUnsafe(`
      INSERT INTO "ActionTaken" ("ticketId", "actionAt", "description", "result", "status", "followUpRequired", "assignedToUserId", "performedByUserId", "idempotencyKey", "idempotencyPayloadHash", "createdAt", "updatedAt")
      SELECT ((sample - 1) % ${syntheticTickets}) + 1,
        CURRENT_TIMESTAMP - sample * INTERVAL '1 minute', 'Synthetic dashboard performance action', 'Synthetic result.',
        CASE sample % 4
          WHEN 0 THEN 'OPEN'::"ActionTakenStatus"
          WHEN 1 THEN 'IN_PROGRESS'::"ActionTakenStatus"
          WHEN 2 THEN 'COMPLETED'::"ActionTakenStatus"
          ELSE 'CANCELLED'::"ActionTakenStatus"
        END,
        false, ((sample - 1) % 4) + 1, ${staffId}, 'perf-smoke:' || sample::text, repeat('a', 64), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM generate_series(1, ${syntheticActions}) AS sample
    `);
    await setup.$executeRawUnsafe(`ANALYZE "Ticket"`);
    await setup.$executeRawUnsafe(`ANALYZE "ActionTaken"`);

    process.env.DATABASE_URL = connectionUrlForSchema(testDatabaseUrl!, schema);
    runtime = getPrisma();
  }, 120_000);

  afterAll(async () => {
    await runtime?.$disconnect();
    await setup?.$disconnect();
    if (admin) {
      if (schema) await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.$disconnect();
    }
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }, 30_000);

  it("uses bounded indexed dashboard queries and records local response timings", async () => {
    const resolvedPlanRows = await setup!.$queryRawUnsafe<Array<Record<string, any>>>(`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT "id", "resolvedAt" FROM "Ticket"
      WHERE "resolvedAt" >= CURRENT_TIMESTAMP - INTERVAL '7 days' AND "resolvedAt" < CURRENT_TIMESTAMP
      ORDER BY "resolvedAt" DESC, "id" DESC LIMIT 26
    `);
    const actionPlanRows = await setup!.$queryRawUnsafe<Array<Record<string, any>>>(`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT "id", "ticketId", "actionAt", "description", "status" FROM "ActionTaken"
      WHERE "assignedToUserId" = ${staffId} AND "status" IN ('OPEN', 'IN_PROGRESS')
      ORDER BY "actionAt" ASC, "id" ASC LIMIT 10
    `);
    const resolvedPlan = explainSummary(resolvedPlanRows);
    const actionPlan = explainSummary(actionPlanRows);
    expect(resolvedPlan.indexes).toContain("Ticket_resolvedAt_id_idx");
    expect(actionPlan.indexes).toContain("ActionTaken_assignedToUserId_status_actionAt_id_idx");

    let entityQueryCount = 0;
    runtime!.$use(async (params, next) => {
      if (params.model === "Ticket" || params.model === "ActionTaken") entityQueryCount += 1;
      return next(params);
    });

    entityQueryCount = 0;
    const staffStartedAt = performance.now();
    const staffResponse = await request(app).get("/api/staff/dashboard").set("Authorization", `Bearer ${staffToken}`);
    const staffElapsedMs = performance.now() - staffStartedAt;
    const staffQueryCount = entityQueryCount;
    expect(staffResponse.status).toBe(200);
    expect(staffResponse.body.myActions).toHaveLength(10);
    expect(staffResponse.body.recentTickets).toHaveLength(10);
    expect(staffQueryCount).toBeLessThanOrEqual(10);

    entityQueryCount = 0;
    const requesterStartedAt = performance.now();
    const requesterResponse = await request(app).get("/api/requester/dashboard").set("Authorization", `Bearer ${requesterToken}`);
    const requesterElapsedMs = performance.now() - requesterStartedAt;
    const requesterQueryCount = entityQueryCount;
    expect(requesterResponse.status).toBe(200);
    expect(requesterResponse.body.attentionTickets).toHaveLength(10);
    expect(requesterResponse.body.recentTickets).toHaveLength(10);
    expect(requesterResponse.body.recentlyResolvedTickets).toHaveLength(10);
    expect(requesterQueryCount).toBeLessThanOrEqual(8);
    expect(staffElapsedMs).toBeLessThan(3_000);
    expect(requesterElapsedMs).toBeLessThan(3_000);

    console.info(`PERF-01 PostgreSQL smoke (${syntheticTickets.toLocaleString()} Tickets, ${syntheticActions.toLocaleString()} Actions Taken): staff ${staffElapsedMs.toFixed(1)} ms/${staffQueryCount} entity queries; requester ${requesterElapsedMs.toFixed(1)} ms/${requesterQueryCount} entity queries; resolved plan ${resolvedPlan.executionMs.toFixed(1)} ms via ${resolvedPlan.indexes.join(", ")}; My Actions plan ${actionPlan.executionMs.toFixed(1)} ms via ${actionPlan.indexes.join(", ")}.`);
  }, 30_000);
});
