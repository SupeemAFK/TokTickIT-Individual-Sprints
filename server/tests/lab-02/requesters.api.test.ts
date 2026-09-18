import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
describe("GET /api/development-requesters", () => { it("is removed from the user-facing Lab 3 flow", async () => { const response = await request(app).get("/api/development-requesters"); expect(response.status).toBe(404); }); });
