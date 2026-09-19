import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  ticket: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  publicComment: { findMany: vi.fn(), create: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const auth = { Authorization: "Bearer requester-session" };
const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 8 };
const ownedTicket = { id: 12 };
const comment = { id: 20, content: "The issue is still happening.", author: { id: 8, name: "Ada Requester", role: "REQUESTER" }, createdAt: new Date("2026-09-19T10:00:00.000Z") };
const updatedTicket = {
  id: 12, ticketNumber: "TKT-2026-000012", summary: "VPN cannot connect", description: "VPN fails after sign in.",
  requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "IN_PROGRESS", requesterReportedResolvedAt: new Date("2026-09-19T10:00:00.000Z"),
  owner: null, requester: { id: 8, name: "Ada Requester", email: "ada@example.test" },
  category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" },
  attachments: [], publicComments: [], internalNotes: [],
  createdAt: new Date("2026-09-19T09:00:00.000Z"), updatedAt: new Date("2026-09-19T10:00:00.000Z"),
};

beforeEach(() => {
  vi.resetAllMocks();
  prisma.session.findUnique.mockResolvedValue({ userId: requester.id, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
  prisma.user.findUnique.mockResolvedValue(requester);
});

describe("Lab 3 Requester comments and resolution", () => {
  it("retrieves public comments only for the authenticated owner", async () => {
    prisma.ticket.findFirst.mockResolvedValue(ownedTicket);
    prisma.publicComment.findMany.mockResolvedValue([comment]);

    const response = await request(app).get("/api/tickets/12/comments").set(auth);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([{ ...comment, createdAt: comment.createdAt.toISOString() }]);
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 12, requesterId: 8 } }));
  });

  it("rejects comment retrieval and creation for a non-owned ticket without querying comments", async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);

    const retrieved = await request(app).get("/api/tickets/12/comments").set(auth);
    const created = await request(app).post("/api/tickets/12/comments").set(auth).send({ content: "Private attempt" });

    expect(retrieved.status).toBe(404);
    expect(created.status).toBe(404);
    expect(prisma.publicComment.findMany).not.toHaveBeenCalled();
    expect(prisma.publicComment.create).not.toHaveBeenCalled();
  });

  it("creates a public comment with trimmed content and the authenticated author", async () => {
    prisma.ticket.findFirst.mockResolvedValue(ownedTicket);
    prisma.publicComment.create.mockResolvedValue({ ...comment, content: "Need an update." });

    const response = await request(app).post("/api/tickets/12/comments").set(auth).send({ content: "  Need an update.  ", authorId: 999 });

    expect(response.status).toBe(201);
    expect(prisma.publicComment.create).toHaveBeenCalledWith(expect.objectContaining({ data: { ticketId: 12, authorId: 8, content: "Need an update." } }));
  });

  it("rejects blank public comments before creating content", async () => {
    prisma.ticket.findFirst.mockResolvedValue(ownedTicket);

    const response = await request(app).post("/api/tickets/12/comments").set(auth).send({ content: "   " });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_REQUEST");
    expect(prisma.publicComment.create).not.toHaveBeenCalled();
  });

  it("records the resolution signal without changing the formal ticket status", async () => {
    prisma.ticket.findFirst.mockResolvedValue(ownedTicket);
    prisma.ticket.update.mockResolvedValue(updatedTicket);

    const response = await request(app).post("/api/tickets/12/resolution-signal").set(auth);

    expect(response.status).toBe(200);
    expect(response.body.ticket.currentStatus).toBe("IN_PROGRESS");
    expect(response.body.ticket.problemAppearsResolvedAt).toBe(updatedTicket.requesterReportedResolvedAt.toISOString());
    expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 12 },
      data: { requesterReportedResolvedAt: expect.any(Date) },
    }));
    expect(prisma.ticket.update.mock.calls[0][0].data).not.toHaveProperty("currentStatus");
  });

  it.each(["RESOLVED", "CLOSED"])("does not allow a Requester to formally set %s", async (status) => {
    const response = await request(app).patch("/api/staff/tickets/12/status").set(auth).send({ currentStatus: status });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });
});
