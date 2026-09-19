import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), create: vi.fn() },
  ticket: { count: vi.fn() },
  developmentRequester: { upsert: vi.fn(), update: vi.fn() },
}));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const admin = { id: 3, name: "Admin", email: "admin@test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const staff = { id: 2, name: "Staff", email: "staff@test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const requester = { id: 8, name: "Requester", email: "requester@test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 18 };
const adminAuth = { Authorization: "Bearer admin-session" };
const requesterAuth = { Authorization: "Bearer requester-session" };
const strongPassword = "InitialAdmin123";

function actor(user: any = admin, extraUsers: any[] = []) {
  const users = new Map([[admin.id, admin], [staff.id, staff], [requester.id, requester], ...extraUsers.map((item) => [item.id, item] as const)]);
  prisma.session.findUnique.mockResolvedValue({ userId: user.id, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
  prisma.user.findUnique.mockImplementation(async ({ where }: any) => users.get(where.id) ?? null);
}

function createdUser(overrides: Record<string, unknown> = {}) {
  return { id: 20, name: "New User", email: "new.user@test", role: "REQUESTER", isActive: true, ...overrides };
}

describe("Issue #40 Administrator User Management API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback: any) => callback(prisma));
    prisma.ticket.count.mockResolvedValue(0);
    actor();
  });

  it("lists safe users with case-insensitive name/email search and an optional role filter", async () => {
    prisma.user.findMany.mockResolvedValue([admin, staff]);

    const response = await request(app).get("/api/admin/users?search=Admin&role=ADMINISTRATOR").set(adminAuth);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      { id: admin.id, name: admin.name, email: admin.email, role: admin.role, isActive: admin.isActive },
      { id: staff.id, name: staff.name, email: staff.email, role: staff.role, isActive: staff.isActive },
    ]);
    expect(response.body.items[0]).not.toHaveProperty("passwordHash");
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: "ADMINISTRATOR", OR: [{ name: { contains: "Admin", mode: "insensitive" } }, { email: { contains: "Admin", mode: "insensitive" } }] },
      orderBy: { name: "asc" },
    });
  });

  it("rejects an invalid role filter before querying", async () => {
    const response = await request(app).get("/api/admin/users?role=SUPERUSER").set(adminAuth);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_REQUEST");
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("creates one-role users with safe output, a forced password change, and legacy requester linkage", async () => {
    prisma.developmentRequester.upsert.mockResolvedValue({ id: 77 });
    prisma.user.create.mockResolvedValue(createdUser({ email: "new.requester@test", isActive: false, legacyRequesterId: 77 }));

    const response = await request(app).post("/api/admin/users").set(adminAuth).send({
      name: "New User", email: "New.Requester@test", role: "REQUESTER", isActive: false, initialPassword: strongPassword,
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 20, name: "New User", email: "new.requester@test", role: "REQUESTER", isActive: false });
    expect(response.body).not.toHaveProperty("passwordHash");
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      name: "New User", email: "new.requester@test", role: "REQUESTER", isActive: false,
      mustChangePassword: true, legacyRequesterId: 77, passwordHash: expect.stringContaining(":"),
    }) });
  });

  it("rejects invalid roles, activation values, and weak initial passwords", async () => {
    const invalidRole = await request(app).post("/api/admin/users").set(adminAuth).send({ name: "New User", email: "new@test", role: "SUPERUSER", isActive: true, initialPassword: strongPassword });
    const invalidActive = await request(app).post("/api/admin/users").set(adminAuth).send({ name: "New User", email: "new@test", role: "REQUESTER", isActive: "false", initialPassword: strongPassword });
    const weakPassword = await request(app).post("/api/admin/users").set(adminAuth).send({ name: "New User", email: "new@test", role: "REQUESTER", isActive: true, initialPassword: "alllowercase123" });

    expect(invalidRole.status).toBe(400);
    expect(invalidActive.status).toBe(400);
    expect(weakPassword.status).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("maps duplicate email creation to a safe conflict", async () => {
    prisma.user.create.mockRejectedValue({ code: "P2002" });

    const response = await request(app).post("/api/admin/users").set(adminAuth).send({ name: "Duplicate", email: "admin@test", role: "IT_STAFF", isActive: true, initialPassword: strongPassword });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
    expect(response.body).not.toHaveProperty("passwordHash");
  });

  it("edits account fields while preserving a single permitted role", async () => {
    const target = { ...staff };
    actor(admin, [target]);
    prisma.user.update.mockResolvedValue({ ...target, name: "Updated Staff", email: "updated.staff@test", role: "ADMINISTRATOR", isActive: false });

    const response = await request(app).patch("/api/admin/users/2").set(adminAuth).send({ name: "Updated Staff", email: "Updated.Staff@test", role: "ADMINISTRATOR", isActive: false });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 2, name: "Updated Staff", email: "updated.staff@test", role: "ADMINISTRATOR", isActive: false });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { name: "Updated Staff", email: "updated.staff@test", role: "ADMINISTRATOR", isActive: false, legacyRequesterId: null } });
  });

  it("blocks self-deactivation and removal of the final active Administrator", async () => {
    const self = await request(app).patch("/api/admin/users/3").set(adminAuth).send({ isActive: false });
    expect(self.status).toBe(409);
    expect(self.body.code).toBe("CONFLICT");

    const onlyAdmin = { id: 5, name: "Only Admin", email: "only.admin@test", role: "ADMINISTRATOR", isActive: true, legacyRequesterId: null };
    actor(admin, [onlyAdmin]);
    prisma.user.count.mockResolvedValue(1);
    const demotion = await request(app).patch("/api/admin/users/5").set(adminAuth).send({ role: "REQUESTER" });

    expect(demotion.status).toBe(409);
    expect(demotion.body.code).toBe("CONFLICT");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("protects ticket owner integrity including owners of CLOSED tickets", async () => {
    actor(admin, [staff]);
    prisma.ticket.count.mockImplementation(async ({ where }: any) => {
      expect(where).toEqual({ ownerUserId: 2 });
      return 1;
    });

    const response = await request(app).patch("/api/admin/users/2").set(adminAuth).send({ isActive: false });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("OWNER_INTEGRITY_CONFLICT");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("resets an initial password with the required strength and never returns it", async () => {
    const response = await request(app).post("/api/admin/users/2/initial-password").set(adminAuth).send({ initialPassword: strongPassword });

    expect(response.status).toBe(204);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 2 }, data: { passwordHash: expect.stringContaining(":"), mustChangePassword: true } });

    const weak = await request(app).post("/api/admin/users/2/initial-password").set(adminAuth).send({ initialPassword: "alllowercase123" });
    expect(weak.status).toBe(400);
    expect(weak.body).not.toHaveProperty("passwordHash");
  });

  it("allows only Administrators to use every User Management endpoint", async () => {
    actor(requester);
    const operations = [
      request(app).get("/api/admin/users"),
      request(app).post("/api/admin/users").send({ name: "No", email: "no@test", role: "REQUESTER", isActive: true, initialPassword: strongPassword }),
      request(app).patch("/api/admin/users/2").send({ name: "No" }),
      request(app).post("/api/admin/users/2/initial-password").send({ initialPassword: strongPassword }),
    ];

    for (const operation of operations) {
      const response = await operation.set(requesterAuth);
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("FORBIDDEN");
    }
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
