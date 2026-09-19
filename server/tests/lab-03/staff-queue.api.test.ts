import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  ticket: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const auth = { Authorization: "Bearer queue-session" };
const staff = { id: 2, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null } as const;
const administrator = { id: 3, name: "Admin One", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, legacyRequesterId: null } as const;
const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 8 } as const;
const queueItem = {
  id: 12,
  ticketNumber: "TKT-2026-000012",
  summary: "VPN cannot connect",
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  owner: null,
  requester: { id: 8, name: "Ada Requester" },
  category: { id: 1, name: "Network" },
  relatedSystem: { id: 2, name: "VPN" },
  createdAt: new Date("2026-09-19T08:00:00.000Z"),
  updatedAt: new Date("2026-09-19T09:00:00.000Z"),
};
const countRows = Array.from({ length: 25 }, () => ({ currentStatus: "IN_PROGRESS", itPriority: "MEDIUM", ownerUserId: null }));

function authenticateAs(user: typeof staff | typeof administrator | typeof requester = staff) {
  prisma.session.findUnique.mockResolvedValue({ userId: user.id, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
  prisma.user.findUnique.mockResolvedValue(user);
}

beforeEach(() => {
  vi.resetAllMocks();
  authenticateAs();
});

describe("Issue #38 IT Staff Ticket Queue API", () => {
  it("returns the filtered, sorted, paginated queue with ownership and count metadata", async () => {
    prisma.ticket.findMany.mockImplementation(async (args: any) => args.select ? countRows : [queueItem]);
    prisma.ticket.count.mockResolvedValue(25);

    const response = await request(app)
      .get("/api/staff/tickets?page=2&pageSize=20&search=VPN&status=IN_PROGRESS&ownerUserId=null&requestedPriority=HIGH&itPriority=MEDIUM&categoryId=1&requesterId=8&sort=summary&direction=asc")
      .set(auth);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([{ ...queueItem, createdAt: queueItem.createdAt.toISOString(), updatedAt: queueItem.updatedAt.toISOString() }]);
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 20, totalItems: 25, totalPages: 2 });
    expect(response.body.counts).toEqual({
      totalItems: 25,
      unassigned: 25,
      byStatus: { NEW: 0, OPEN: 0, IN_PROGRESS: 25, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 },
      byItPriority: { LOW: 0, MEDIUM: 25, HIGH: 0 },
    });

    const rowsQuery = prisma.ticket.findMany.mock.calls.find(([args]: any[]) => args.skip === 20);
    expect(rowsQuery?.[0]).toMatchObject({
      skip: 20,
      take: 20,
      orderBy: [{ summary: "asc" }, { id: "desc" }],
      where: {
        OR: [
          { ticketNumber: { contains: "VPN", mode: "insensitive" } },
          { summary: { contains: "VPN", mode: "insensitive" } },
        ],
        currentStatus: "IN_PROGRESS",
        ownerUserId: null,
        requestedPriority: "HIGH",
        itPriority: "MEDIUM",
        categoryId: 1,
        requesterId: 8,
      },
    });
  });

  it.each([staff, administrator])("allows %s role to access the queue", async (user) => {
    authenticateAs(user);
    prisma.ticket.findMany.mockImplementation(async (args: any) => args.select ? countRows : [queueItem]);
    prisma.ticket.count.mockResolvedValue(1);

    const response = await request(app).get("/api/staff/tickets").set(auth);

    expect(response.status).toBe(200);
    expect(response.body.items[0].ticketNumber).toBe("TKT-2026-000012");
  });

  it("rejects Requester access before querying queue data", async () => {
    authenticateAs(requester);

    const response = await request(app).get("/api/staff/tickets").set(auth);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
    expect(prisma.ticket.count).not.toHaveBeenCalled();
  });

  it.each(["pageSize=15", "sort=unknown", "status=NOT_A_STATUS", "ownerUserId=not-an-id", "requestedPriority=URGENT"])("rejects invalid queue query %s", async (query) => {
    const response = await request(app).get(`/api/staff/tickets?${query}`).set(auth);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_REQUEST");
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
    expect(prisma.ticket.count).not.toHaveBeenCalled();
  });

  it("returns a safe server error when queue retrieval fails", async () => {
    prisma.ticket.findMany.mockRejectedValue(new Error("database unavailable"));
    prisma.ticket.count.mockRejectedValue(new Error("database unavailable"));

    const response = await request(app).get("/api/staff/tickets").set(auth);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Unable to load the ticket queue.", code: "SERVER_ERROR" });
  });
});
