import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({
  session: { findUnique: vi.fn() },
  user: { findUnique: vi.fn(), findFirst: vi.fn() },
  ticket: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
}));

vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

const staff = { id: 2, name: "Staff", email: "staff@example.test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null };
const summary = { id: 12, ticketNumber: "TKT-2026-000012", summary: "VPN", requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "NEW", owner: null, category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" }, createdAt: new Date(), updatedAt: new Date() };

describe("Lab 3 staff ticket detail API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.session.findUnique.mockResolvedValue({ userId: 2, revokedAt: null, expiresAt: new Date(Date.now() + 3600000) });
    prisma.user.findUnique.mockResolvedValue(staff);
    prisma.ticket.findUnique.mockResolvedValue({ id: 12 });
  });

  it("returns a conflict when two staff users race to claim a ticket", async () => {
    prisma.ticket.updateMany.mockResolvedValue({ count: 0 });
    const response = await request(app).post("/api/staff/tickets/12/claim").set("Authorization", "Bearer staff-session");

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
  });

  it("rejects inactive or non-staff owners", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const response = await request(app).patch("/api/staff/tickets/12/owner").set("Authorization", "Bearer staff-session").send({ ownerUserId: 99 });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("INVALID_REQUEST");
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it("updates IT Priority with the canonical ticket wrapper", async () => {
    prisma.ticket.findUnique.mockImplementation(async (args: any) => args.include ? summary : { id: 12 });
    prisma.ticket.update.mockResolvedValue(summary);
    const response = await request(app).patch("/api/staff/tickets/12/priority").set("Authorization", "Bearer staff-session").send({ itPriority: "HIGH" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ticket: expect.objectContaining({ ticketNumber: "TKT-2026-000012", itPriority: "MEDIUM" }) });
    expect(prisma.ticket.update).toHaveBeenCalledWith({ where: { id: 12 }, data: { itPriority: "HIGH" } });
  });
});
