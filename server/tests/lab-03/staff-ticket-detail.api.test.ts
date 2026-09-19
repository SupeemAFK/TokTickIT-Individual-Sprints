import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { join } from "node:path";
import { mkdir, rm, writeFile } from "node:fs/promises";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn(), findFirst: vi.fn() },
  ticket: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  publicComment: { findMany: vi.fn(), create: vi.fn() },
  internalNote: { findMany: vi.fn(), create: vi.fn() },
  attachment: { findUnique: vi.fn() },
}));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const staff = { id: 2, name: "Staff", email: "staff@test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null } as const;
const administrator = { id: 3, name: "Admin", email: "admin@test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, legacyRequesterId: null } as const;
const requester = { id: 8, name: "Ada", email: "ada@test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 8 } as const;
const auth = { Authorization: "Bearer staff-session" };
const adminAuth = { Authorization: "Bearer admin-session" };
const requesterAuth = { Authorization: "Bearer requester-session" };
const category = { id: 1, name: "Network" };
const relatedSystem = { id: 2, name: "VPN" };
const attachment = { id: 4, originalFilename: "screenshot.png", mimeType: "image/png", byteSize: 20, createdAt: new Date("2026-09-19T08:03:00.000Z"), removedAt: null, removalReason: null };
const publicComment = { id: 31, content: "The issue still occurs.", author: { id: staff.id, name: staff.name, role: staff.role }, createdAt: new Date("2026-09-19T08:05:00.000Z") };
const internalNote = { id: 9, content: "Checked the VPN gateway logs.", author: { id: staff.id, name: staff.name, role: staff.role }, createdAt: new Date("2026-09-19T08:06:00.000Z") };
const detail = {
  id: 12,
  ticketNumber: "TKT-2026-000012",
  summary: "VPN cannot connect",
  description: "VPN fails after signing in.",
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  currentStatus: "OPEN",
  owner: null,
  requester: { id: requester.id, name: requester.name, email: requester.email },
  category,
  relatedSystem,
  attachments: [attachment],
  publicComments: [publicComment],
  internalNotes: [internalNote],
  requesterReportedResolvedAt: null,
  createdAt: new Date("2026-09-19T08:00:00.000Z"),
  updatedAt: new Date("2026-09-19T08:07:00.000Z"),
};
const summary = { ...detail, requester: undefined, attachments: undefined, publicComments: undefined, internalNotes: undefined };

function authenticateAs(user: typeof staff | typeof administrator | typeof requester = staff) {
  prisma.session.findUnique.mockResolvedValue({ userId: user.id, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
  prisma.user.findUnique.mockImplementation(async ({ where }: any) => where.id === user.id ? user : null);
}

function mockTicketLookups(ticket = detail) {
  prisma.ticket.findUnique.mockImplementation(async (args: any) => {
    if (args.include) return ticket;
    if (args.select) return { id: ticket.id, ...(args.select.currentStatus ? { currentStatus: ticket.currentStatus } : {}) };
    return null;
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  authenticateAs();
});

afterEach(async () => {
  await rm(join(process.cwd(), "uploads", "lab3-staff-ticket-download-test"), { force: true });
});

describe("Issue #39 IT Staff ticket detail API", () => {
  it.each([
    ["IT Staff", staff, auth],
    ["Administrator", administrator, adminAuth],
  ])("returns the complete staff detail to %s", async (_label, user, headers) => {
    authenticateAs(user);
    mockTicketLookups();

    const response = await request(app).get("/api/staff/tickets/12").set(headers);

    expect(response.status).toBe(200);
    expect(response.body.ticket).toMatchObject({
      ticketNumber: detail.ticketNumber,
      owner: null,
      requester: detail.requester,
      attachments: [{ id: attachment.id, originalFilename: attachment.originalFilename }],
      publicComments: [{ content: publicComment.content, author: publicComment.author }],
      internalNotes: [{ content: internalNote.content, author: internalNote.author }],
    });
  });

  it("returns safe server failure feedback without exposing detail data", async () => {
    prisma.ticket.findUnique.mockRejectedValue(new Error("database unavailable"));

    const response = await request(app).get("/api/staff/tickets/12").set(auth);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Unable to load ticket detail.", code: "SERVER_ERROR" });
  });

  it("allows an IT Staff member to claim an unassigned ticket atomically", async () => {
    mockTicketLookups();
    prisma.ticket.updateMany.mockResolvedValue({ count: 1 });

    const response = await request(app).post("/api/staff/tickets/12/claim").set(auth).send({});

    expect(response.status).toBe(200);
    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({ where: { id: 12, ownerUserId: null }, data: { ownerUserId: staff.id } });
    expect(response.body.ticket).toMatchObject({ ticketNumber: detail.ticketNumber });
  });

  it("returns a conflict when a concurrent claim already owns the ticket", async () => {
    prisma.ticket.findUnique.mockResolvedValue({ id: 12 });
    prisma.ticket.updateMany.mockResolvedValue({ count: 0 });

    const response = await request(app).post("/api/staff/tickets/12/claim").set(auth).send({});

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });

  it.each([
    [{ ownerUserId: administrator.id }, administrator.id],
    [{ ownerUserId: null }, null],
  ])("assigns or explicitly clears ownership with the requested value", async (body, expectedOwner) => {
    mockTicketLookups();
    prisma.user.findFirst.mockResolvedValue({ id: administrator.id });
    prisma.ticket.update.mockResolvedValue(summary);

    const response = await request(app).patch("/api/staff/tickets/12/owner").set(auth).send(body);

    expect(response.status).toBe(200);
    expect(prisma.ticket.update).toHaveBeenCalledWith({ where: { id: 12 }, data: { ownerUserId: expectedOwner } });
  });

  it("rejects missing, inactive, or requester owners before mutation", async () => {
    mockTicketLookups();
    const missing = await request(app).patch("/api/staff/tickets/12/owner").set(auth).send({});
    expect(missing.status).toBe(400);

    prisma.user.findFirst.mockResolvedValue(null);
    const invalid = await request(app).patch("/api/staff/tickets/12/owner").set(auth).send({ ownerUserId: requester.id });
    expect(invalid.status).toBe(400);
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it("updates IT Priority and rejects invalid values", async () => {
    mockTicketLookups();
    prisma.ticket.update.mockResolvedValue(summary);

    const valid = await request(app).patch("/api/staff/tickets/12/priority").set(auth).send({ itPriority: "HIGH" });
    expect(valid.status).toBe(200);
    expect(prisma.ticket.update).toHaveBeenCalledWith({ where: { id: 12 }, data: { itPriority: "HIGH" } });

    const invalid = await request(app).patch("/api/staff/tickets/12/priority").set(auth).send({ itPriority: "URGENT" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe("INVALID_REQUEST");
  });

  it.each([
    ["NEW", "OPEN"], ["NEW", "IN_PROGRESS"], ["NEW", "CANCELLED"],
    ["OPEN", "IN_PROGRESS"], ["OPEN", "WAITING_FOR_REQUESTER"], ["OPEN", "RESOLVED"], ["OPEN", "CANCELLED"],
    ["IN_PROGRESS", "WAITING_FOR_REQUESTER"], ["IN_PROGRESS", "RESOLVED"], ["IN_PROGRESS", "CANCELLED"],
    ["WAITING_FOR_REQUESTER", "IN_PROGRESS"], ["WAITING_FOR_REQUESTER", "RESOLVED"], ["WAITING_FOR_REQUESTER", "CANCELLED"],
    ["RESOLVED", "CLOSED"], ["RESOLVED", "REOPENED"], ["CLOSED", "REOPENED"],
    ["REOPENED", "IN_PROGRESS"], ["REOPENED", "WAITING_FOR_REQUESTER"], ["REOPENED", "RESOLVED"], ["REOPENED", "CANCELLED"],
  ])("allows the documented status transition %s to %s", async (from, to) => {
    mockTicketLookups({ ...detail, currentStatus: from });
    prisma.ticket.updateMany.mockResolvedValue({ count: 1 });

    const response = await request(app).patch("/api/staff/tickets/12/status").set(auth).send({ currentStatus: to });

    expect(response.status).toBe(200);
    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({ where: { id: 12, currentStatus: from }, data: { currentStatus: to } });
  });

  it("distinguishes malformed and disallowed statuses and handles a stale transition", async () => {
    mockTicketLookups({ ...detail, currentStatus: "NEW" });
    const malformed = await request(app).patch("/api/staff/tickets/12/status").set(auth).send({ currentStatus: "NOT_A_STATUS" });
    expect(malformed.status).toBe(400);
    expect(malformed.body.code).toBe("INVALID_REQUEST");

    const disallowed = await request(app).patch("/api/staff/tickets/12/status").set(auth).send({ currentStatus: "CLOSED" });
    expect(disallowed.status).toBe(409);
    expect(disallowed.body.code).toBe("CONFLICT");
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();

    prisma.ticket.updateMany.mockResolvedValue({ count: 0 });
    mockTicketLookups({ ...detail, currentStatus: "OPEN" });
    const stale = await request(app).patch("/api/staff/tickets/12/status").set(auth).send({ currentStatus: "IN_PROGRESS" });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe("CONFLICT");
  });

  it("retrieves and creates Public Comments and Internal Notes with backend authorship", async () => {
    prisma.ticket.findUnique.mockResolvedValue({ id: 12 });
    prisma.publicComment.findMany.mockResolvedValue([publicComment]);
    prisma.internalNote.findMany.mockResolvedValue([internalNote]);
    const comments = await request(app).get("/api/staff/tickets/12/comments").set(auth);
    const notes = await request(app).get("/api/staff/tickets/12/notes").set(adminAuth);
    expect(comments.status).toBe(200);
    expect(comments.body.items[0]).toMatchObject({ content: publicComment.content, author: publicComment.author });
    expect(notes.status).toBe(200);
    expect(notes.body.items[0]).toMatchObject({ content: internalNote.content, author: internalNote.author });

    prisma.publicComment.create.mockResolvedValue({ ...publicComment, content: "  Public update.  " });
    const createdComment = await request(app).post("/api/staff/tickets/12/comments").set(auth).send({ content: "  Public update.  ", authorId: requester.id });
    expect(createdComment.status).toBe(201);
    expect(prisma.publicComment.create).toHaveBeenCalledWith(expect.objectContaining({ data: { ticketId: 12, authorId: staff.id, content: "Public update." } }));

    prisma.internalNote.create.mockResolvedValue({ ...internalNote, content: "  Private update.  " });
    const createdNote = await request(app).post("/api/staff/tickets/12/notes").set(auth).send({ content: "  Private update.  ", authorId: requester.id });
    expect(createdNote.status).toBe(201);
    expect(prisma.internalNote.create).toHaveBeenCalledWith(expect.objectContaining({ data: { ticketId: 12, authorId: staff.id, content: "Private update." } }));
  });

  it.each(["/comments", "/notes"])("rejects blank and over-limit content on %s", async (suffix) => {
    prisma.ticket.findUnique.mockResolvedValue({ id: 12 });
    const blank = await request(app).post(`/api/staff/tickets/12${suffix}`).set(auth).send({ content: "   " });
    const overLimit = await request(app).post(`/api/staff/tickets/12${suffix}`).set(auth).send({ content: "x".repeat(2001) });
    expect(blank.status).toBe(400);
    expect(overLimit.status).toBe(400);
    expect(prisma.publicComment.create).not.toHaveBeenCalled();
    expect(prisma.internalNote.create).not.toHaveBeenCalled();
  });

  it("serves an active attachment to an authorized staff user and rejects removed files", async () => {
    const storageKey = "lab3-staff-ticket-download-test";
    await mkdir(join(process.cwd(), "uploads"), { recursive: true });
    await writeFile(join(process.cwd(), "uploads", storageKey), Buffer.from("attachment-data"));
    prisma.attachment.findUnique.mockResolvedValue({ ...attachment, storageKey });

    const response = await request(app).get("/api/staff/attachments/4/download").set(auth);

    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe("attachment-data");
    expect(response.headers["content-disposition"]).toContain("screenshot.png");

    prisma.attachment.findUnique.mockResolvedValue({ ...attachment, storageKey, removedAt: new Date() });
    const removed = await request(app).get("/api/staff/attachments/4/download").set(adminAuth);
    expect(removed.status).toBe(410);
    expect(removed.body.code).toBe("GONE");
  });

  it("forbids Requesters from every staff detail and operational route", async () => {
    authenticateAs(requester);
    const operations = [
      request(app).get("/api/staff/tickets/12"),
      request(app).post("/api/staff/tickets/12/claim").send({}),
      request(app).patch("/api/staff/tickets/12/owner").send({ ownerUserId: null }),
      request(app).patch("/api/staff/tickets/12/priority").send({ itPriority: "HIGH" }),
      request(app).patch("/api/staff/tickets/12/status").send({ currentStatus: "OPEN" }),
      request(app).get("/api/staff/tickets/12/comments"),
      request(app).post("/api/staff/tickets/12/comments").send({ content: "No" }),
      request(app).get("/api/staff/tickets/12/notes"),
      request(app).post("/api/staff/tickets/12/notes").send({ content: "No" }),
      request(app).get("/api/staff/attachments/4/download"),
    ];
    for (const operation of operations) {
      const response = await operation.set(requesterAuth);
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("FORBIDDEN");
    }
    expect(prisma.ticket.findUnique).not.toHaveBeenCalled();
    expect(prisma.ticket.update).not.toHaveBeenCalled();
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
  });
});
