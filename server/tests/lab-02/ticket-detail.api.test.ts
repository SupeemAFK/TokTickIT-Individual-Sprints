import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({ developmentRequester: { findFirst: vi.fn() }, ticket: { findFirst: vi.fn() } }));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

describe("GET /api/tickets/:ticketId", () => {
  beforeEach(() => { vi.resetAllMocks(); prisma.developmentRequester.findFirst.mockResolvedValue({ id: 1 }); });
  it("returns an owned ticket with read-only display data", async () => {
    prisma.ticket.findFirst.mockResolvedValue({ id: 8, ticketNumber: "TKT-2026-000008", summary: "VPN cannot connect", description: "VPN fails after sign in.", requestedPriority: "HIGH", currentStatus: "NEW", createdAt: new Date(), updatedAt: new Date(), requester: { id: 1, name: "Anan", email: "anan@test" }, category: { id: 2, name: "Network" }, relatedSystem: { id: 3, name: "VPN" } });
    const response = await request(app).get("/api/tickets/8?requesterId=1");
    expect(response.status).toBe(200);
    expect(response.body.ticketNumber).toBe("TKT-2026-000008");
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 8, requesterId: 1 } }));
  });
  it("rejects invalid ticket IDs safely", async () => {
    const response = await request(app).get("/api/tickets/nope?requesterId=1");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "ticketId must be a positive integer." });
    expect(prisma.ticket.findFirst).not.toHaveBeenCalled();
  });
  it("rejects an inactive requester before reading tickets", async () => {
    prisma.developmentRequester.findFirst.mockResolvedValue(null);
    const response = await request(app).get("/api/tickets/8?requesterId=1");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Ticket not found." });
    expect(prisma.ticket.findFirst).not.toHaveBeenCalled();
  });
  it("does not disclose missing or non-owned tickets", async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);
    const response = await request(app).get("/api/tickets/8?requesterId=2");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Ticket not found." });
  });
})
