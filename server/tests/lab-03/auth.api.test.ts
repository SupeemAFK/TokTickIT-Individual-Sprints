import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { hashPassword } from "../../src/lab3.js";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  ticketFindMany: vi.fn(),
  ticketCount: vi.fn(),
}));

vi.mock("../../src/prisma.js", () => ({
  getPrisma: () => ({
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    ticket: { findMany: mocks.ticketFindMany, count: mocks.ticketCount },
  }),
}));

import { app } from "../../src/app.js";

const firstLoginUser = () => ({
  id: 8,
  name: "Ada Requester",
  email: "ada@example.test",
  role: "REQUESTER",
  isActive: true,
  mustChangePassword: true,
  legacyRequesterId: 8,
  passwordHash: hashPassword("Lab3Pass123"),
});

describe("Lab 3 authentication API", () => {
  beforeEach(() => {
    mocks.userFindUnique.mockReset();
    mocks.userUpdate.mockReset();
    mocks.ticketFindMany.mockReset();
    mocks.ticketCount.mockReset();
  });

  it("returns a safe user and top-level password-change/session fields", async () => {
    mocks.userFindUnique.mockResolvedValue(firstLoginUser());

    const response = await request(app).post("/api/auth/login").send({ email: "ADA@EXAMPLE.TEST", password: "Lab3Pass123" });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true });
    expect(response.body.mustChangePassword).toBe(true);
    expect(response.body.session.token).toEqual(expect.any(String));
    expect(response.body.session.expiresAt).toEqual(expect.any(String));
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(response.body.user.legacyRequesterId).toBeUndefined();
  });

  it("blocks normal protected routes while allowing the first-login gate", async () => {
    mocks.userFindUnique.mockResolvedValue(firstLoginUser());
    const login = await request(app).post("/api/auth/login").send({ email: "ada@example.test", password: "Lab3Pass123" });

    const response = await request(app).get("/api/staff/tickets").set("Authorization", `Bearer ${login.body.session.token}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: "Password change is required.", code: "PASSWORD_CHANGE_REQUIRED" });
  });

  it("changes the initial password with matching confirmation", async () => {
    mocks.userFindUnique.mockResolvedValue(firstLoginUser());
    mocks.userUpdate.mockResolvedValue({ ...firstLoginUser(), mustChangePassword: false, passwordHash: hashPassword("NewValidPass123") });
    const login = await request(app).post("/api/auth/login").send({ email: "ada@example.test", password: "Lab3Pass123" });

    const response = await request(app).post("/api/auth/change-password").set("Authorization", `Bearer ${login.body.session.token}`).send({ newPassword: "NewValidPass123", confirmation: "NewValidPass123" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true }, mustChangePassword: false });
    expect(mocks.userUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 8 }, data: expect.objectContaining({ mustChangePassword: false }) }));
  });

  it("invalidates the session on logout", async () => {
    const user = { ...firstLoginUser(), mustChangePassword: false };
    mocks.userFindUnique.mockResolvedValue(user);
    const login = await request(app).post("/api/auth/login").send({ email: "ada@example.test", password: "Lab3Pass123" });
    const token = login.body.session.token;

    const logout = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);
    const afterLogout = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(logout.status).toBe(204);
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.code).toBe("UNAUTHENTICATED");
  });
});
