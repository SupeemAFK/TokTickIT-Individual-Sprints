import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({ developmentRequester: { findFirst: vi.fn() }, ticket: { findMany: vi.fn(), count: vi.fn() } }));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

describe("GET /api/tickets", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns only the selected requester tickets with default pagination", async () => {
    prisma.developmentRequester.findFirst.mockResolvedValue({ id: 1 });
    prisma.ticket.findMany.mockResolvedValue([{ id: 12, ticketNumber: "TKT-2026-000012", summary: "VPN", currentStatus: "NEW", requestedPriority: "MEDIUM", category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" }, createdAt: new Date(), updatedAt: new Date() }]);
    prisma.ticket.count.mockResolvedValue(1);
    const response = await request(app).get("/api/tickets?requesterId=1");
    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requesterId: 1 }, skip: 0, take: 10, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
  });


  it("applies search, every filter, sorting, and pagination", async () => {
    prisma.developmentRequester.findFirst.mockResolvedValue({ id: 1 });
    prisma.ticket.findMany.mockResolvedValue([]);
    prisma.ticket.count.mockResolvedValue(21);
    const response = await request(app).get("/api/tickets?requesterId=1&search=vpn&categoryId=2&relatedSystemId=3&requestedPriority=HIGH&status=NEW&sort=summary&direction=asc&page=2&pageSize=20");
    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({ page: 2, pageSize: 20, totalItems: 21, totalPages: 2 });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { requesterId: 1, categoryId: 2, relatedSystemId: 3, requestedPriority: "HIGH", currentStatus: "NEW", OR: [{ ticketNumber: { contains: "vpn", mode: "insensitive" } }, { summary: { contains: "vpn", mode: "insensitive" } }] },
      orderBy: [{ summary: "asc" }, { id: "desc" }], skip: 20, take: 20,
    }));
  });

  it("requires requester context before querying tickets", async () => {
    const response = await request(app).get("/api/tickets");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "requesterId is required." });
    expect(prisma.developmentRequester.findFirst).not.toHaveBeenCalled();
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it("rejects oversized integer query values safely", async () => {
    const response = await request(app).get("/api/tickets?requesterId=999999999999999999999999");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "requesterId must be a positive integer." });
    expect(prisma.developmentRequester.findFirst).not.toHaveBeenCalled();
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it("rejects malformed query values safely", async () => {
    const response = await request(app).get("/api/tickets?requesterId=bad&pageSize=7");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "requesterId must be a positive integer." });
    expect(prisma.developmentRequester.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a missing or inactive requester", async () => {
    prisma.developmentRequester.findFirst.mockResolvedValue(null);
    const response = await request(app).get("/api/tickets?requesterId=1");
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Requester or reference data is unavailable." });
  });
});
