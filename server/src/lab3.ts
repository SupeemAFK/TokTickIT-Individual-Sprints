import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { getPrisma } from "./prisma.js";

type Principal = { id: number; role: UserRole; legacyRequesterId: number | null; mustChangePassword: boolean };
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ROLES = new Set(Object.values(UserRole));
const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"] as const;
const STATUS_SET = new Set<string>(STATUSES);
const PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  CANCELLED: [],
};

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};

export const verifyPassword = (password: string, encoded: string) => {
  try {
    const [salt, value] = encoded.split(":");
    if (!salt || !value || !/^[0-9a-f]+$/.test(value)) return false;
    const candidate = scryptSync(password, salt, 64).toString("hex");
    return timingSafeEqual(Buffer.from(value, "hex"), Buffer.from(candidate, "hex"));
  } catch {
    return false;
  }
};

const tokenKey = (token: string) => createHash("sha256").update(token).digest("hex");
const bearerToken = (req: Request) => {
  const header = req.header("authorization");
  return header?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
};
const safeUser = (user: any) => ({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive });

function sendError(res: Response, status: number, error: string, code?: string) {
  const stableCode = code ?? (status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : "INVALID_REQUEST");
  return res.status(status).json({ error, code: stableCode });
}

function idParam(value: unknown, field = "ticketId") {
  if (typeof value !== "string" || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new RequestError(400, `${field} must be a positive integer.`, "INVALID_REQUEST");
  }
  return Number(value);
}

function requiredText(value: unknown, field: string, min = 1, max = 2000) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw new RequestError(400, `${field} must be between ${min} and ${max} characters.`, "INVALID_REQUEST");
  }
  return value.trim();
}

class RequestError extends Error {
  constructor(readonly status: number, message: string, readonly code = "INVALID_REQUEST") { super(message); }
}

function handleError(res: Response, error: unknown, fallback = "Unable to complete the request.") {
  if (error instanceof RequestError) return sendError(res, error.status, error.message, error.code);
  if ((error as any)?.code === "P2002") return sendError(res, 409, "Email is already in use.", "CONFLICT");
  return sendError(res, 500, fallback, "SERVER_ERROR");
}

export async function getPrincipal(req: Request): Promise<Principal | null> {
  const token = bearerToken(req);
  if (!token) return null;
  const session = await (getPrisma() as any).session.findUnique({ where: { tokenHash: tokenKey(token) } });
  if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) return null;
  const user = await getPrisma().user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) return null;
  return { id: user.id, role: user.role, legacyRequesterId: user.legacyRequesterId, mustChangePassword: user.mustChangePassword };
}

function protect(roles?: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await getPrincipal(req);
      if (!user) return sendError(res, 401, "Authentication is required.", "UNAUTHENTICATED");
      if (user.mustChangePassword && req.path !== "/api/auth/change-password" && req.path !== "/api/auth/me") {
        return sendError(res, 403, "Password change is required.", "PASSWORD_CHANGE_REQUIRED");
      }
      if (roles && !roles.includes(user.role)) return sendError(res, 403, "You are not permitted to perform this action.", "FORBIDDEN");
      (req as any).user = user;
      next();
    } catch {
      sendError(res, 500, "Unable to validate the session.", "SERVER_ERROR");
    }
  };
}

export async function authenticatedRequesterId(req: Request): Promise<number | null> {
  const user = await getPrincipal(req);
  return user?.role === UserRole.REQUESTER && !user.mustChangePassword ? user.legacyRequesterId : null;
}

function requesterFrom(req: Request) {
  const user = (req as any).user as Principal | undefined;
  if (!user?.legacyRequesterId) throw new RequestError(403, "Requester account is not linked to a requester record.", "FORBIDDEN");
  return user.legacyRequesterId;
}

const ownerShape = (owner: any) => owner ? { id: owner.id, name: owner.name, role: owner.role } : null;
const categoryShape = (category: any) => category ? { id: category.id, name: category.name } : null;
const requesterShape = (requester: any) => requester ? { id: requester.id, name: requester.name, email: requester.email } : null;
const commentShape = (item: any) => ({ id: item.id, content: item.content, author: { id: item.author.id, name: item.author.name, role: item.author.role }, createdAt: item.createdAt });
const attachmentShape = (item: any) => ({ id: item.id, originalFilename: item.originalFilename, mimeType: item.mimeType, byteSize: item.byteSize, createdAt: item.createdAt, removedAt: item.removedAt ?? null, removalReason: item.removalReason ?? null });

