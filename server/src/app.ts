import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { RequestedPriority, UserRole } from "@prisma/client";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { getPrisma } from "./prisma.js";
import { formatTicketNumber } from "./ticket-number.js";
import { getPrincipal, registerLab3, ticketDetail, ticketSummary } from "./lab3.js";

const SUMMARY_MIN_LENGTH = 5;
const SUMMARY_MAX_LENGTH = 160;
const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 4_000;
const REQUESTED_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);
const STATUSES = new Set(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"]);
const SORT_FIELDS = new Set(["createdAt", "updatedAt", "ticketNumber", "summary", "requestedPriority"]);
const SORT_DIRECTIONS = new Set(["asc", "desc"]);
const PAGE_SIZES = new Set([10, 20, 50]);
const ATTACHMENT_DIRECTORY = join(process.cwd(), "uploads");
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_ATTACHMENT_BYTES } });

class TicketRequestError extends Error {
  constructor(readonly status: 400 | 401 | 403 | 404 | 409 | 410 | 413 | 415, message: string, readonly code = status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : status === 410 ? "GONE" : status === 413 ? "PAYLOAD_TOO_LARGE" : status === 415 ? "UNSUPPORTED_MEDIA_TYPE" : "INVALID_REQUEST") { super(message); }
}

function fail(res: Response, status: number, error: string, code = status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : "INVALID_REQUEST") { return res.status(status).json({ error, code }); }
function handle(res: Response, error: unknown, fallback: string) { if (error instanceof TicketRequestError) return fail(res, error.status, error.message, error.code); return fail(res, 500, fallback, "SERVER_ERROR"); }
function positive(value: unknown, field: string) { if (typeof value !== "string" || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new TicketRequestError(400, `${field} must be a positive integer.`); return Number(value); }
function queryInteger(value: unknown, field: string, fallback?: number) { if (value === undefined) return fallback; return positive(value, field); }
function text(value: unknown, field: string, min: number, max: number) { if (typeof value !== "string") throw new TicketRequestError(400, `${field} is required.`); const trimmed = value.trim(); if (trimmed.length < min || trimmed.length > max) throw new TicketRequestError(400, `${field} must be between ${min} and ${max} characters.`); return trimmed; }
function enumValue(value: unknown, field: string, allowed: Set<string>) { if (value === undefined) return undefined; if (typeof value !== "string" || !allowed.has(value)) throw new TicketRequestError(400, `${field} is invalid.`); return value; }

const detailInclude = { owner: { select: { id: true, name: true, role: true } }, requester: { select: { id: true, name: true, email: true } }, category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } }, attachments: true, publicComments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } }, internalNotes: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } } };
const summaryInclude = { owner: { select: { id: true, name: true, role: true } }, category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } } };

export const app = express();
app.use(cors());
app.use(express.json());
app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => { if (error instanceof SyntaxError && (error as { status?: number }).status === 400) return void fail(res, 400, "Request body must be valid JSON."); next(error); });
registerLab3(app);

const authenticatedLegacyRequester = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getPrincipal(req);
    if (!user) return fail(res, 401, "Authentication is required.", "UNAUTHENTICATED");
    if (user.mustChangePassword) return fail(res, 403, "Password change is required.", "PASSWORD_CHANGE_REQUIRED");
    if (user.role !== UserRole.REQUESTER || !user.legacyRequesterId) return fail(res, 403, "You are not permitted to perform this action.", "FORBIDDEN");
    (req as any).user = user;
    (req as any).authenticatedRequesterId = user.legacyRequesterId;
    next();
  } catch { fail(res, 500, "Unable to validate the session.", "SERVER_ERROR"); }
};
app.use("/api/tickets", authenticatedLegacyRequester);
app.use("/api/attachments", authenticatedLegacyRequester);

app.get("/api/health", (_req, res) => res.status(200).json({ status: "ok", service: "TokTickIT API" }));
app.get("/api/categories", async (_req, res) => { try { res.json(await getPrisma().category.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, select: { id: true, name: true } })); } catch { fail(res, 500, "Unable to load categories.", "SERVER_ERROR"); } });
app.get("/api/related-systems", async (_req, res) => { try { res.json(await getPrisma().relatedSystem.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })); } catch { fail(res, 500, "Unable to load related systems.", "SERVER_ERROR"); } });

function requesterId(req: Request) { const id = (req as any).authenticatedRequesterId; if (!Number.isInteger(id) || id < 1) throw new TicketRequestError(403, "Requester account is not linked to a requester record.", "FORBIDDEN"); return id as number; }
function ticketId(req: Request) { return positive(req.params.ticketId, "ticketId"); }
async function ownedTicket(id: number, req: Request, include: any = detailInclude) { return (getPrisma() as any).ticket.findFirst({ where: { id, requesterId: requesterId(req) }, include }); }

