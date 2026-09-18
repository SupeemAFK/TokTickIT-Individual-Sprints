import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { adminUser, configureUserAuth, loginAs } from "../helpers/auth.js";

const prisma = vi.hoisted(() => ({ user: { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }, developmentRequester: { upsert: vi.fn() } }));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

describe("Lab 3 administrator user-management API", () => {
  let authHeader = "";
  beforeEach(async () => { vi.resetAllMocks(); configureUserAuth(prisma.user.findUnique, adminUser); authHeader = "Bearer " + await loginAs(app, adminUser); });

  it("lists and creates users with a forced initial password change", async () => {
    prisma.user.findMany.mockResolvedValue([adminUser]);
    const listed = await request(app).get("/api/admin/users?role=ADMINISTRATOR").set("Authorization", authHeader);
    expect(listed.status).toBe(200);
    expect(listed.body[0]).toMatchObject({ role: "ADMINISTRATOR", isActive: true });
    prisma.user.create.mockResolvedValue({ id: 4, name: "New Staff", email: "new@test", role: "IT_STAFF", isActive: true, mustChangePassword: true, legacyRequesterId: null });
    const created = await request(app).post("/api/admin/users").set("Authorization", authHeader).send({ name: "New Staff", email: "new@test", role: "IT_STAFF", initialPassword: "InitialPassword123" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ id: 4, role: "IT_STAFF", mustChangePassword: true });
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: "new@test", mustChangePassword: true, passwordHash: expect.stringContaining(":") }) }));
  });

  it("prevents self-deactivation and removal of the last active Administrator", async () => {
    prisma.user.findUnique.mockResolvedValue(adminUser);
    prisma.user.count.mockResolvedValue(1);
    const response = await request(app).patch("/api/admin/users/3").set("Authorization", authHeader).send({ isActive: false });
    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "You cannot deactivate your own account." });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("links an existing user when an administrator changes its role to REQUESTER", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(adminUser).mockResolvedValueOnce({ id: 4, name: "New User", email: "new@test", role: "IT_STAFF", isActive: true, legacyRequesterId: null });
    prisma.developmentRequester.upsert.mockResolvedValue({ id: 9 }); prisma.user.update.mockResolvedValue({ id: 4, name: "New User", email: "new@test", role: "REQUESTER", isActive: true, mustChangePassword: true, legacyRequesterId: 9 });
    const response = await request(app).patch("/api/admin/users/4").set("Authorization", authHeader).send({ role: "REQUESTER" });
    expect(response.status).toBe(200); expect(prisma.developmentRequester.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "new@test" } })); expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: "REQUESTER", legacyRequesterId: 9 }) }));
  });

  it("returns a conflict for duplicate administrator user email", async () => {
    prisma.user.create.mockRejectedValue({ code: "P2002" });
    const response = await request(app).post("/api/admin/users").set("Authorization", authHeader).send({ name: "Duplicate", email: "new@test", role: "IT_STAFF", initialPassword: "InitialPassword123" });
    expect(response.status).toBe(409); expect(response.body).toEqual({ error: "Email is already in use." });
  });

});