export const ticketSummary = (ticket: any) => ({
  id: ticket.id,
  ticketNumber: ticket.ticketNumber,
  summary: ticket.summary,
  requestedPriority: ticket.requestedPriority,
  itPriority: ticket.itPriority,
  currentStatus: ticket.currentStatus,
  owner: ownerShape(ticket.owner),
  category: categoryShape(ticket.category),
  relatedSystem: categoryShape(ticket.relatedSystem),
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});

export const ticketDetail = (ticket: any, includeNotes: boolean) => ({
  id: ticket.id,
  ticketNumber: ticket.ticketNumber,
  summary: ticket.summary,
  description: ticket.description,
  requestedPriority: ticket.requestedPriority,
  itPriority: ticket.itPriority,
  currentStatus: ticket.currentStatus,
  owner: ownerShape(ticket.owner),
  requester: requesterShape(ticket.requester),
  category: categoryShape(ticket.category),
  relatedSystem: categoryShape(ticket.relatedSystem),
  attachments: (ticket.attachments ?? []).map(attachmentShape),
  publicComments: (ticket.publicComments ?? []).map(commentShape),
  ...(includeNotes ? { internalNotes: (ticket.internalNotes ?? []).map(commentShape) } : {}),
  problemAppearsResolvedAt: ticket.requesterReportedResolvedAt ?? null,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});

const summaryInclude = { owner: { select: { id: true, name: true, role: true } }, category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } } };
const detailInclude = { ...summaryInclude, requester: { select: { id: true, name: true, email: true } }, attachments: true, publicComments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } }, internalNotes: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } } };

async function findSummary(id: number) {
  const ticket = await (getPrisma() as any).ticket.findUnique({ where: { id }, include: summaryInclude });
  return ticket ? ticketSummary(ticket) : null;
}

async function findDetail(id: number) {
  const ticket = await (getPrisma() as any).ticket.findUnique({ where: { id }, include: detailInclude });
  return ticket ? ticketDetail(ticket, true) : null;
}

function staffRole(role: unknown) { return role === UserRole.IT_STAFF || role === UserRole.ADMINISTRATOR; }

