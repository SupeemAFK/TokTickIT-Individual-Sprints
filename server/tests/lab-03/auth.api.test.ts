import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { configureRequesterAuth, loginRequester } from "../helpers/auth.js";

const prisma = vi.hoisted(() => ({ user: { findUnique: vi.fn(), update: vi.fn() } }));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

describe("Lab 3 authentication API", () => {
  let authHeader = "";
  beforeEach(async () => { vi.resetAllMocks(); configureRequesterAuth(prisma.user.findUnique); authHeader = "Bearer " + await loginRequester(app); });

  it("rejects inactive users and invalid passwords without creating a session", async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 20, email: "inactive@test", isActive: false });
    const inactive = await request(app).post("/api/auth/login").send({ email: "inactive@test", password: "Lab3Pass123" });
    expect(inactive.status).toBe(401);
    const invalid = await request(app).post("/api/auth/login").send({ email: "requester@test", password: "wrong-password" });
    expect(invalid.status).toBe(401);
  });

  it("supports the authenticated password-change and session-me flow", async () => {
    prisma.user.update.mockResolvedValue({});
    const me = await request(app).get("/api/auth/me").set("Authorization", authHeader);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ id: 1, role: "REQUESTER", legacyRequesterId: 1 });
    const invalid = await request(app).post("/api/auth/change-password").set("Authorization", authHeader).send({ password: "weak" });
    expect(invalid.status).toBe(400);
    const changed = await request(app).post("/api/auth/change-password").set("Authorization", authHeader).send({ password: "NewSecure123" });
    expect(changed.status).toBe(204);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ mustChangePassword: false, passwordHash: expect.stringContaining(":") }) }));
  });
});
