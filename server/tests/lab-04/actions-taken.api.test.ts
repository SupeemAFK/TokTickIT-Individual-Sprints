import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => {
  const mock: any = {
    session: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findFirst: vi.fn() },
    ticket: { findFirst: vi.fn(), findUnique: vi.fn() },
    actionTaken: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  };
  mock.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback(mock));
  return mock;
});

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const staff = { id: 2, name: "Sam Staff", email: "staff@test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const admin = { id: 3, name: "Alex Admin", email: "admin@test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const requester = { id: 8, name: "Ada Requester", email: "ada@test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 800 };
const staffAuth = { Authorization: "Bearer staff-session" };
const adminAuth = { Authorization: "Bearer admin-session" };
const requesterAuth = { Authorization: "Bearer requester-session" };
const updatedAt = new Date("2026-10-28T06:30:00.000Z");
const baseAction = {
  id: 50,
  ticketId: 12,
  actionAt: new Date("2026-10-28T07:00:00.000Z"),
  description: "Restarted the VPN service.",
  result: "The connection is available again.",
  status: "OPEN",
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  assignedToUserId: 3,
  assignedTo: { id: 3, name: admin.name, role: admin.role },
  performedByUserId: 2,
  performedBy: { id: 2, name: staff.name, role: staff.role },
  idempotencyKey: "secret-idempotency-key",
  idempotencyPayloadHash: "secret-payload-hash",
  createdAt: new Date("2026-10-28T07:01:00.000Z"),
  updatedAt,
};

function authenticateAs(user: typeof staff | typeof admin | typeof requester = staff) {
  prisma.session.findUnique.mockResolvedValue({ userId: user.id, revokedAt: null, expiresAt: new Date(Date.now() + 3_600_000) });
  prisma.user.findUnique.mockResolvedValue(user);
}

function createBody(overrides: Record<string, unknown> = {}) {
  return {
    actionAt: "2026-10-28T14:00:00+07:00",
    description: " Restarted the VPN service. ",
    result: " The connection is available again. ",
    assignedToUserId: admin.id,
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  authenticateAs();
  prisma.ticket.findUnique.mockResolvedValue({ id: 12, currentStatus: "OPEN" });
  prisma.ticket.findFirst.mockResolvedValue({ id: 12 });
  prisma.actionTaken.findMany.mockResolvedValue([]);
  prisma.actionTaken.findUnique.mockResolvedValue(null);
  prisma.actionTaken.findFirst.mockResolvedValue(baseAction);
  prisma.actionTaken.create.mockResolvedValue(baseAction);
  prisma.actionTaken.updateMany.mockResolvedValue({ count: 1 });
  prisma.user.findFirst.mockResolvedValue({ id: admin.id });
  prisma.$queryRawUnsafe.mockResolvedValue([{ id: 12, currentStatus: "OPEN" }]);
  prisma.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback(prisma));
});

describe("Lab 4 Actions Taken API", () => {
  it("lists actions to staff in contract order with a safe response shape", async () => {
    prisma.actionTaken.findMany.mockResolvedValue([baseAction]);

    const response = await request(app).get("/api/tickets/12/actions").set(staffAuth);

    expect(response.status).toBe(200);
    expect(prisma.ticket.findUnique).toHaveBeenCalledWith({ where: { id: 12 }, select: { id: true } });
    expect(prisma.actionTaken.findMany).toHaveBeenCalledWith({ where: { ticketId: 12 }, orderBy: [{ actionAt: "asc" }, { id: "asc" }], select: expect.any(Object) });
    expect(response.body.items[0]).toMatchObject({ id: 50, assignedTo: { id: 3 }, performedBy: { id: 2 } });
    expect(response.body.items[0]).not.toHaveProperty("idempotencyKey");
    expect(response.body.items[0]).not.toHaveProperty("idempotencyPayloadHash");
  });

  it("scopes Requester history to the linked Requester and hides another Requester's Ticket", async () => {
    authenticateAs(requester);
    prisma.ticket.findFirst.mockResolvedValueOnce({ id: 12 });
    const own = await request(app).get("/api/tickets/12/actions").set(requesterAuth);
    expect(own.status).toBe(200);
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith({ where: { id: 12, requesterId: requester.legacyRequesterId }, select: { id: true } });

    prisma.ticket.findFirst.mockResolvedValueOnce(null);
    const other = await request(app).get("/api/tickets/13/actions").set(requesterAuth);
    expect(other.status).toBe(404);
    expect(other.body.code).toBe("NOT_FOUND");
    expect(prisma.actionTaken.findMany).toHaveBeenCalledTimes(1);
  });

  it("requires a valid session and prevents Requesters from writing", async () => {
    const unauthenticated = await request(app).get("/api/tickets/12/actions");
    expect(unauthenticated.status).toBe(401);

    authenticateAs(requester);
    const forbidden = await request(app).post("/api/staff/tickets/12/actions").set(requesterAuth).set("Idempotency-Key", "requester-key").send(createBody());
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe("FORBIDDEN");
    expect(prisma.actionTaken.create).not.toHaveBeenCalled();
  });

  it.each([["IT Staff", staff, staffAuth], ["Administrator", admin, adminAuth]])("creates an action for %s with server-derived performer", async (_label, user, auth) => {
    authenticateAs(user);
    prisma.actionTaken.create.mockResolvedValue({ ...baseAction, performedByUserId: user.id, performedBy: { id: user.id, name: user.name, role: user.role } });

    const response = await request(app).post("/api/staff/tickets/12/actions").set(auth).set("Idempotency-Key", "issue-66-create-1").send(createBody());

    expect(response.status).toBe(201);
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT "id", "currentStatus" FROM "Ticket" WHERE "id" = $1 FOR UPDATE', 12);
    expect(prisma.actionTaken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ticketId: 12,
        actionAt: new Date("2026-10-28T07:00:00.000Z"),
        description: "Restarted the VPN service.",
        result: "The connection is available again.",
        status: "OPEN",
        assignedToUserId: admin.id,
        performedByUserId: user.id,
        idempotencyKey: "issue-66-create-1",
        idempotencyPayloadHash: expect.any(String),
      }),
    }));
    expect(response.body.action.performedBy).toEqual({ id: user.id, name: user.name, role: user.role });
    expect(response.body.action).not.toHaveProperty("idempotencyKey");
    expect(response.body.action).not.toHaveProperty("idempotencyPayloadHash");
  });

  it("rejects client-supplied actor fields and malformed action values", async () => {
    const impersonation = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "impersonation").send(createBody({ performedByUserId: requester.id }));
    expect(impersonation.status).toBe(400);
    expect(prisma.actionTaken.create).not.toHaveBeenCalled();

    const invalidTime = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "no-offset").send(createBody({ actionAt: "2026-10-28T14:00:00" }));
    expect(invalidTime.status).toBe(400);

    const impossibleDate = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "bad-calendar-date").send(createBody({ actionAt: "2026-02-30T14:00:00Z" }));
    expect(impossibleDate.status).toBe(400);

    const blankText = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "blank").send(createBody({ description: "   " }));
    expect(blankText.status).toBe(400);

    const overLimit = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "over-limit").send(createBody({ result: "x".repeat(2001) }));
    expect(overLimit.status).toBe(400);

    const overLimitNote = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "over-limit-note").send(createBody({ attachmentNotes: "x".repeat(1001) }));
    expect(overLimitNote.status).toBe(400);

    const requiredNote = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "follow-up").send(createBody({ followUpRequired: true, followUpNote: "  " }));
    expect(requiredNote.status).toBe(400);
    expect(prisma.actionTaken.create).not.toHaveBeenCalled();
  });

  it("requires the idempotency header and validates assignment eligibility", async () => {
    const missingKey = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).send(createBody());
    expect(missingKey.status).toBe(400);

    prisma.user.findFirst.mockResolvedValue(null);
    const invalidAssignee = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "bad-assignee").send(createBody());
    expect(invalidAssignee.status).toBe(400);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({ where: { id: admin.id, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } });
    expect(prisma.actionTaken.create).not.toHaveBeenCalled();

    const requesterAssignee = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "requester-assignee").send(createBody({ assignedToUserId: requester.id }));
    expect(requesterAssignee.status).toBe(400);
    expect(prisma.user.findFirst).toHaveBeenLastCalledWith({ where: { id: requester.id, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } });
  });

  it("allows an explicitly unassigned action and blocks writes on inactive Tickets", async () => {
    const unassigned = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "unassigned").send(createBody({ assignedToUserId: null }));
    expect(unassigned.status).toBe(201);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();

    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 12, currentStatus: "RESOLVED" }]);
    const resolved = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "resolved-ticket").send(createBody());
    expect(resolved.status).toBe(409);
    expect(resolved.body.code).toBe("CONFLICT");
  });

  it("replays a matching idempotent create and conflicts on changed payload", async () => {
    const samePayload = createBody({ actionAt: "2026-10-28T07:00:00Z" });
    const normalizedHash = (await import("node:crypto")).createHash("sha256").update(JSON.stringify({
      actionAt: new Date(samePayload.actionAt).toISOString(),
      description: "Restarted the VPN service.",
      result: "The connection is available again.",
      assignedToUserId: admin.id,
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
    })).digest("hex");
    const prior = { ...baseAction, ticketId: 12, performedByUserId: staff.id, idempotencyPayloadHash: normalizedHash };
    prisma.actionTaken.findUnique.mockResolvedValue(prior);

    const replay = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "replayed-key").send(samePayload);
    expect(replay.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.actionTaken.create).not.toHaveBeenCalled();

    const mismatch = await request(app).post("/api/staff/tickets/12/actions").set(staffAuth).set("Idempotency-Key", "replayed-key").send(createBody({ result: "Different result." }));
    expect(mismatch.status).toBe(409);
    expect(mismatch.body.code).toBe("IDEMPOTENCY_KEY_REUSED");

    authenticateAs(admin);
    const differentActor = await request(app).post("/api/staff/tickets/12/actions").set(adminAuth).set("Idempotency-Key", "replayed-key").send(samePayload);
    expect(differentActor.status).toBe(409);
    expect(differentActor.body.code).toBe("IDEMPOTENCY_KEY_REUSED");

    authenticateAs(staff);
    const differentTicket = await request(app).post("/api/staff/tickets/13/actions").set(staffAuth).set("Idempotency-Key", "replayed-key").send(samePayload);
    expect(differentTicket.status).toBe(409);
    expect(differentTicket.body.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("edits an action with the expected timestamp and enforces legal status transitions", async () => {
    const changed = { ...baseAction, status: "IN_PROGRESS", updatedAt: new Date("2026-10-28T06:31:00.000Z") };
    prisma.actionTaken.findFirst.mockResolvedValueOnce(baseAction).mockResolvedValueOnce(changed);

    const response = await request(app).patch("/api/staff/tickets/12/actions/50").set(staffAuth).send({ expectedUpdatedAt: updatedAt.toISOString(), status: "IN_PROGRESS", result: "Monitoring the VPN gateway." });

    expect(response.status).toBe(200);
    expect(prisma.actionTaken.updateMany).toHaveBeenCalledWith({ where: { id: 50, ticketId: 12, updatedAt }, data: { status: "IN_PROGRESS", result: "Monitoring the VPN gateway." } });
    expect(response.body.action.status).toBe("IN_PROGRESS");
  });

  it("rejects stale edits, invalid transitions, and changes to terminal actions", async () => {
    const stale = await request(app).patch("/api/staff/tickets/12/actions/50").set(staffAuth).send({ expectedUpdatedAt: "2026-10-28T06:00:00Z", description: "A newer description." });
    expect(stale.status).toBe(409);
    expect(prisma.actionTaken.updateMany).not.toHaveBeenCalled();

    prisma.actionTaken.findFirst.mockResolvedValueOnce({ ...baseAction, status: "IN_PROGRESS" });
    const illegal = await request(app).patch("/api/staff/tickets/12/actions/50").set(staffAuth).send({ expectedUpdatedAt: updatedAt.toISOString(), status: "OPEN" });
    expect(illegal.status).toBe(409);
    expect(prisma.actionTaken.updateMany).not.toHaveBeenCalled();

    prisma.actionTaken.findFirst.mockResolvedValue({ ...baseAction, status: "COMPLETED" });
    const terminal = await request(app).patch("/api/staff/tickets/12/actions/50").set(staffAuth).send({ expectedUpdatedAt: updatedAt.toISOString(), result: "Edit after completion." });
    expect(terminal.status).toBe(409);
  });

  it("completes an action through PATCH and cancels an active action through the cancel route", async () => {
    const completed = { ...baseAction, status: "COMPLETED" };
    prisma.actionTaken.findFirst.mockResolvedValueOnce(baseAction).mockResolvedValueOnce(completed);
    const completeResponse = await request(app).patch("/api/staff/tickets/12/actions/50").set(adminAuth).send({ expectedUpdatedAt: updatedAt.toISOString(), status: "COMPLETED" });
    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.action.status).toBe("COMPLETED");

    prisma.actionTaken.findFirst.mockResolvedValueOnce({ ...baseAction, status: "IN_PROGRESS" }).mockResolvedValueOnce({ ...baseAction, status: "CANCELLED" });
    const cancelResponse = await request(app).post("/api/staff/tickets/12/actions/50/cancel").set(adminAuth).send({ expectedUpdatedAt: updatedAt.toISOString() });
    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.action.status).toBe("CANCELLED");
    expect(prisma.actionTaken.updateMany).toHaveBeenLastCalledWith({ where: { id: 50, ticketId: 12, updatedAt }, data: { status: "CANCELLED" } });
  });

  it("rejects cancellation without the expected timestamp or for a terminal action", async () => {
    const missing = await request(app).post("/api/staff/tickets/12/actions/50/cancel").set(staffAuth).send({});
    expect(missing.status).toBe(400);

    prisma.actionTaken.findFirst.mockResolvedValue({ ...baseAction, status: "CANCELLED" });
    const terminal = await request(app).post("/api/staff/tickets/12/actions/50/cancel").set(staffAuth).send({ expectedUpdatedAt: updatedAt.toISOString() });
    expect(terminal.status).toBe(409);
  });
});