export function registerLab3(app: Express) {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = requiredText(req.body?.email, "Email", 3, 320).toLowerCase();
      const password = requiredText(req.body?.password, "Password", 8, 200);
      const user = await getPrisma().user.findUnique({ where: { email } });
      if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) return sendError(res, 401, "Invalid email or password.", "LOGIN_FAILED");
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await (getPrisma() as any).session.create({ data: { tokenHash: tokenKey(token), userId: user.id, expiresAt } });
      res.json({ user: safeUser(user), mustChangePassword: user.mustChangePassword, session: { token, expiresAt: expiresAt.toISOString() } });
    } catch (error) { handleError(res, error, "Invalid login request."); }
  });

  app.post("/api/auth/logout", protect(), async (req, res) => {
    try {
      const token = bearerToken(req);
      if (token) await (getPrisma() as any).session.updateMany({ where: { tokenHash: tokenKey(token), revokedAt: null }, data: { revokedAt: new Date() } });
      res.status(204).end();
    } catch (error) { handleError(res, error, "Unable to log out."); }
  });

  app.get("/api/auth/me", protect(), async (req, res) => {
    try {
      const user = await getPrisma().user.findUnique({ where: { id: (req as any).user.id } });
      if (!user) return sendError(res, 401, "Authentication is required.", "UNAUTHENTICATED");
      res.json({ user: safeUser(user), mustChangePassword: user.mustChangePassword });
    } catch (error) { handleError(res, error, "Unable to load the current user."); }
  });

  app.post("/api/auth/change-password", protect(), async (req, res) => {
    try {
      const password = requiredText(req.body?.newPassword, "New password", 12, 200);
      const confirmation = requiredText(req.body?.confirmation, "Confirmation", 12, 200);
      if (password !== confirmation) throw new RequestError(400, "New password and confirmation must match.");
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) throw new RequestError(400, "Password must include upper-case, lower-case, and number characters.");
      const user = await getPrisma().user.update({ where: { id: (req as any).user.id }, data: { passwordHash: hashPassword(password), mustChangePassword: false } });
      res.json({ user: safeUser(user), mustChangePassword: false });
    } catch (error) { handleError(res, error, "Unable to change the password."); }
  });

  app.get("/api/staff/users", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), async (_req, res) => {
    try {
      const users = await getPrisma().user.findMany({ where: { role: { in: [UserRole.IT_STAFF, UserRole.ADMINISTRATOR] }, isActive: true }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } });
      res.json(users);
    } catch (error) { handleError(res, error, "Unable to load staff users."); }
  });

  app.get("/api/staff/tickets", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), async (req, res) => {
    try {
      const query = req.query as Record<string, unknown>;
      const search = query.search === undefined ? "" : requiredText(query.search, "search", 0, 160);
      const page = query.page === undefined ? 1 : idParam(query.page, "page");
      const pageSize = query.pageSize === undefined ? 10 : idParam(query.pageSize, "pageSize");
      if (![10, 20, 50].includes(pageSize)) throw new RequestError(400, "pageSize must be 10, 20, or 50.");
      const direction = query.direction === undefined ? "desc" : query.direction;
      if (direction !== "asc" && direction !== "desc") throw new RequestError(400, "direction is invalid.");
      const sort = query.sort === undefined ? "updatedAt" : query.sort;
      if (typeof sort !== "string" || !new Set(["updatedAt", "createdAt", "ticketNumber", "summary", "currentStatus", "itPriority", "requestedPriority"]).has(sort)) throw new RequestError(400, "sort is invalid.");
      const status = query.status === undefined ? undefined : requiredText(query.status, "status", 1, 40);
      if (status && !STATUS_SET.has(status)) throw new RequestError(400, "status is invalid.");
      const ownerUserId = query.ownerUserId === undefined ? undefined : (query.ownerUserId === "null" ? null : idParam(query.ownerUserId, "ownerUserId"));
      const requestedPriority = query.requestedPriority === undefined ? undefined : requiredText(query.requestedPriority, "requestedPriority", 1, 20);
      const itPriority = query.itPriority === undefined ? undefined : requiredText(query.itPriority, "itPriority", 1, 20);
      if (requestedPriority && !PRIORITIES.has(requestedPriority)) throw new RequestError(400, "requestedPriority is invalid.");
      if (itPriority && !PRIORITIES.has(itPriority)) throw new RequestError(400, "itPriority is invalid.");
      const categoryId = query.categoryId === undefined ? undefined : idParam(query.categoryId, "categoryId");
      const requesterId = query.requesterId === undefined ? undefined : idParam(query.requesterId, "requesterId");
      const where: any = {
        ...(search ? { OR: [{ ticketNumber: { contains: search, mode: "insensitive" } }, { summary: { contains: search, mode: "insensitive" } }] } : {}),
        ...(status ? { currentStatus: status } : {}), ...(ownerUserId === null ? { ownerUserId: null } : ownerUserId ? { ownerUserId } : {}),
        ...(requestedPriority ? { requestedPriority } : {}), ...(itPriority ? { itPriority } : {}), ...(categoryId ? { categoryId } : {}), ...(requesterId ? { requesterId } : {}),
      };
      const prisma = getPrisma() as any;
      const [rows, totalItems, countRows] = await Promise.all([
        prisma.ticket.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ [sort]: direction }, { id: "desc" }], include: { ...summaryInclude, requester: { select: { id: true, name: true } } } }),
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({ where, select: { currentStatus: true, itPriority: true, ownerUserId: true } }),
      ]);
      const byStatus = Object.fromEntries(STATUSES.map((item) => [item, 0])) as Record<string, number>;
      const byItPriority = { LOW: 0, MEDIUM: 0, HIGH: 0 } as Record<string, number>;
      for (const row of countRows) { byStatus[row.currentStatus] = (byStatus[row.currentStatus] ?? 0) + 1; byItPriority[row.itPriority] = (byItPriority[row.itPriority] ?? 0) + 1; }
      res.json({ items: rows.map((row: any) => ({ ...ticketSummary(row), requester: { id: row.requester.id, name: row.requester.name } })), pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) }, counts: { totalItems, unassigned: countRows.filter((row: any) => row.ownerUserId === null).length, byStatus, byItPriority } });
    } catch (error) { handleError(res, error, "Unable to load the ticket queue."); }
  });

  app.get("/api/staff/tickets/:ticketId", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), async (req, res) => {
    try { const ticket = await findDetail(idParam(req.params.ticketId)); if (!ticket) return sendError(res, 404, "Ticket not found.", "NOT_FOUND"); res.json({ ticket }); }
    catch (error) { handleError(res, error, "Unable to load ticket detail."); }
  });

  app.post("/api/staff/tickets/:ticketId/claim", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), async (req, res) => {
    try {
      const id = idParam(req.params.ticketId); const prisma = getPrisma() as any;
      if (!(await prisma.ticket.findUnique({ where: { id }, select: { id: true } }))) return sendError(res, 404, "Ticket not found.", "NOT_FOUND");
      const claimed = await prisma.ticket.updateMany({ where: { id, ownerUserId: null }, data: { ownerUserId: (req as any).user.id } });
      if (!claimed.count) return sendError(res, 409, "Ticket is already assigned.", "CONFLICT");
      const ticket = await findSummary(id); res.json({ ticket });
    } catch (error) { handleError(res, error, "Unable to claim the ticket."); }
  });

  app.patch("/api/staff/tickets/:ticketId/owner", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), async (req, res) => {
    try {
      const id = idParam(req.params.ticketId); const body = req.body ?? {}; const prisma = getPrisma() as any;
      const current = await prisma.ticket.findUnique({ where: { id }, select: { id: true } });
      if (!current) return sendError(res, 404, "Ticket not found.", "NOT_FOUND");
      if (!Object.prototype.hasOwnProperty.call(body, "ownerUserId")) throw new RequestError(400, "ownerUserId is required.");
      let ownerUserId: number | null = null;
      if (body.ownerUserId !== null) {
        ownerUserId = idParam(String(body.ownerUserId), "ownerUserId");
        const owner = await prisma.user.findFirst({ where: { id: ownerUserId, isActive: true, role: { in: [UserRole.IT_STAFF, UserRole.ADMINISTRATOR] } }, select: { id: true } });
        if (!owner) throw new RequestError(400, "Owner must be an active staff user.");
      }
      await prisma.ticket.update({ where: { id }, data: { ownerUserId } });
      res.json({ ticket: await findSummary(id) });
    } catch (error) { handleError(res, error, "Unable to update ticket ownership."); }
  });

  app.patch("/api/staff/tickets/:ticketId/priority", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), async (req, res) => {
    try {
      const id = idParam(req.params.ticketId); const value = req.body?.itPriority;
      if (typeof value !== "string" || !PRIORITIES.has(value)) throw new RequestError(400, "itPriority is invalid.");
      const prisma = getPrisma() as any; if (!(await prisma.ticket.findUnique({ where: { id }, select: { id: true } }))) return sendError(res, 404, "Ticket not found.", "NOT_FOUND");
      await prisma.ticket.update({ where: { id }, data: { itPriority: value } }); res.json({ ticket: await findSummary(id) });
    } catch (error) { handleError(res, error, "Unable to update IT priority."); }
  });

  app.patch("/api/staff/tickets/:ticketId/status", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), async (req, res) => {
    try {
      const id = idParam(req.params.ticketId); const value = req.body?.currentStatus;
      if (typeof value !== "string" || !STATUS_SET.has(value)) throw new RequestError(400, "currentStatus is invalid.");
      const prisma = getPrisma() as any; const current = await prisma.ticket.findUnique({ where: { id }, select: { id: true, currentStatus: true } });
      if (!current) return sendError(res, 404, "Ticket not found.", "NOT_FOUND");
      if (!ALLOWED_TRANSITIONS[current.currentStatus]?.includes(value)) return sendError(res, 409, "Status transition is not permitted.", "CONFLICT");
      await prisma.ticket.update({ where: { id }, data: { currentStatus: value } }); res.json({ ticket: await findSummary(id) });
    } catch (error) { handleError(res, error, "Unable to update ticket status."); }
  });

  async function staffCommentList(req: Request, res: Response, kind: "publicComments" | "internalNotes") {
    try {
      const id = idParam(req.params.ticketId); const prisma = getPrisma() as any;
      if (!(await prisma.ticket.findUnique({ where: { id }, select: { id: true } }))) return sendError(res, 404, "Ticket not found.", "NOT_FOUND");
      const rows = await prisma[kind === "publicComments" ? "publicComment" : "internalNote"].findMany({ where: { ticketId: id }, include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } });
      res.json({ items: rows.map(commentShape) });
    } catch (error) { handleError(res, error, "Unable to load ticket updates."); }
  }

  async function staffCommentCreate(req: Request, res: Response, kind: "publicComments" | "internalNotes") {
    try {
      const id = idParam(req.params.ticketId); const content = requiredText(req.body?.content, kind === "publicComments" ? "Comment" : "Note"); const prisma = getPrisma() as any;
      if (!(await prisma.ticket.findUnique({ where: { id }, select: { id: true } }))) return sendError(res, 404, "Ticket not found.", "NOT_FOUND");
      const row = await prisma[kind === "publicComments" ? "publicComment" : "internalNote"].create({ data: { ticketId: id, authorId: (req as any).user.id, content }, include: { author: { select: { id: true, name: true, role: true } } } });
      res.status(201).json(commentShape(row));
    } catch (error) { handleError(res, error, "Unable to save the ticket update."); }
  }
  app.get("/api/staff/tickets/:ticketId/comments", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), (req, res) => void staffCommentList(req, res, "publicComments"));
  app.post("/api/staff/tickets/:ticketId/comments", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), (req, res) => void staffCommentCreate(req, res, "publicComments"));
  app.get("/api/staff/tickets/:ticketId/notes", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), (req, res) => void staffCommentList(req, res, "internalNotes"));
  app.post("/api/staff/tickets/:ticketId/notes", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), (req, res) => void staffCommentCreate(req, res, "internalNotes"));

  app.get("/api/staff/attachments/:attachmentId/download", protect([UserRole.IT_STAFF, UserRole.ADMINISTRATOR]), async (req, res) => {
    try { const id = idParam(req.params.attachmentId, "attachmentId"); const attachment = await (getPrisma() as any).attachment.findUnique({ where: { id }, select: { storageKey: true, originalFilename: true, mimeType: true, removedAt: true } }); if (!attachment || attachment.removedAt) return sendError(res, attachment ? 410 : 404, attachment ? "Attachment is no longer available." : "Attachment not found.", attachment ? "GONE" : "NOT_FOUND"); const { readFile } = await import("node:fs/promises"); const { join } = await import("node:path"); res.type(attachment.mimeType).attachment(attachment.originalFilename).send(await readFile(join(process.cwd(), "uploads", attachment.storageKey))); }
    catch (error) { handleError(res, error, "Unable to download the attachment."); }
  });

  app.get("/api/admin/users", protect([UserRole.ADMINISTRATOR]), async (req, res) => {
    try { const search = typeof req.query.search === "string" ? req.query.search.trim() : ""; const role = req.query.role === undefined ? undefined : req.query.role; if (role !== undefined && (typeof role !== "string" || !ROLES.has(role as UserRole))) throw new RequestError(400, "role is invalid."); const users = await getPrisma().user.findMany({ where: { ...(role ? { role: role as UserRole } : {}), ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }] } : {}) }, orderBy: { name: "asc" } }); res.json({ items: users.map(safeUser) }); }
    catch (error) { handleError(res, error, "Unable to load users."); }
  });

  app.post("/api/admin/users", protect([UserRole.ADMINISTRATOR]), async (req, res) => {
    try {
      const body = req.body ?? {}; const name = requiredText(body.name, "Name", 2, 120); const email = requiredText(body.email, "Email", 3, 320).toLowerCase(); const role = body.role;
      if (typeof role !== "string" || !ROLES.has(role as UserRole)) throw new RequestError(400, "role is invalid.");
      const initialPassword = requiredText(body.initialPassword, "Initial password", 12, 200); const isActive = body.isActive !== false; const prisma = getPrisma() as any;
      const user = await prisma.$transaction(async (tx: any) => { let legacyRequesterId: number | null = null; if (role === UserRole.REQUESTER) { const legacy = await tx.developmentRequester.upsert({ where: { email }, update: { name, isActive }, create: { name, email, isActive } }); legacyRequesterId = legacy.id; } return tx.user.create({ data: { name, email, role, isActive, passwordHash: hashPassword(initialPassword), mustChangePassword: true, legacyRequesterId } }); });
      res.status(201).json(safeUser(user));
    } catch (error) { handleError(res, error, "Unable to create the user."); }
  });

  app.patch("/api/admin/users/:userId", protect([UserRole.ADMINISTRATOR]), async (req, res) => {
    try {
      const id = idParam(req.params.userId, "userId"); const body = req.body ?? {}; const me = (req as any).user; const prisma = getPrisma() as any; const target = await prisma.user.findUnique({ where: { id } });
      if (!target) return sendError(res, 404, "User not found.", "NOT_FOUND");
      const nextName = body.name === undefined ? target.name : requiredText(body.name, "Name", 2, 120); const nextEmail = body.email === undefined ? target.email : requiredText(body.email, "Email", 3, 320).toLowerCase(); const nextRole = body.role === undefined ? target.role : body.role; const nextActive = body.isActive === undefined ? target.isActive : body.isActive;
      if (typeof nextRole !== "string" || !ROLES.has(nextRole as UserRole) || typeof nextActive !== "boolean") throw new RequestError(400, "role and isActive are invalid.");
      if (id === me.id && !nextActive) return sendError(res, 409, "You cannot deactivate your own account.", "CONFLICT");
      const passwordData = body.initialPassword === undefined ? {} : { passwordHash: hashPassword(requiredText(body.initialPassword, "Initial password", 12, 200)), mustChangePassword: true };
      const user = await prisma.$transaction(async (tx: any) => {
        if (target.role === UserRole.ADMINISTRATOR && (nextRole !== UserRole.ADMINISTRATOR || !nextActive) && await tx.user.count({ where: { role: UserRole.ADMINISTRATOR, isActive: true } }) <= 1) throw new RequestError(409, "At least one active Administrator is required.", "CONFLICT");
        if (await tx.ticket.count({ where: { ownerUserId: id } }) > 0 && (!nextActive || !staffRole(nextRole))) throw new RequestError(409, "The user owns tickets and cannot be deactivated or demoted.", "OWNER_INTEGRITY_CONFLICT");
        let legacyRequesterId = target.legacyRequesterId;
        if (nextRole === UserRole.REQUESTER && !legacyRequesterId) { const legacy = await tx.developmentRequester.upsert({ where: { email: nextEmail }, update: { name: nextName, isActive: nextActive }, create: { name: nextName, email: nextEmail, isActive: nextActive } }); legacyRequesterId = legacy.id; }
        if (legacyRequesterId) await tx.developmentRequester.update({ where: { id: legacyRequesterId }, data: { name: nextName, email: nextEmail, isActive: nextActive } });
        return tx.user.update({ where: { id }, data: { name: nextName, email: nextEmail, role: nextRole, isActive: nextActive, legacyRequesterId, ...passwordData } });
      });
      res.json(safeUser(user));
    } catch (error) { handleError(res, error, "Unable to update the user."); }
  });

  app.post("/api/admin/users/:userId/initial-password", protect([UserRole.ADMINISTRATOR]), async (req, res) => {
    try { const id = idParam(req.params.userId, "userId"); const password = requiredText(req.body?.initialPassword, "Initial password", 12, 200); const user = await (getPrisma() as any).user.findUnique({ where: { id }, select: { id: true } }); if (!user) return sendError(res, 404, "User not found.", "NOT_FOUND"); await (getPrisma() as any).$transaction((tx: any) => tx.user.update({ where: { id }, data: { passwordHash: hashPassword(password), mustChangePassword: true } })); res.status(204).end(); }
    catch (error) { handleError(res, error, "Unable to set the initial password."); }
  });
}
