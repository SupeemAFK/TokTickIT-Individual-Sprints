import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { configureRequesterAuth, loginRequester } from "../helpers/auth.js";
const prisma = vi.hoisted(() => ({ user: { findUnique: vi.fn() } }));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";
describe("Lab 3 first-login password gate", () => {
  let authHeader = "";
  beforeEach(async () => { vi.resetAllMocks(); configureRequesterAuth(prisma.user.findUnique); authHeader = "Bearer " + await loginRequester(app); });
  it("allows the gated session to read /me so the UI can render password change", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, name: "Anan Kittisak", email: "requester@test", role: "REQUESTER", isActive: true, mustChangePassword: true, legacyRequesterId: 1 });
    const response = await request(app).get("/api/auth/me").set("Authorization", authHeader);
    expect(response.status).toBe(200); expect(response.body.user.mustChangePassword).toBe(true);
  });
});
