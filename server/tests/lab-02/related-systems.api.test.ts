import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => ({ relatedSystem: { findMany } }) }));
import { app } from "../../src/app.js";

describe("GET /api/related-systems", () => {
  beforeEach(() => findMany.mockReset());

  it("returns only active systems in name order", async () => {
    findMany.mockResolvedValue([{ id: 3, name: "VPN" }]);
    const response = await request(app).get("/api/related-systems");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 3, name: "VPN" }]);
    expect(findMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  });
});
