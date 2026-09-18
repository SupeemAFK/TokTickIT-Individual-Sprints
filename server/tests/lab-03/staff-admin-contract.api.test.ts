import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(), session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), create: vi.fn() },
  ticket: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  publicComment: { findMany: vi.fn(), create: vi.fn() }, internalNote: { findMany: vi.fn(), create: vi.fn() },
  developmentRequester: { upsert: vi.fn(), update: vi.fn() }, attachment: { findUnique: vi.fn() },
}));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const auth = { Authorization: "Bearer staff-session" };
const staff = { id: 2, name: "Staff", email: "staff@test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const admin = { id: 3, name: "Admin", email: "admin@test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const row = { id: 12, ticketNumber: "TKT-2026-000012", summary: "VPN", requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "NEW", owner: null, requester: { id: 8, name: "Ada", email: "ada@test" }, category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" }, attachments: [], publicComments: [], internalNotes: [], createdAt: new Date(), updatedAt: new Date() };

function authAs(user = staff) { prisma.session.findUnique.mockResolvedValue({ userId: user.id, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) }); prisma.user.findUnique.mockImplementation(async ({ where }: any) => where.id === user.id ? user : null); }

describe("Lab 3 staff and administrator contract", () => {
  beforeEach(() => { vi.resetAllMocks(); prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma)); authAs(); });

  it("returns queue counts and the canonical QueueItem shape", async () => {
    prisma.ticket.findMany.mockImplementation(async (args: any) => args.select ? [{ currentStatus: "NEW", itPriority: "HIGH", ownerUserId: null }] : [row]); prisma.ticket.count.mockResolvedValue(1);
    const response = await request(app).get("/api/staff/tickets?requestedPriority=MEDIUM&itPriority=HIGH&ownerUserId=null").set(auth);
    expect(response.status).toBe(200); expect(response.body.counts).toEqual({ totalItems: 1, unassigned: 1, byStatus: { NEW: 1, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, RESOLVED: 0, CLOSED: 0, REOPENED: 0, CANCELLED: 0 }, byItPriority: { LOW: 0, MEDIUM: 0, HIGH: 1 } }); expect(response.body.items[0]).toMatchObject({ ticketNumber: "TKT-2026-000012", requester: { id: 8, name: "Ada" }, owner: null });
  });

  it("rejects unknown status values as 400 and disallowed values as 409 before mutation", async () => {
    prisma.ticket.findUnique.mockResolvedValue({ id: 12, currentStatus: "NEW" });
    const unknown = await request(app).patch("/api/staff/tickets/12/status").set(auth).send({ currentStatus: "NOT_A_STATUS" });
    expect(unknown.status).toBe(400); expect(unknown.body.code).toBe("INVALID_REQUEST"); expect(prisma.ticket.update).not.toHaveBeenCalled();
    const disallowed = await request(app).patch("/api/staff/tickets/12/status").set(auth).send({ currentStatus: "CLOSED" });
    expect(disallowed.status).toBe(409); expect(disallowed.body.code).toBe("CONFLICT"); expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it("allows explicit unassignment and keeps separate staff operations", async () => {
    prisma.ticket.findUnique.mockImplementation(async (args: any) => args.include ? row : { id: 12 }); prisma.ticket.update.mockResolvedValue(row);
    const response = await request(app).patch("/api/staff/tickets/12/owner").set(auth).send({ ownerUserId: null });
    expect(response.status).toBe(200); expect(response.body.ticket).toHaveProperty("ticketNumber", "TKT-2026-000012"); expect(prisma.ticket.update).toHaveBeenCalledWith({ where: { id: 12 }, data: { ownerUserId: null } });
  });

  it("returns comments and notes through separate protected collections", async () => {
    prisma.ticket.findUnique.mockResolvedValue({ id: 12 }); prisma.publicComment.findMany.mockResolvedValue([{ id: 1, content: "Public", author: { id: 2, name: "Staff", role: "IT_STAFF" }, createdAt: new Date() }]); prisma.internalNote.findMany.mockResolvedValue([{ id: 2, content: "Private", author: { id: 2, name: "Staff", role: "IT_STAFF" }, createdAt: new Date() }]);
    const comments = await request(app).get("/api/staff/tickets/12/comments").set(auth); const notes = await request(app).get("/api/staff/tickets/12/notes").set(auth);
    expect(comments.body.items[0].content).toBe("Public"); expect(notes.body.items[0].content).toBe("Private");
  });

  it("blocks deactivation or demotion of any ticket owner atomically", async () => {
    authAs(admin); prisma.user.findUnique.mockImplementation(async ({ where }: any) => where.id === 3 ? admin : { id: 2, name: "Staff", email: "staff@test", role: "IT_STAFF", isActive: true, legacyRequesterId: null }); prisma.user.count.mockResolvedValue(2); prisma.ticket.count.mockResolvedValue(1);
    const response = await request(app).patch("/api/admin/users/2").set({ Authorization: "Bearer admin-session" }).send({ isActive: false });
    expect(response.status).toBe(409); expect(response.body.code).toBe("OWNER_INTEGRITY_CONFLICT"); expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("synchronizes the legacy requester link transactionally on role change", async () => {
    authAs(admin); prisma.user.findUnique.mockImplementation(async ({ where }: any) => where.id === 3 ? admin : { id: 2, name: "Staff", email: "staff@test", role: "IT_STAFF", isActive: true, legacyRequesterId: null }); prisma.user.count.mockResolvedValue(2); prisma.ticket.count.mockResolvedValue(0); prisma.developmentRequester.upsert.mockResolvedValue({ id: 77 }); prisma.developmentRequester.update.mockResolvedValue({}); prisma.user.update.mockResolvedValue({ id: 2, name: "Staff", email: "staff@test", role: "REQUESTER", isActive: true });
    const response = await request(app).patch("/api/admin/users/2").set({ Authorization: "Bearer admin-session" }).send({ role: "REQUESTER" });
    expect(response.status).toBe(200); expect(prisma.developmentRequester.upsert).toHaveBeenCalled(); expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: "REQUESTER", legacyRequesterId: 77 }) }));
  });

  it("sets an initial password through a protected 204 endpoint", async () => {
    authAs(admin); prisma.user.findUnique.mockImplementation(async ({ where }: any) => where.id === 3 ? admin : { id: 2 }); prisma.user.update.mockResolvedValue({});
    const response = await request(app).post("/api/admin/users/2/initial-password").set({ Authorization: "Bearer admin-session" }).send({ initialPassword: "NewInitial123" });
    expect(response.status).toBe(204); expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2 }, data: expect.objectContaining({ mustChangePassword: true }) }));
  });
});
