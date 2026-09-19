import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  ticket: { findFirst: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

describe("Lab 3 Requester ownership security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.session.findUnique.mockResolvedValue({ userId: 8, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
    prisma.user.findUnique.mockResolvedValue({ id: 8, name: "Ada", email: "ada@example.test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 8 });
    prisma.ticket.findFirst.mockResolvedValue(null);
  });

  it("does not reveal another Requester ticket even when the URL contains a valid ticket id", async () => {
    const response = await request(app)
      .get("/api/tickets/42?requesterId=999")
      .set("Authorization", "Bearer requester-session");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Ticket not found.", code: "NOT_FOUND" });
    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 42, requesterId: 8 }),
    }));
  });

  it("does not expose Internal Notes to a Requester through staff routes", async () => {
    const response = await request(app)
      .get("/api/staff/tickets/42/notes")
      .set("Authorization", "Bearer requester-session");

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });
});
