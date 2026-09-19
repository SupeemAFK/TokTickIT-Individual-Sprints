import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
  ticket: { count: vi.fn() },
  developmentRequester: { upsert: vi.fn(), update: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const admin = { id: 3, name: "Admin", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const target = { id: 8, name: "Ada", email: "ada@example.test", role: "REQUESTER", isActive: true, mustChangePassword: true, legacyRequesterId: 8, passwordHash: "hash" };

describe("Lab 3 Administrator user API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.session.findUnique.mockResolvedValue({ userId: 3, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
    prisma.user.findUnique.mockResolvedValue(admin);
    prisma.user.findMany.mockResolvedValue([admin, target]);
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.ticket.count.mockResolvedValue(0);
    prisma.user.count.mockResolvedValue(2);
  });

  it("lists users with name/email search and optional role filtering", async () => {
    const response = await request(app).get("/api/admin/users?search=ada&role=REQUESTER").set("Authorization", "Bearer admin-session");

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ role: "REQUESTER", OR: expect.any(Array) }),
    }));
  });

  it("creates a one-role user and forces the first-login password change", async () => {
    prisma.developmentRequester.upsert.mockResolvedValue({ id: 20 });
    prisma.user.create.mockResolvedValue({ ...target, id: 20, role: "REQUESTER", legacyRequesterId: 20 });
    const response = await request(app).post("/api/admin/users").set("Authorization", "Bearer admin-session").send({
      name: "New Requester", email: "new@example.test", role: "REQUESTER", initialPassword: "NewInitial123", isActive: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.mustChangePassword).toBeUndefined();
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: "REQUESTER", legacyRequesterId: 20, mustChangePassword: true }),
    }));
  });

  it("protects the final active Administrator and self-deactivation", async () => {
    const self = await request(app).patch("/api/admin/users/3").set("Authorization", "Bearer admin-session").send({ isActive: false });
    expect(self.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.user.findUnique.mockResolvedValue({ ...admin, id: 4 });
    prisma.user.count.mockResolvedValue(1);
    const last = await request(app).patch("/api/admin/users/4").set("Authorization", "Bearer admin-session").send({ role: "IT_STAFF" });
    expect(last.status).toBe(409);
    expect(last.body.code).toBe("CONFLICT");
  });

  it("maps duplicate emails to a safe conflict response", async () => {
    prisma.developmentRequester.upsert.mockResolvedValue({ id: 20 });
    prisma.user.create.mockRejectedValue({ code: "P2002" });
    const response = await request(app).post("/api/admin/users").set("Authorization", "Bearer admin-session").send({
      name: "Duplicate", email: "ada@example.test", role: "REQUESTER", initialPassword: "NewInitial123", isActive: true,
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });
});
