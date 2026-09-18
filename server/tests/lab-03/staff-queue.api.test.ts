import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { configureUserAuth, loginAs, staffUser } from "../helpers/auth.js";

const prisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findFirst: vi.fn() },
  ticket: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  publicComment: { create: vi.fn() },
  internalNote: { create: vi.fn() },
}));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

describe("Lab 3 staff workflow API", () => {
  let authHeader = "";
  beforeEach(async () => { vi.resetAllMocks(); configureUserAuth(prisma.user.findUnique, staffUser); authHeader = "Bearer " + await loginAs(app, staffUser); });

  it("supports queue filters and exposes staff detail including internal notes", async () => {
    prisma.ticket.findMany.mockResolvedValue([{ id: 42, ticketNumber: "TKT-2026-000042", summary: "VPN issue", currentStatus: "NEW" }]);
    prisma.ticket.count.mockResolvedValue(1);
    const queue = await request(app).get("/api/staff/tickets?search=VPN&status=NEW&page=1&pageSize=20").set("Authorization", authHeader);
    expect(queue.status).toBe(200);
    expect(queue.body.pagination).toEqual({ page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ currentStatus: "NEW" }), take: 20 }));
    prisma.ticket.findUnique.mockResolvedValue({ id: 42, publicComments: [{ content: "Public" }], internalNotes: [{ content: "Internal" }] });
    const detail = await request(app).get("/api/staff/tickets/42").set("Authorization", authHeader);
    expect(detail.status).toBe(200);
    expect(detail.body.internalNotes[0].content).toBe("Internal");
    prisma.ticket.findMany.mockResolvedValue([]); prisma.ticket.count.mockResolvedValue(0);
    await request(app).get("/api/staff/tickets?assigned=2").set("Authorization", authHeader);
    expect(prisma.ticket.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { ownerUserId: 2 } }));
  });

  it("claims atomically, enforces transitions, and appends comments/notes", async () => {
    prisma.ticket.findUnique.mockResolvedValue({ id: 42, currentStatus: "NEW" });
    prisma.ticket.updateMany.mockResolvedValue({ count: 0 });
    const conflict = await request(app).patch("/api/staff/tickets/42").set("Authorization", authHeader).send({ claim: true });
    expect(conflict.status).toBe(409);
    prisma.ticket.updateMany.mockResolvedValue({ count: 1 });
    prisma.ticket.update.mockResolvedValue({ id: 42, currentStatus: "IN_PROGRESS", ownerUserId: 2 });
    const transitioned = await request(app).patch("/api/staff/tickets/42").set("Authorization", authHeader).send({ claim: true, currentStatus: "IN_PROGRESS" });
    expect(transitioned.status).toBe(200);
    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({ where: { id: 42, ownerUserId: null }, data: { ownerUserId: 2 } });
    prisma.publicComment.create.mockResolvedValue({ id: 1, content: "Public" });
    prisma.internalNote.create.mockResolvedValue({ id: 2, content: "Internal" });
    expect((await request(app).post("/api/staff/tickets/42/comments").set("Authorization", authHeader).send({ content: "Public" })).status).toBe(201);
    expect((await request(app).post("/api/staff/tickets/42/notes").set("Authorization", authHeader).send({ content: "Internal" })).status).toBe(201);
  });
  it("rejects malformed queue parameters and IDs", async () => {
    expect((await request(app).get("/api/staff/tickets?page=zero").set("Authorization", authHeader)).status).toBe(400);
    expect((await request(app).get("/api/staff/tickets?sort=unknown").set("Authorization", authHeader)).status).toBe(400);
    expect((await request(app).get("/api/staff/tickets?direction=sideways").set("Authorization", authHeader)).status).toBe(400);
    expect((await request(app).get("/api/staff/tickets?assigned=abc").set("Authorization", authHeader)).status).toBe(400);
    expect((await request(app).get("/api/staff/tickets/not-an-id").set("Authorization", authHeader)).status).toBe(400);
  });

});
