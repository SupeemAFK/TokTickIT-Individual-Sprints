import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  ticket: { findUnique: vi.fn() },
  publicComment: { findMany: vi.fn(), create: vi.fn() },
  internalNote: { findMany: vi.fn(), create: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const staff = { id: 2, name: "Staff", email: "staff@example.test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const author = { id: 2, name: "Staff", role: "IT_STAFF" };

describe("Lab 3 comments and notes API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.session.findUnique.mockResolvedValue({ userId: 2, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
    prisma.user.findUnique.mockResolvedValue(staff);
    prisma.ticket.findUnique.mockResolvedValue({ id: 12 });
    prisma.publicComment.create.mockResolvedValue({ id: 1, content: "Visible update", author, createdAt: new Date() });
    prisma.internalNote.create.mockResolvedValue({ id: 2, content: "Private note", author, createdAt: new Date() });
    prisma.publicComment.findMany.mockResolvedValue([{ id: 1, content: "Visible update", author, createdAt: new Date() }]);
    prisma.internalNote.findMany.mockResolvedValue([{ id: 2, content: "Private note", author, createdAt: new Date() }]);
  });

  it("creates and retrieves Public Comments and Internal Notes separately", async () => {
    const comment = await request(app).post("/api/staff/tickets/12/comments").set("Authorization", "Bearer staff-session").send({ content: "Visible update" });
    const note = await request(app).post("/api/staff/tickets/12/notes").set("Authorization", "Bearer staff-session").send({ content: "Private note" });
    const comments = await request(app).get("/api/staff/tickets/12/comments").set("Authorization", "Bearer staff-session");
    const notes = await request(app).get("/api/staff/tickets/12/notes").set("Authorization", "Bearer staff-session");

    expect(comment.status).toBe(201);
    expect(comment.body).toEqual(expect.objectContaining({ id: 1, content: "Visible update", author }));
    expect(note.status).toBe(201);
    expect(notes.body.items[0].content).toBe("Private note");
    expect(comments.body.items[0].content).toBe("Visible update");
  });

  it("rejects blank note content before persistence", async () => {
    const response = await request(app).post("/api/staff/tickets/12/notes").set("Authorization", "Bearer staff-session").send({ content: "   " });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_REQUEST");
    expect(prisma.internalNote.create).not.toHaveBeenCalled();
  });
});
