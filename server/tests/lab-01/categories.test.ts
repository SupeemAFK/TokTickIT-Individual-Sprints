import { beforeEach, describe, it, expect, vi } from "vitest";
import request from "supertest";

const prismaMock = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("../../src/prisma.js", () => ({
  getPrisma: () => ({
    category: {
      findMany: prismaMock.findMany,
    },
  }),
}));

import { app } from "../../src/app.js";

describe("GET /api/categories", () => {
  beforeEach(() => {
    prismaMock.findMany.mockReset();
  });

  it("returns the four seeded categories in id order", async () => {
    prismaMock.findMany.mockResolvedValue([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ]);

    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(prismaMock.findMany).toHaveBeenCalledWith({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    expect(res.body).toEqual([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ]);
  });

  it("returns a safe error when categories cannot be loaded", async () => {
    prismaMock.findMany.mockRejectedValue(new Error("database unavailable"));

    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Unable to load categories." });
  });
});
