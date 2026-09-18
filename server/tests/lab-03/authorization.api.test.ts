import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { configureRequesterAuth, loginRequester } from "../helpers/auth.js";

const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: { findUnique: vi.fn() },
  developmentRequester: { findFirst: vi.fn() },
  category: { findFirst: vi.fn() },
  relatedSystem: { findFirst: vi.fn() },
  ticket: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  publicComment: { create: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

describe("Lab 3 authenticated requester API", () => {
  let authHeader = "";
  beforeEach(async () => {
    vi.resetAllMocks();
    configureRequesterAuth(prisma.user.findUnique);
    authHeader = "Bearer " + await loginRequester(app);
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.developmentRequester.findFirst.mockResolvedValue({ id: 1 });
  });

  it("cannot access staff queue or internal-note operations", async () => {
    const queue = await request(app).get("/api/staff/tickets").set("Authorization", authHeader);
    expect(queue.status).toBe(403);
    const note = await request(app).post("/api/staff/tickets/42/notes").set("Authorization", authHeader).send({ content: "Private" });
    expect(note.status).toBe(403);
  });

  it("requires a bearer session before any legacy requester route", async () => {
    const response = await request(app).get("/api/tickets?requesterId=1");
    expect(response.status).toBe(401);
    expect(prisma.ticket.findMany).not.toHaveBeenCalled();
  });

  it("uses the authenticated requester even when the legacy hint is different", async () => {
    prisma.ticket.findMany.mockResolvedValue([]);
    prisma.ticket.count.mockResolvedValue(0);
    const response = await request(app).get("/api/tickets?requesterId=999").set("Authorization", authHeader);
    expect(response.status).toBe(200);
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requesterId: 1 } }));
    expect(prisma.ticket.findMany).not.toHaveBeenCalledWith(expect.objectContaining({ where: { requesterId: 999 } }));
  });

  it("creates a requester ticket atomically with active references and an official number", async () => {
    prisma.category.findFirst.mockResolvedValue({ id: 2 });
    prisma.relatedSystem.findFirst.mockResolvedValue({ id: 3 });
    const createdAt = new Date("2026-09-18T10:00:00.000Z");
    prisma.ticket.create.mockResolvedValue({ id: 42, createdAt });
    prisma.ticket.update.mockResolvedValue({ id: 42, ticketNumber: "TKT-2026-000042", requesterId: 1, categoryId: 2, relatedSystemId: 3, currentStatus: "NEW" });
    const response = await request(app).post("/api/requester/tickets").set("Authorization", authHeader).send({ categoryId: 2, relatedSystemId: 3, summary: "VPN issue", description: "VPN fails after sign in.", requestedPriority: "HIGH" });
    expect(response.status).toBe(201);
    expect(response.body.ticketNumber).toBe("TKT-2026-000042");
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.category.findFirst).toHaveBeenCalledWith({ where: { id: 2, isActive: true }, select: { id: true } });
    expect(prisma.ticket.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ requesterId: 1, currentStatus: "NEW", ticketNumber: expect.stringMatching(/^PENDING-/) }) }));
    expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 }, data: { ticketNumber: "TKT-2026-000042" } }));
  });

  it("rejects inactive reference data before creating a ticket", async () => {
    prisma.category.findFirst.mockResolvedValue(null);
    prisma.relatedSystem.findFirst.mockResolvedValue({ id: 3 });
    const response = await request(app).post("/api/requester/tickets").set("Authorization", authHeader).send({ categoryId: 2, relatedSystemId: 3, summary: "VPN issue", description: "VPN fails after sign in.", requestedPriority: "HIGH" });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Category or related system is unavailable." });
    expect(prisma.ticket.create).not.toHaveBeenCalled();
  });

  it("returns public comments and attachments without internal notes", async () => {
    prisma.ticket.findFirst.mockResolvedValue({ id: 42, requesterId: 1, ticketNumber: "TKT-2026-000042", summary: "VPN issue", currentStatus: "NEW", category: { id: 2, name: "Network" }, relatedSystem: { id: 3, name: "VPN" }, attachments: [{ id: 5, originalFilename: "guide.pdf", removedAt: null }], publicComments: [{ id: 8, content: "We are investigating.", author: { id: 9, name: "Arun", role: "IT_STAFF" } }] });
    const response = await request(app).get("/api/requester/tickets/42").set("Authorization", authHeader);
    expect(response.status).toBe(200);
    expect(response.body.publicComments[0].content).toBe("We are investigating.");
    expect(response.body.attachments[0].originalFilename).toBe("guide.pdf");
    expect(response.body.internalNotes).toBeUndefined();
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42, requesterId: 1 } }));
  });

  it("records requester public comments and problem-resolved reports only on owned tickets", async () => {
    prisma.ticket.findFirst.mockResolvedValue({ id: 42 });
    prisma.publicComment.create.mockResolvedValue({ id: 10, ticketId: 42, content: "Thanks" });
    prisma.ticket.update.mockResolvedValue({ id: 42, requesterReportedResolvedAt: new Date() });
    const comment = await request(app).post("/api/requester/tickets/42/comments").set("Authorization", authHeader).send({ content: "Thanks" });
    expect(comment.status).toBe(201);
    expect(prisma.publicComment.create).toHaveBeenCalledWith(expect.objectContaining({ data: { ticketId: 42, authorId: 1, content: "Thanks" } }));
    const resolved = await request(app).post("/api/requester/tickets/42/appears-resolved").set("Authorization", authHeader);
    expect(resolved.status).toBe(200);
    expect(prisma.ticket.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 }, data: { requesterReportedResolvedAt: expect.any(Date) } }));
  });
});
