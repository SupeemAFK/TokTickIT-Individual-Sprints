import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  ticket: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 8 };
const staff = { id: 2, name: "Staff", email: "staff@example.test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null };

describe("Lab 3 server authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.session.findUnique.mockResolvedValue({ userId: requester.id, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
    prisma.user.findUnique.mockResolvedValue(requester);
    prisma.ticket.findMany.mockResolvedValue([]);
    prisma.ticket.count.mockResolvedValue(0);
  });

  it("rejects unauthenticated access with the stable error shape", async () => {
    const response = await request(app).get("/api/staff/tickets");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Authentication is required.", code: "UNAUTHENTICATED" });
  });

  it("rejects expired sessions even when the bearer token is present", async () => {
    prisma.session.findUnique.mockResolvedValue({ userId: requester.id, revokedAt: null, expiresAt: new Date(Date.now() - 1000) });
    const response = await request(app).get("/api/auth/me").set("Authorization", "Bearer expired-session");

    expect(response.status).toBe(401);
    expect(response.body.code).toBe("UNAUTHENTICATED");
  });

  it("rejects Requester access to staff and administrator APIs", async () => {
    const queue = await request(app).get("/api/staff/tickets").set("Authorization", "Bearer requester-session");
    const users = await request(app).get("/api/admin/users").set("Authorization", "Bearer requester-session");

    expect(queue.status).toBe(403);
    expect(queue.body.code).toBe("FORBIDDEN");
    expect(users.status).toBe(403);
    expect(users.body.code).toBe("FORBIDDEN");
  });

  it("uses the authenticated Requester identity even when a forged requesterId is supplied", async () => {
    await request(app).get("/api/tickets?requesterId=999").set("Authorization", "Bearer requester-session");

    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ requesterId: requester.id }),
    }));
  });

  it("allows staff queue access only for a staff principal", async () => {
    prisma.session.findUnique.mockResolvedValue({ userId: staff.id, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
    prisma.user.findUnique.mockResolvedValue(staff);
    prisma.ticket.findMany.mockImplementation(async (args: any) => args.select ? [] : []);
    const response = await request(app).get("/api/staff/tickets").set("Authorization", "Bearer staff-session");

    expect(response.status).toBe(200);
  });
});
