import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const findMany = vi.hoisted(() => vi.fn());
vi.mock("../../src/prisma.js", () => ({
  getPrisma: () => ({ developmentRequester: { findMany } }),
}));

import { app } from "../../src/app.js";

describe("GET /api/development-requesters", () => {
  beforeEach(() => findMany.mockReset());

  it("returns only active requesters in name order", async () => {
    findMany.mockResolvedValue([{ id: 1, name: "Anan", email: "anan@test" }]);

    const response = await request(app).get("/api/development-requesters");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
  });

});
