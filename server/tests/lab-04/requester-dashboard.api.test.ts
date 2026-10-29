import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  ticket: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
}));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const requester = { id: 8, name: "Ada Requester", email: "ada@test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 800 };
const staff = { id: 4, name: "Sam Staff", email: "staff@test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const admin = { id: 3, name: "Alex Admin", email: "admin@test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const requesterAuth = { Authorization: "Bearer requester-session" };
const staffAuth = { Authorization: "Bearer staff-session" };
const adminAuth = { Authorization: "Bearer admin-session" };

function ticketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 12,
    ticketNumber: "TKT-2026-000012",
    summary: "VPN cannot connect",
    requestedPriority: "HIGH",
    itPriority: "MEDIUM",
    currentStatus: "OPEN",
    owner: null,
    category: { id: 1, name: "Network" },
    relatedSystem: { id: 2, name: "VPN" },
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    updatedAt: new Date("2026-10-28T10:00:00.000Z"),
    ...overrides,
  };
}

function authenticateAs(user: typeof requester | typeof staff | typeof admin = requester) {
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
});

describe("Lab 4 Requester dashboard API", () => {
  it("returns session-owned metrics and recent lists, ignoring a caller-supplied requester ID", async () => {
    prisma.ticket.count.mockImplementation(async ({ where }: any) => where.requesterId !== requester.legacyRequesterId ? 0 : where.resolvedAt ? 3 : 20);
    prisma.ticket.groupBy.mockResolvedValue([
      { currentStatus: "NEW", _count: { _all: 1 } },
      { currentStatus: "WAITING_FOR_REQUESTER", _count: { _all: 2 } },
      { currentStatus: "REOPENED", _count: { _all: 1 } },
    ]);
    const resolvedAt = new Date("2026-10-27T11:00:00.000Z");
    const resolved = resolvedRow(14, resolvedAt, "CLOSED");
    const attention = ticketRow({ id: 15, ticketNumber: "TKT-2026-000015", currentStatus: "WAITING_FOR_REQUESTER" });
    const recent = ticketRow();
    prisma.ticket.findMany.mockImplementation(async ({ where }: any) => where.resolvedAt ? [resolved] : where.currentStatus ? [attention] : [recent]);

    const response = await request(app).get("/api/requester/dashboard?requesterId=999").set(requesterAuth);

    expect(response.status).toBe(200);
    const { from, to } = response.body.resolvedLast30DaysWindow;
    expect(response.body.asOf).toBe(to);
    expect(Date.parse(to) - Date.parse(from)).toBe(30 * 24 * 60 * 60 * 1000);
    expect(response.body.metrics).toEqual({ totalTickets: 20, activeTickets: 4, waitingForRequester: 2, resolvedLast30Days: 3 });
    expect(response.body.attentionTickets).toMatchObject([{ id: 15, currentStatus: "WAITING_FOR_REQUESTER" }]);
    expect(response.body.recentlyResolvedTickets).toMatchObject([{ id: 14, currentStatus: "CLOSED", resolvedAt: resolvedAt.toISOString() }]);
    expect(response.body.recentTickets).toMatchObject([{ id: 12, ticketNumber: "TKT-2026-000012" }]);
    expect(prisma.ticket.count).toHaveBeenCalledWith({ where: { requesterId: requester.legacyRequesterId } });
    expect(prisma.ticket.count).toHaveBeenCalledWith({ where: { requesterId: requester.legacyRequesterId, resolvedAt: { gte: new Date(from), lt: new Date(to) } } });
    expect(prisma.ticket.groupBy).toHaveBeenCalledWith({
      by: ["currentStatus"],
      where: { requesterId: requester.legacyRequesterId, currentStatus: { in: ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] } },
      _count: { _all: true },
    });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requesterId: requester.legacyRequesterId, resolvedAt: { gte: new Date(from), lt: new Date(to) } }, orderBy: [{ resolvedAt: "desc" }, { id: "desc" }], take: 10 }));
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requesterId: requester.legacyRequesterId }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 10 }));
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requesterId: requester.legacyRequesterId, currentStatus: "WAITING_FOR_REQUESTER" }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 10 }));
  });

  it("returns zero metrics and empty lists and rejects unauthenticated or wrong-role requests", async () => {
    const unauthenticated = await request(app).get("/api/requester/dashboard");
    expect(unauthenticated.status).toBe(401);

    authenticateAs(staff);
    const staffForbidden = await request(app).get("/api/requester/dashboard").set(staffAuth);
    expect(staffForbidden.status).toBe(403);

    authenticateAs(admin);
    const adminForbidden = await request(app).get("/api/requester/dashboard").set(adminAuth);
    expect(adminForbidden.status).toBe(403);

    authenticateAs(requester);
    const empty = await request(app).get("/api/requester/dashboard").set(requesterAuth);
    expect(empty.status).toBe(200);
    expect(empty.body.metrics).toEqual({ totalTickets: 0, activeTickets: 0, waitingForRequester: 0, resolvedLast30Days: 0 });
    expect(empty.body.attentionTickets).toEqual([]);
    expect(empty.body.recentlyResolvedTickets).toEqual([]);
    expect(empty.body.recentTickets).toEqual([]);
  });

  it("pages all owned resolved Tickets using a stable window-bound cursor", async () => {
    const from = "2026-10-01T00:00:00Z";
    const to = "2026-10-28T00:00:00Z";
    const resolvedAt = new Date("2026-10-20T08:00:00.000Z");
    const firstPage = Array.from({ length: 26 }, (_, index) => resolvedRow(230 - index, resolvedAt));
    const last = resolvedRow(204, resolvedAt, "CLOSED");
    prisma.ticket.findMany.mockResolvedValueOnce(firstPage).mockResolvedValueOnce([last]);

    const first = await request(app).get(`/api/requester/dashboard/resolved-tickets?requesterId=999&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).set(requesterAuth);
    expect(first.status).toBe(200);
    expect(first.body.items).toHaveLength(25);
    expect(first.body.items[0].id).toBe(230);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const query = prisma.ticket.findMany.mock.calls[0][0];
    expect(query.where).toMatchObject({ requesterId: requester.legacyRequesterId, resolvedAt: { gte: new Date(from), lt: new Date(to) } });
    expect(query.where.requesterId).not.toBe(999);
    expect(query.orderBy).toEqual([{ resolvedAt: "desc" }, { id: "desc" }]);
    expect(query.take).toBe(26);

    const changedWindow = "2026-09-30T00:00:00Z";
    const mismatchedCursor = await request(app).get(`/api/requester/dashboard/resolved-tickets?from=${encodeURIComponent(changedWindow)}&to=${encodeURIComponent(to)}&cursor=${encodeURIComponent(first.body.nextCursor)}`).set(requesterAuth);
    expect(mismatchedCursor.status).toBe(400);
    expect(mismatchedCursor.body.code).toBe("INVALID_REQUEST");
    expect(prisma.ticket.findMany).toHaveBeenCalledTimes(1);

    const second = await request(app).get(`/api/requester/dashboard/resolved-tickets?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&cursor=${encodeURIComponent(first.body.nextCursor)}`).set(requesterAuth);
    expect(second.status).toBe(200);
    expect(second.body.items).toMatchObject([{ id: 204, currentStatus: "CLOSED", resolvedAt: resolvedAt.toISOString() }]);
    expect(second.body.nextCursor).toBeNull();
    expect(prisma.ticket.findMany.mock.calls[1][0].where.OR).toEqual([
      { resolvedAt: { lt: resolvedAt } },
      { resolvedAt, id: { lt: 206 } },
    ]);
  });

  it("rejects malformed and reversed windows", async () => {
    const malformed = await request(app).get("/api/requester/dashboard/resolved-tickets?from=2026-10-01&to=2026-10-02T00%3A00%3A00Z").set(requesterAuth);
    expect(malformed.status).toBe(400);

    const reversed = await request(app).get("/api/requester/dashboard/resolved-tickets?from=2026-10-03T00%3A00%3A00Z&to=2026-10-02T00%3A00%3A00Z").set(requesterAuth);
    expect(reversed.status).toBe(400);
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });
});