app.get("/api/tickets", async (req, res) => {
  try {
    const owner = requesterId(req); const search = req.query.search === undefined ? "" : text(req.query.search, "search", 0, 160); const categoryId = queryInteger(req.query.categoryId, "categoryId"); const relatedSystemId = queryInteger(req.query.relatedSystemId, "relatedSystemId"); const requestedPriority = enumValue(req.query.requestedPriority, "requestedPriority", REQUESTED_PRIORITIES) as RequestedPriority | undefined; const status = enumValue(req.query.status, "status", STATUSES) as string | undefined; const sort = enumValue(req.query.sort, "sort", SORT_FIELDS) ?? "createdAt"; const direction = enumValue(req.query.direction, "direction", SORT_DIRECTIONS) ?? "desc"; const page = queryInteger(req.query.page, "page", 1) as number; const pageSize = queryInteger(req.query.pageSize, "pageSize", 10) as number; if (!PAGE_SIZES.has(pageSize)) throw new TicketRequestError(400, "pageSize must be 10, 20, or 50.");
    const where: any = { requesterId: owner, ...(categoryId ? { categoryId } : {}), ...(relatedSystemId ? { relatedSystemId } : {}), ...(requestedPriority ? { requestedPriority } : {}), ...(status ? { currentStatus: status } : {}), ...(search ? { OR: [{ ticketNumber: { contains: search, mode: "insensitive" } }, { summary: { contains: search, mode: "insensitive" } }] } : {}) };
    const prisma = getPrisma() as any; const [items, totalItems] = await Promise.all([prisma.ticket.findMany({ where, orderBy: [{ [sort]: direction }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize, include: summaryInclude }), prisma.ticket.count({ where })]);
    res.json({ items: items.map(ticketSummary), pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } });
  } catch (error) { handle(res, error, "Unable to load tickets."); }
});

app.get("/api/tickets/:ticketId", async (req, res) => { try { const ticket = await ownedTicket(ticketId(req), req); if (!ticket) return fail(res, 404, "Ticket not found.", "NOT_FOUND"); res.json({ ticket: ticketDetail(ticket, false) }); } catch (error) { handle(res, error, "Unable to load ticket."); } });
app.get("/api/tickets/:ticketId/attachments", async (req, res) => { try { const ticket = await ownedTicket(ticketId(req), req, {}); if (!ticket) return fail(res, 404, "Ticket not found.", "NOT_FOUND"); const items = await (getPrisma() as any).attachment.findMany({ where: { ticketId: ticket.id }, orderBy: { createdAt: "asc" }, select: { id: true, originalFilename: true, mimeType: true, byteSize: true, createdAt: true, removedAt: true, removalReason: true } }); res.json({ items }); } catch (error) { handle(res, error, "Unable to load attachments."); } });

app.post("/api/tickets/:ticketId/attachments", upload.single("file"), async (req, res) => {
  try {
    const id = ticketId(req); const owner = requesterId(req); if (!req.file) throw new TicketRequestError(400, "file is required."); if (!ALLOWED_ATTACHMENT_TYPES.has(req.file.mimetype)) throw new TicketRequestError(415, "Only JPG, PNG, WEBP, and PDF files are allowed.", "UNSUPPORTED_MEDIA_TYPE");
    const prisma = getPrisma() as any; const ticket = await prisma.ticket.findFirst({ where: { id, requesterId: owner, requester: { isActive: true } }, select: { id: true } }); if (!ticket) return fail(res, 404, "Ticket not found.", "NOT_FOUND"); if (await prisma.attachment.count({ where: { ticketId: id, removedAt: null } }) >= 5) throw new TicketRequestError(409, "A ticket can have at most five active attachments.");
    const storageKey = randomUUID(); await mkdir(ATTACHMENT_DIRECTORY, { recursive: true }); await writeFile(join(ATTACHMENT_DIRECTORY, storageKey), req.file.buffer);
    try { const attachment = await prisma.attachment.create({ data: { ticketId: id, storageKey, originalFilename: req.file.originalname, mimeType: req.file.mimetype, byteSize: req.file.size }, select: { id: true, originalFilename: true, mimeType: true, byteSize: true, createdAt: true, removedAt: true, removalReason: true } }); res.status(201).json({ attachment }); } catch { await unlink(join(ATTACHMENT_DIRECTORY, storageKey)).catch(() => undefined); throw new Error("attachment metadata failure"); }
  } catch (error) { if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return void fail(res, 413, "Attachment must be 5 MB or smaller.", "PAYLOAD_TOO_LARGE"); handle(res, error, "Unable to upload attachment."); }
});

