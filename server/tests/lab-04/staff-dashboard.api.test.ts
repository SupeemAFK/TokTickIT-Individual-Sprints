import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  ticket: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
  actionTaken: { count: vi.fn(), findMany: vi.fn() },
}));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const staff = { id: 4, name: "Sam Staff", email: "staff@test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const admin = { id: 3, name: "Alex Admin", email: "admin@test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const requester = { id: 8, name: "Ada Requester", email: "ada@test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 800 };
const auth = { Authorization: "Bearer staff-session" };
const adminAuth = { Authorization: "Bearer admin-session" };
const requesterAuth = { Authorization: "Bearer requester-session" };

function ticketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    ticketNumber: "TKT-2026-000012",
    summary: "VPN cannot connect",
    requestedPriority: "HIGH",
    itPriority: "MEDIUM",
    currentStatus: "OPEN",
    owner: { id: staff.id, name: staff.name, role: staff.role },
    category: { id: 1, name: "Network" },
    relatedSystem: { id: 2, name: "VPN" },
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    updatedAt: new Date("2026-10-28T10:00:00.000Z"),
    ...overrides,
  };
}

function authenticateAs(user: typeof staff | typeof admin | typeof requester = staff) {
  prisma.session.findUnique.mockResolvedValue({ userId: user.id, revokedAt: null, expiresAt: new Date(Date.now() + 3_600_000) });
  prisma.user.findUnique.mockResolvedValue(user);
}

function resolvedRow(id: number, resolvedAt: Date, currentStatus = "RESOLVED") {
  return ticketRow({ id, ticketNumber: `TKT-2026-${String(id).padStart(6, "0")}`, currentStatus, resolvedAt });
}

beforeEach(() => {
  vi.resetAllMocks();
  authenticateAs();
  prisma.ticket.count.mockResolvedValue(0);
  prisma.ticket.groupBy.mockResolvedValue([]);
  prisma.ticket.findMany.mockResolvedValue([]);
  prisma.actionTaken.count.mockResolvedValue(0);
  prisma.actionTaken.findMany.mockResolvedValue([]);
});

