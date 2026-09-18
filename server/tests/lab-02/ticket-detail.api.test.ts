import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
const prisma = vi.hoisted(() => ({ session: { findUnique: vi.fn() }, user: { findUnique: vi.fn() }, ticket: { findFirst: vi.fn() } }));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";
const auth = { Authorization: "Bearer session-token" }; const user = { id: 1, name: "Anan", email: "anan@test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 1 };
describe("GET /api/tickets/:ticketId", () => {
  beforeEach(() => { vi.resetAllMocks(); prisma.session.findUnique.mockResolvedValue({ userId: 1, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) }); prisma.user.findUnique.mockResolvedValue(user); });
  it("returns only an owned ticket", async () => { prisma.ticket.findFirst.mockResolvedValue({ id: 8, ticketNumber: "TKT-2026-000008", summary: "VPN cannot connect", description: "VPN fails after sign in.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", owner: null, createdAt: new Date(), updatedAt: new Date(), requester: { id: 1, name: "Anan", email: "anan@test" }, category: { id: 2, name: "Network" }, relatedSystem: { id: 3, name: "VPN" }, attachments: [], publicComments: [], internalNotes: [] }); const response = await request(app).get("/api/tickets/8?requesterId=999").set(auth); expect(response.status).toBe(200); expect(response.body.ticketNumber).toBe("TKT-2026-000008"); expect(prisma.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 8, requesterId: 1 } })); expect(response.body.internalNotes).toBeUndefined(); });
  it("rejects invalid ticket IDs safely", async () => { const response = await request(app).get("/api/tickets/nope").set(auth); expect(response.status).toBe(400); expect(response.body.code).toBe("INVALID_REQUEST"); expect(prisma.ticket.findFirst).not.toHaveBeenCalled(); });
  it("does not disclose missing or non-owned tickets", async () => { prisma.ticket.findFirst.mockResolvedValue(null); const response = await request(app).get("/api/tickets/8").set(auth); expect(response.status).toBe(404); expect(response.body.code).toBe("NOT_FOUND"); });
});
