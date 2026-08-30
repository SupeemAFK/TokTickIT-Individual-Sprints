import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

const prisma = vi.hoisted(() => ({ ticket: { findFirst: vi.fn() }, attachment: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() } }));
vi.mock("../../src/prisma.js", () => ({ getPrisma: () => prisma }));
import { app } from "../../src/app.js";

describe("attachment API", () => {
  beforeEach(() => { vi.resetAllMocks(); prisma.ticket.findFirst.mockResolvedValue({ id: 8 }); });
  it("lists attachment metadata only for an owned active ticket", async () => {
    prisma.attachment.findMany.mockResolvedValue([{ id: 1, originalFilename: "guide.pdf", mimeType: "application/pdf", byteSize: 10, createdAt: new Date(), removedAt: null, removalReason: null }]);
    const response = await request(app).get("/api/tickets/8/attachments?requesterId=1");
    expect(response.status).toBe(200); expect(response.body[0].originalFilename).toBe("guide.pdf");
  });
  it("rejects an unsupported upload before storing it", async () => {
    const response = await request(app).post("/api/tickets/8/attachments").field("requesterId", "1").attach("file", Buffer.from("x"), { filename: "script.exe", contentType: "application/octet-stream" });
    expect(response.status).toBe(415); expect(response.body).toEqual({ error: "Only JPG, PNG, WEBP, and PDF files are allowed." }); expect(prisma.attachment.create).not.toHaveBeenCalled();
  });
  it("returns a safe error for oversized uploads", async () => {
    const response = await request(app).post("/api/tickets/8/attachments").field("requesterId", "1").attach("file", Buffer.alloc(5 * 1024 * 1024 + 1), { filename: "large.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(413); expect(response.body).toEqual({ error: "Attachment must be 5 MB or smaller." });
  });
  it("enforces the five active attachment limit", async () => {
    prisma.attachment.count.mockResolvedValue(5);
    const response = await request(app).post("/api/tickets/8/attachments").field("requesterId", "1").attach("file", Buffer.from("x"), { filename: "guide.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(409); expect(response.body).toEqual({ error: "A ticket can have at most five active attachments." });
  });
  it("blocks download of a removed attachment", async () => {
    prisma.attachment.findFirst.mockResolvedValue({ storageKey: "x", originalFilename: "guide.pdf", mimeType: "application/pdf", removedAt: new Date() });
    const response = await request(app).get("/api/attachments/1/download?requesterId=1");
    expect(response.status).toBe(410); expect(response.body).toEqual({ error: "Attachment is no longer available." });
  });
})
