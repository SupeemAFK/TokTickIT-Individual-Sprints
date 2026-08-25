import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  developmentRequester: { findFirst: vi.fn() },
  category: { findFirst: vi.fn() },
  relatedSystem: { findFirst: vi.fn() },
  ticket: { create: vi.fn(), update: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));

import { app } from "../../src/app.js";

const validTicket = {
  requesterId: 1,
  categoryId: 2,
  relatedSystemId: 3,
  summary: "  VPN cannot connect  ",
  requestedPriority: "MEDIUM",
  description: "  VPN connection fails after signing in.  ",
};

function mockActiveReferences() {
  prisma.developmentRequester.findFirst.mockResolvedValue({ id: 1 });
  prisma.category.findFirst.mockResolvedValue({ id: 2 });
  prisma.relatedSystem.findFirst.mockResolvedValue({ id: 3 });
}

describe("POST /api/tickets", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  });

  it("creates a trimmed New ticket with a server-generated official number", async () => {
    mockActiveReferences();
    const createdAt = new Date("2026-08-25T08:00:00.000Z");
    prisma.ticket.create.mockResolvedValue({ id: 42, createdAt });
    prisma.ticket.update.mockResolvedValue({
      id: 42,
      ticketNumber: "TKT-2026-000042",
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 3,
      summary: "VPN cannot connect",
      requestedPriority: "MEDIUM",
      description: "VPN connection fails after signing in.",
      currentStatus: "NEW",
      createdAt,
      updatedAt: createdAt,
    });

    const response = await request(app).post("/api/tickets").send(validTicket);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      ticketNumber: "TKT-2026-000042",
      requesterId: 1,
      summary: "VPN cannot connect",
      currentStatus: "NEW",
    });
    expect(prisma.ticket.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        requesterId: 1,
        categoryId: 2,
        relatedSystemId: 3,
        summary: "VPN cannot connect",
        description: "VPN connection fails after signing in.",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
      }),
    }));
    expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 42 },
      data: { ticketNumber: "TKT-2026-000042" },
    }));
  });

  it("rejects invalid input before attempting a database transaction", async () => {
    const response = await request(app).post("/api/tickets").send({ ...validTicket, summary: "bad" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "summary must be between 5 and 160 characters." });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an inactive or missing requester/reference safely", async () => {
    prisma.developmentRequester.findFirst.mockResolvedValue(null);
    prisma.category.findFirst.mockResolvedValue({ id: 2 });
    prisma.relatedSystem.findFirst.mockResolvedValue({ id: 3 });

    const response = await request(app).post("/api/tickets").send(validTicket);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Requester or reference data is unavailable." });
    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });

  it("returns a safe error when ticket creation fails unexpectedly", async () => {
    prisma.$transaction.mockRejectedValue(new Error("database unavailable"));

    const response = await request(app).post("/api/tickets").send(validTicket);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Unable to create the ticket." });
  });
});
