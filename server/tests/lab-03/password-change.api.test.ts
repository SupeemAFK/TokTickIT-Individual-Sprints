import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { hashPassword } from "../../src/lab3.js";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  sessionFindUnique: vi.fn(),
  sessionCreate: vi.fn(),
  sessionUpdateMany: vi.fn(),
}));

vi.mock("../../src/prisma.js", () => ({
  getPrisma: () => ({
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    session: { findUnique: mocks.sessionFindUnique, create: mocks.sessionCreate, updateMany: mocks.sessionUpdateMany },
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

describe("Lab 3 password-change API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.sessionFindUnique.mockResolvedValue({ userId: 8, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
    mocks.userFindUnique.mockResolvedValue(firstLoginUser());
    mocks.sessionCreate.mockResolvedValue({});
  });

  it("allows first-login /me but blocks a weak or mismatched password without mutation", async () => {
    const me = await request(app).get("/api/auth/me").set("Authorization", "Bearer first-login-session");
    expect(me.status).toBe(200);
    expect(me.body.mustChangePassword).toBe(true);

    const change = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", "Bearer first-login-session")
      .send({ newPassword: "short", confirmation: "different" });

    expect(change.status).toBe(400);
    expect(change.body.code).toBe("INVALID_REQUEST");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("requires all password rules before clearing mustChangePassword", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", "Bearer first-login-session")
      .send({ newPassword: "abcdefghijkl", confirmation: "abcdefghijkl" });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/upper-case/i);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("returns the safe user and clears the first-login gate after a valid change", async () => {
    mocks.userUpdate.mockResolvedValue({ ...firstLoginUser(), mustChangePassword: false, passwordHash: hashPassword("NewValidPass123") });

    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", "Bearer first-login-session")
      .send({ newPassword: "NewValidPass123", confirmation: "NewValidPass123" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true },
      mustChangePassword: false,
    });
    expect(mocks.userUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 8 },
      data: expect.objectContaining({ mustChangePassword: false }),
    }));
  });
});
