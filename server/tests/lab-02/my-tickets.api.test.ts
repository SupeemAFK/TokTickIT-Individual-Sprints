import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() }, user: { findUnique: vi.fn() },
  ticket: { findMany: vi.fn(), count: vi.fn() },
}));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const user = { id: 1, name: "Anan", email: "anan@test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 1 };
const auth = { Authorization: "Bearer session-token" };
const row = { id: 12, ticketNumber: "TKT-2026-000012", summary: "VPN", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW", owner: null, category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" }, createdAt: new Date(), updatedAt: new Date() };

describe("GET /api/tickets", () => {
  beforeEach(() => { vi.resetAllMocks(); prisma.session.findUnique.mockResolvedValue({ userId: 1, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) }); prisma.user.findUnique.mockResolvedValue(user); });
  it("derives ownership from the session and returns canonical pagination", async () => {
    prisma.ticket.findMany.mockResolvedValue([row]); prisma.ticket.count.mockResolvedValue(1);
    const response = await request(app).get("/api/tickets?requesterId=999").set(auth);
    expect(response.status).toBe(200); expect(response.body.pagination).toEqual({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requesterId: 1 }, skip: 0, take: 10 }));
  });
  it("applies the supported filters and pagination", async () => {
    prisma.ticket.findMany.mockResolvedValue([]); prisma.ticket.count.mockResolvedValue(21);
    const response = await request(app).get("/api/tickets?search=vpn&categoryId=2&relatedSystemId=3&requestedPriority=HIGH&status=NEW&sort=summary&direction=asc&page=2&pageSize=20").set(auth);
    expect(response.status).toBe(200); expect(response.body.pagination).toEqual({ page: 2, pageSize: 20, totalItems: 21, totalPages: 2 });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ requesterId: 1, categoryId: 2, relatedSystemId: 3, requestedPriority: "HIGH", currentStatus: "NEW" }), orderBy: [{ summary: "asc" }, { id: "desc" }], skip: 20, take: 20 }));
  });
  it("requires a bearer session", async () => { const response = await request(app).get("/api/tickets"); expect(response.status).toBe(401); expect(response.body.code).toBe("UNAUTHENTICATED"); expect(prisma.ticket.findMany).not.toHaveBeenCalled(); });
  it("rejects malformed query values safely", async () => { const response = await request(app).get("/api/tickets?pageSize=7").set(auth); expect(response.status).toBe(400); expect(response.body.code).toBe("INVALID_REQUEST"); expect(prisma.ticket.findMany).not.toHaveBeenCalled(); });
});