app.get("/api/attachments/:attachmentId/download", async (req, res) => { try { const id = positive(req.params.attachmentId, "attachmentId"); const owner = requesterId(req); const attachment = await (getPrisma() as any).attachment.findFirst({ where: { id, ticket: { requesterId: owner, requester: { isActive: true } } }, select: { storageKey: true, originalFilename: true, mimeType: true, removedAt: true } }); if (!attachment) return fail(res, 404, "Attachment not found.", "NOT_FOUND"); if (attachment.removedAt) return fail(res, 410, "Attachment is no longer available.", "GONE"); res.type(attachment.mimeType).attachment(attachment.originalFilename).send(await readFile(join(ATTACHMENT_DIRECTORY, attachment.storageKey))); } catch (error) { handle(res, error, "Unable to download attachment."); } });
app.delete("/api/attachments/:attachmentId", async (req, res) => { try { const id = positive(req.params.attachmentId, "attachmentId"); const owner = requesterId(req); const reason = text(req.body?.removalReason, "removalReason", 5, 500); const prisma = getPrisma() as any; const attachment = await prisma.attachment.findFirst({ where: { id, ticket: { requesterId: owner, requester: { isActive: true } } }, select: { id: true, removedAt: true } }); if (!attachment) return fail(res, 404, "Attachment not found.", "NOT_FOUND"); if (attachment.removedAt) return fail(res, 409, "Attachment has already been removed.", "CONFLICT"); const removed = await prisma.attachment.update({ where: { id }, data: { removedAt: new Date(), removalReason: reason, removedByRequesterId: owner }, select: { id: true, originalFilename: true, mimeType: true, byteSize: true, createdAt: true, removedAt: true, removalReason: true } }); res.json(removed); } catch (error) { handle(res, error, "Unable to remove attachment."); } });

app.post("/api/tickets", async (req, res) => {
  try {
    const owner = requesterId(req); const categoryId = positive(String(req.body?.categoryId), "categoryId"); const relatedSystemId = positive(String(req.body?.relatedSystemId), "relatedSystemId"); const summary = text(req.body?.summary, "summary", SUMMARY_MIN_LENGTH, SUMMARY_MAX_LENGTH); const description = text(req.body?.description, "description", DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH); const requestedPriority = req.body?.requestedPriority; if (typeof requestedPriority !== "string" || !REQUESTED_PRIORITIES.has(requestedPriority)) throw new TicketRequestError(400, "requestedPriority must be LOW, MEDIUM, or HIGH."); const prisma = getPrisma() as any;
    const id = await prisma.$transaction(async (tx: any) => { const [requester, category, relatedSystem] = await Promise.all([tx.developmentRequester.findFirst({ where: { id: owner, isActive: true }, select: { id: true } }), tx.category.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true } }), tx.relatedSystem.findFirst({ where: { id: relatedSystemId, isActive: true }, select: { id: true } })]); if (!requester || !category || !relatedSystem) throw new TicketRequestError(404, "Requester or reference data is unavailable."); const draft = await tx.ticket.create({ data: { ticketNumber: `PENDING-${randomUUID()}`, requesterId: owner, categoryId, relatedSystemId, summary, description, requestedPriority, itPriority: requestedPriority, currentStatus: "NEW" }, select: { id: true, createdAt: true } }); await tx.ticket.update({ where: { id: draft.id }, data: { ticketNumber: formatTicketNumber(draft.id, draft.createdAt) } }); return draft.id; });
    const ticket = await (getPrisma() as any).ticket.findUnique({ where: { id }, include: detailInclude }); res.status(201).json({ ticket: ticketDetail(ticket, false) });
  } catch (error) { handle(res, error, "Unable to create the ticket."); }
});

async function publicComments(req: Request, res: Response) { try { const ticket = await ownedTicket(ticketId(req), req, {}); if (!ticket) return fail(res, 404, "Ticket not found.", "NOT_FOUND"); const rows = await (getPrisma() as any).publicComment.findMany({ where: { ticketId: ticket.id }, include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } }); res.json({ items: rows.map((row: any) => ({ id: row.id, content: row.content, author: { id: row.author.id, name: row.author.name, role: row.author.role }, createdAt: row.createdAt })) }); } catch (error) { handle(res, error, "Unable to load comments."); } }
app.get("/api/tickets/:ticketId/comments", publicComments);
app.post("/api/tickets/:ticketId/comments", async (req, res) => { try { const ticket = await ownedTicket(ticketId(req), req, {}); if (!ticket) return fail(res, 404, "Ticket not found.", "NOT_FOUND"); const content = text(req.body?.content, "Comment", 1, 2000); const row = await (getPrisma() as any).publicComment.create({ data: { ticketId: ticket.id, authorId: (req as any).user.id, content }, include: { author: { select: { id: true, name: true, role: true } } } }); res.status(201).json({ id: row.id, content: row.content, author: { id: row.author.id, name: row.author.name, role: row.author.role }, createdAt: row.createdAt }); } catch (error) { handle(res, error, "Unable to save the comment."); } });
app.post("/api/tickets/:ticketId/resolution-signal", async (req, res) => { try { const ticket = await ownedTicket(ticketId(req), req, {}); if (!ticket) return fail(res, 404, "Ticket not found.", "NOT_FOUND"); const updated = await (getPrisma() as any).ticket.update({ where: { id: ticket.id }, data: { requesterReportedResolvedAt: new Date() }, include: detailInclude }); res.json({ ticket: ticketDetail(updated, false) }); } catch (error) { handle(res, error, "Unable to record the resolution signal."); } });

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => { if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return void fail(res, 413, "Attachment must be 5 MB or smaller.", "PAYLOAD_TOO_LARGE"); next(error); });
app.use((_error: unknown, _req: Request, res: Response, _next: NextFunction) => { if (!res.headersSent) fail(res, 500, "Internal server error.", "SERVER_ERROR"); });
export default app;