describe("Lab 4 Staff dashboard API", () => {
  it.each([["IT Staff", staff, auth], ["Administrator", admin, adminAuth]])("returns the full staff dashboard to %s", async (_label, user, headers) => {
    authenticateAs(user);
    prisma.ticket.groupBy.mockImplementation(async ({ by }: any) => by[0] === "currentStatus"
      ? [{ currentStatus: "NEW", _count: { _all: 2 } }, { currentStatus: "OPEN", _count: { _all: 3 } }, { currentStatus: "WAITING_FOR_REQUESTER", _count: { _all: 1 } }]
      : [{ itPriority: "LOW", _count: { _all: 2 } }, { itPriority: "HIGH", _count: { _all: 4 } }]);
    prisma.ticket.count.mockImplementation(async ({ where }: any) => where.ownerUserId === null ? 2 : where.ownerUserId === user.id ? 3 : where.resolvedAt ? 4 : 0);
    prisma.actionTaken.count.mockResolvedValue(5);
    prisma.actionTaken.findMany.mockResolvedValue([{
      id: 31,
      ticketId: 12,
      actionAt: new Date("2026-10-28T09:00:00.000Z"),
      description: "Reset the VPN service.",
      status: "IN_PROGRESS",
      ticket: ticketRow(),
    }]);
    prisma.ticket.findMany.mockResolvedValue([ticketRow()]);

    const response = await request(app).get("/api/staff/dashboard").set(headers);

    expect(response.status).toBe(200);
    const { from, to } = response.body.resolvedLast7DaysWindow;
    expect(response.body.asOf).toBe(to);
    expect(Date.parse(to) - Date.parse(from)).toBe(7 * 24 * 60 * 60 * 1000);
    expect(response.body.metrics).toEqual({
      activeTickets: 6,
      unassignedActiveTickets: 2,
      myActiveTickets: 3,
      activeByStatus: { NEW: 2, OPEN: 3, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 1, REOPENED: 0 },
      activeByItPriority: { LOW: 2, MEDIUM: 0, HIGH: 4 },
      waitingForRequester: 1,
      resolvedLast7Days: 4,
      myActiveActions: 5,
    });
    expect(response.body.myActions).toMatchObject([{ id: 31, ticketId: 12, status: "IN_PROGRESS", ticket: { ticketNumber: "TKT-2026-000012" } }]);
    expect(response.body.recentTickets).toMatchObject([{ ticketNumber: "TKT-2026-000012", currentStatus: "OPEN" }]);
    expect(response.body.recentTickets[0].requester).toBeUndefined();
    expect(prisma.ticket.count).toHaveBeenCalledWith({ where: { resolvedAt: { gte: new Date(from), lt: new Date(to) } } });
    expect(prisma.actionTaken.count).toHaveBeenCalledWith({ where: { assignedToUserId: user.id, status: { in: ["OPEN", "IN_PROGRESS"] } } });
    expect(prisma.actionTaken.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assignedToUserId: user.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: [{ actionAt: "asc" }, { id: "asc" }],
      take: 10,
    }));
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 10 }));
  });

  it("returns explicit zero buckets and denies unauthenticated or Requester access", async () => {
    const unauthenticated = await request(app).get("/api/staff/dashboard");
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.code).toBe("UNAUTHENTICATED");

    authenticateAs(requester);
    const forbidden = await request(app).get("/api/staff/dashboard").set(requesterAuth);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe("FORBIDDEN");

    authenticateAs(staff);
    const empty = await request(app).get("/api/staff/dashboard").set(auth);
    expect(empty.status).toBe(200);
    expect(empty.body.metrics).toMatchObject({
      activeTickets: 0,
      activeByStatus: { NEW: 0, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, REOPENED: 0 },
      activeByItPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 },
    });
    expect(empty.body.myActions).toEqual([]);
    expect(empty.body.recentTickets).toEqual([]);
  });

  it("paginates resolved Tickets stably, includes CLOSED rows, and binds cursors to the window", async () => {
    const from = "2026-10-01T00:00:00Z";
    const to = "2026-10-28T00:00:00Z";
    const resolvedAt = new Date("2026-10-20T08:00:00.000Z");
    const firstPage = Array.from({ length: 26 }, (_, index) => resolvedRow(130 - index, resolvedAt));
    const last = resolvedRow(104, resolvedAt, "CLOSED");
    prisma.ticket.findMany.mockResolvedValueOnce(firstPage).mockResolvedValueOnce([last]);

    const first = await request(app).get(`/api/staff/dashboard/resolved-tickets?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).set(auth);
    expect(first.status).toBe(200);
    expect(first.body.items).toHaveLength(25);
    expect(first.body.items[0].id).toBe(130);
    expect(first.body.items[24].id).toBe(106);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const firstQuery = prisma.ticket.findMany.mock.calls[0][0];
    expect(firstQuery.where.resolvedAt).toEqual({ gte: new Date(from), lt: new Date(to) });
    expect(firstQuery.where.currentStatus).toBeUndefined();
    expect(firstQuery.orderBy).toEqual([{ resolvedAt: "desc" }, { id: "desc" }]);
    expect(firstQuery.take).toBe(26);

    const next = await request(app).get(`/api/staff/dashboard/resolved-tickets?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&cursor=${encodeURIComponent(first.body.nextCursor)}`).set(auth);
    expect(next.status).toBe(200);
    expect(next.body.items).toMatchObject([{ id: 104, currentStatus: "CLOSED", resolvedAt: resolvedAt.toISOString() }]);
    expect(next.body.nextCursor).toBeNull();
    expect(prisma.ticket.findMany.mock.calls[1][0].where.OR).toEqual([
      { resolvedAt: { lt: resolvedAt } },
      { resolvedAt, id: { lt: 106 } },
    ]);

    const changedWindow = "2026-10-02T00:00:00Z";
    const invalid = await request(app).get(`/api/staff/dashboard/resolved-tickets?from=${encodeURIComponent(changedWindow)}&to=${encodeURIComponent(to)}&cursor=${encodeURIComponent(first.body.nextCursor)}`).set(auth);
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe("INVALID_REQUEST");
    expect(prisma.ticket.findMany).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["missing bounds", ""],
    ["missing offset", "?from=2026-10-01T00%3A00%3A00&to=2026-10-02T00%3A00%3A00Z"],
    ["reversed bounds", "?from=2026-10-02T00%3A00%3A00Z&to=2026-10-01T00%3A00%3A00Z"],
  ])("rejects %s for resolved-ticket drill-down", async (_label, query) => {
    const response = await request(app).get(`/api/staff/dashboard/resolved-tickets${query}`).set(auth);
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_REQUEST");
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });
});
