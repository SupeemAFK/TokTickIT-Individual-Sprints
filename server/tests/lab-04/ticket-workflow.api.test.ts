import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => {
  const mock: any = {
    session: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    ticket: { findUnique: vi.fn(), updateMany: vi.fn() },
    actionTaken: { count: vi.fn() },
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
const ticketDefaults = {
  id: 12,
  ticketNumber: "TKT-2026-000012",
  summary: "VPN cannot connect",
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  owner: null,
  category: { id: 1, name: "Network" },
  relatedSystem: { id: 2, name: "VPN" },
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  updatedAt: new Date("2026-10-28T10:00:00.000Z"),
};

let ticket: Record<string, any>;

function authenticateAs(user: typeof staff | typeof admin | typeof requester = staff) {
  prisma.session.findUnique.mockResolvedValue({ userId: user.id, revokedAt: null, expiresAt: new Date(Date.now() + 3_600_000) });
  prisma.user.findUnique.mockResolvedValue(user);
}

beforeEach(() => {
  vi.resetAllMocks();
  ticket = { ...ticketDefaults, currentStatus: "OPEN", resolvedAt: null };
  authenticateAs();
  prisma.actionTaken.count.mockResolvedValue(0);
  prisma.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback(prisma));
  prisma.$queryRawUnsafe.mockImplementation(async (_query: string, id: number) => id === ticket.id ? [{ id, currentStatus: ticket.currentStatus }] : []);
  prisma.ticket.findUnique.mockImplementation(async (args: any) => args.include ? ticket : { id: ticket.id, currentStatus: ticket.currentStatus });
  prisma.ticket.updateMany.mockImplementation(async ({ where, data }: any) => {
    if (where.id !== ticket.id || where.currentStatus !== ticket.currentStatus) return { count: 0 };
    ticket = { ...ticket, ...data, updatedAt: new Date("2026-10-28T11:00:00.000Z") };
    return { count: 1 };
  });
});

describe("Lab 4 Ticket workflow API", () => {
  it.each([["IT Staff", staff, staffAuth], ["Administrator", admin, adminAuth]])("allows %s to update status with the expected current value", async (_label, user, auth) => {
    authenticateAs(user);

    const response = await request(app).patch("/api/staff/tickets/12/status").set(auth).send({ expectedCurrentStatus: "OPEN", currentStatus: "IN_PROGRESS" });

    expect(response.status).toBe(200);
    expect(response.body.ticket.currentStatus).toBe("IN_PROGRESS");
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT "id", "currentStatus" FROM "Ticket" WHERE "id" = $1 FOR UPDATE', 12);
    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 12, currentStatus: "OPEN" },
      data: { currentStatus: "IN_PROGRESS", resolvedAt: null },
    });
  });

  it("requires a valid expected status, enforces the transition matrix, and rejects stale requests", async () => {
    const missing = await request(app).patch("/api/staff/tickets/12/status").set(staffAuth).send({ currentStatus: "IN_PROGRESS" });
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe("INVALID_REQUEST");

    const invalid = await request(app).patch("/api/staff/tickets/12/status").set(staffAuth).send({ expectedCurrentStatus: "OPEN", currentStatus: "NOT_A_STATUS" });
    expect(invalid.status).toBe(400);

    const disallowed = await request(app).patch("/api/staff/tickets/12/status").set(staffAuth).send({ expectedCurrentStatus: "OPEN", currentStatus: "CLOSED" });
    expect(disallowed.status).toBe(409);
    expect(disallowed.body.code).toBe("CONFLICT");

    const stale = await request(app).patch("/api/staff/tickets/12/status").set(staffAuth).send({ expectedCurrentStatus: "NEW", currentStatus: "IN_PROGRESS" });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe("CONFLICT");
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
  });

  it("blocks resolution while OPEN or IN_PROGRESS actions remain incomplete", async () => {
    prisma.actionTaken.count.mockResolvedValue(1);

    const response = await request(app).patch("/api/staff/tickets/12/status").set(staffAuth).send({ expectedCurrentStatus: "OPEN", currentStatus: "RESOLVED" });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("ACTIONS_INCOMPLETE");
    expect(prisma.actionTaken.count).toHaveBeenCalledWith({ where: { ticketId: 12, status: { in: ["OPEN", "IN_PROGRESS"] } } });
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
    expect(ticket.currentStatus).toBe("OPEN");
    expect(ticket.resolvedAt).toBeNull();
  });

  it.each(["no Actions Taken", "only COMPLETED/CANCELLED Actions Taken"])("resolves tickets with %s and records the server resolution time", async () => {
    const response = await request(app).patch("/api/staff/tickets/12/status").set(adminAuth).send({ expectedCurrentStatus: "OPEN", currentStatus: "RESOLVED" });

    expect(response.status).toBe(200);
    expect(response.body.ticket.currentStatus).toBe("RESOLVED");
    expect(ticket.resolvedAt).toBeInstanceOf(Date);
    expect(prisma.actionTaken.count).toHaveBeenCalledWith({ where: { ticketId: 12, status: { in: ["OPEN", "IN_PROGRESS"] } } });
    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 12, currentStatus: "OPEN" },
      data: { currentStatus: "RESOLVED", resolvedAt: expect.any(Date) },
    });
  });

  it("retains resolvedAt on close and clears it when reopening", async () => {
    const resolvedAt = new Date("2026-10-20T09:00:00.000Z");
    ticket = { ...ticket, currentStatus: "RESOLVED", resolvedAt };

    const closed = await request(app).patch("/api/staff/tickets/12/status").set(staffAuth).send({ expectedCurrentStatus: "RESOLVED", currentStatus: "CLOSED" });
    expect(closed.status).toBe(200);
    expect(ticket.resolvedAt).toEqual(resolvedAt);
    expect(prisma.ticket.updateMany).toHaveBeenLastCalledWith({ where: { id: 12, currentStatus: "RESOLVED" }, data: { currentStatus: "CLOSED" } });

    const reopened = await request(app).patch("/api/staff/tickets/12/status").set(staffAuth).send({ expectedCurrentStatus: "CLOSED", currentStatus: "REOPENED" });
    expect(reopened.status).toBe(200);
    expect(ticket.resolvedAt).toBeNull();
  });

  it("keeps unknown resolution time null for legacy resolved tickets through close and reopen", async () => {
    ticket = { ...ticket, currentStatus: "RESOLVED", resolvedAt: null };

    const closed = await request(app).patch("/api/staff/tickets/12/status").set(staffAuth).send({ expectedCurrentStatus: "RESOLVED", currentStatus: "CLOSED" });
    expect(closed.status).toBe(200);
    expect(ticket.resolvedAt).toBeNull();

    const reopened = await request(app).patch("/api/staff/tickets/12/status").set(staffAuth).send({ expectedCurrentStatus: "CLOSED", currentStatus: "REOPENED" });
    expect(reopened.status).toBe(200);
    expect(ticket.resolvedAt).toBeNull();
  });

  it("forbids Requesters from using staff status controls", async () => {
    authenticateAs(requester);

    const response = await request(app).patch("/api/staff/tickets/12/status").set(requesterAuth).send({ expectedCurrentStatus: "OPEN", currentStatus: "IN_PROGRESS" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
