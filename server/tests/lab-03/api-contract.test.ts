import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn(), create: vi.fn() },
  user: { findUnique: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

describe("Lab 3 API contract errors", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.session.findUnique.mockResolvedValue(null);
  });

  it("uses {error, code} for unauthenticated protected requests", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: expect.any(String), code: "UNAUTHENTICATED" });
  });

  it("does not reveal whether invalid credentials belong to an inactive account", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 8, email: "inactive@example.test", isActive: false, passwordHash: "not-used" });

    const response = await request(app).post("/api/auth/login").send({ email: "inactive@example.test", password: "Lab3Pass123" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid email or password.", code: "LOGIN_FAILED" });
  });
});
