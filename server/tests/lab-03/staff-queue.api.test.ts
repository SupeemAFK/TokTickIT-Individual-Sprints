import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  ticket: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const staff = { id: 2, name: "Staff", email: "staff@example.test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const row = { id: 12, ticketNumber: "TKT-2026-000012", summary: "VPN", requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "NEW", owner: null, requester: { id: 8, name: "Ada", email: "ada@example.test" }, category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" }, createdAt: new Date(), updatedAt: new Date() };

describe("Lab 3 staff queue API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.session.findUnique.mockResolvedValue({ userId: 2, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
    prisma.user.findUnique.mockResolvedValue(staff);
    prisma.ticket.findMany.mockImplementation(async (args: any) => args.select ? [{ currentStatus: "NEW", itPriority: "MEDIUM", ownerUserId: null }] : [row]);
    prisma.ticket.count.mockResolvedValue(1);
  });

  it("supports queue filtering, sorting, pagination, and filtered counts", async () => {
    const response = await request(app).get("/api/staff/tickets?search=vpn&status=NEW&ownerUserId=null&requestedPriority=HIGH&itPriority=MEDIUM&sort=updatedAt&direction=asc&page=2&pageSize=20").set("Authorization", "Bearer staff-session");

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 20, totalItems: 1, totalPages: 1 });
    expect(response.body.counts).toEqual({ totalItems: 1, unassigned: 1, byStatus: { NEW: 1, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 }, byItPriority: { LOW: 0, MEDIUM: 1, HIGH: 0 } });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ currentStatus: "NEW", ownerUserId: null, requestedPriority: "HIGH", itPriority: "MEDIUM" }),
      skip: 20,
      take: 20,
    }));
  });

  it("rejects invalid queue parameters before querying tickets", async () => {
    const response = await request(app).get("/api/staff/tickets?pageSize=15&direction=sideways").set("Authorization", "Bearer staff-session");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_REQUEST");
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it("rejects invalid status and priority values safely", async () => {
    const status = await request(app).get("/api/staff/tickets?status=UNKNOWN").set("Authorization", "Bearer staff-session");
    const priority = await request(app).get("/api/staff/tickets?itPriority=URGENT").set("Authorization", "Bearer staff-session");

    expect(status.status).toBe(400);
    expect(priority.status).toBe(400);
    expect(status.body).toEqual(expect.objectContaining({ code: "INVALID_REQUEST" }));
  });
});
