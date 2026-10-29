import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { protect } from "./lab3.js";
import { lockTicket } from "./ticket-lock.js";

const STAFF_ROLES = [UserRole.IT_STAFF, UserRole.ADMINISTRATOR];
const ACTIVE_TICKET_STATUSES = new Set(["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"]);
const ACTION_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
const TERMINAL_ACTION_STATUSES = new Set(["COMPLETED", "CANCELLED"]);
const CREATE_FIELDS = new Set(["actionAt", "description", "result", "assignedToUserId", "followUpRequired", "followUpNote", "attachmentNotes"]);
const PATCH_FIELDS = new Set(["expectedUpdatedAt", "actionAt", "description", "result", "assignedToUserId", "status", "followUpRequired", "followUpNote", "attachmentNotes"]);
const ACTION_SELECT = {
  id: true,
  ticketId: true,
  actionAt: true,
  description: true,
  result: true,
  status: true,
  followUpRequired: true,
  followUpNote: true,
  attachmentNotes: true,
  assignedToUserId: true,
  assignedTo: { select: { id: true, name: true, role: true } },
  performedBy: { select: { id: true, name: true, role: true } },
  createdAt: true,
  updatedAt: true,
} as const;

class ActionRequestError extends Error {
  constructor(readonly status: number, message: string, readonly code = "INVALID_REQUEST") { super(message); }
}

function sendError(res: Response, status: number, error: string, code: string) {
  return res.status(status).json({ error, code });
}

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof ActionRequestError) return sendError(res, error.status, error.message, error.code);
  if ((error as any)?.code === "P2002") return sendError(res, 409, "The action conflicts with an existing record.", "CONFLICT");
  return sendError(res, 500, fallback, "SERVER_ERROR");
}

function objectBody(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ActionRequestError(400, "Request body must be a JSON object.");
  return value as Record<string, any>;
}

function rejectUnknownFields(body: Record<string, any>, allowed: Set<string>) {
  const unknown = Object.keys(body).find((key) => !allowed.has(key));
  if (unknown) throw new ActionRequestError(400, `${unknown} is not a supported field.`);
}

function requiredText(value: unknown, field: string, max: number) {
  if (typeof value !== "string") throw new ActionRequestError(400, `${field} must be between 1 and ${max} characters.`);
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > max) throw new ActionRequestError(400, `${field} must be between 1 and ${max} characters.`);
  return trimmed;
}

function nullableText(value: unknown, field: string, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new ActionRequestError(400, `${field} must be text or null.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ActionRequestError(400, `${field} must be at most ${max} characters.`);
  return trimmed || null;
}

function actionInstant(value: unknown, field: string): Date {
  if (typeof value !== "string") {
    throw new ActionRequestError(400, `${field} must be an ISO-8601 timestamp with an explicit offset.`);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) throw new ActionRequestError(400, `${field} must be an ISO-8601 timestamp with an explicit offset.`);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1] || hour > 23 || minute > 59 || second > 59) {
    throw new ActionRequestError(400, `${field} must be a valid date and time.`);
  }
  if (offsetHourText !== undefined && (Number(offsetHourText) > 23 || Number(offsetMinuteText) > 59)) {
    throw new ActionRequestError(400, `${field} must have a valid UTC offset.`);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new ActionRequestError(400, `${field} must be a valid date and time.`);
  return date;
}

function positiveId(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) throw new ActionRequestError(400, `${field} must be a positive integer.`);
  return value;
}

function nullableId(value: unknown, field: string): number | null {
  return value === null ? null : positiveId(value, field);
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new ActionRequestError(400, `${field} must be a boolean.`);
  return value;
}

function routeId(value: unknown, field: string): number {
  if (typeof value !== "string" || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new ActionRequestError(400, `${field} must be a positive integer.`);
  }
  return Number(value);
}

function actionResponse(row: any) {
  return {
    id: row.id,
    ticketId: row.ticketId,
    actionAt: new Date(row.actionAt).toISOString(),
    description: row.description,
    result: row.result,
    status: row.status,
    followUpRequired: row.followUpRequired,
    followUpNote: row.followUpNote ?? null,
    attachmentNotes: row.attachmentNotes ?? null,
    assignedToUserId: row.assignedToUserId ?? null,
    assignedTo: row.assignedTo ? { id: row.assignedTo.id, name: row.assignedTo.name, role: row.assignedTo.role } : null,
    performedBy: { id: row.performedBy.id, name: row.performedBy.name, role: row.performedBy.role },
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

function payloadHash(payload: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function idempotencyKey(req: Request) {
  const value = req.header("Idempotency-Key")?.trim();
  if (!value || value.length > 200) throw new ActionRequestError(400, "Idempotency-Key is required and must be at most 200 characters.");
  return value;
}

function validateFollowUp(required: boolean, note: string | null) {
  if (required && !note) throw new ActionRequestError(400, "followUpNote is required when followUpRequired is true.");
}

function sameIdempotentCreate(row: any, ticketId: number, actorId: number, hash: string) {
  return row.ticketId === ticketId && row.performedByUserId === actorId && row.idempotencyPayloadHash === hash;
}

async function validateAssignee(tx: any, assignedToUserId: number | null) {
  if (assignedToUserId === null) return;
  const user = await tx.user.findFirst({
    where: { id: assignedToUserId, isActive: true, role: { in: STAFF_ROLES } },
    select: { id: true },
  });
  if (!user) throw new ActionRequestError(400, "Assignee must be an active IT Staff or Administrator.");
}

export function registerLab4(app: Express) {
  app.get("/api/tickets/:ticketId/actions", protect(), async (req, res) => {
    try {
      const ticketId = routeId(req.params.ticketId, "ticketId");
      const principal = (req as any).user;
      const prisma = getPrisma() as any;
      let ticket: { id: number } | null = null;
      if (principal.role === UserRole.REQUESTER) {
        if (!principal.legacyRequesterId) return sendError(res, 403, "Requester account is not linked to a requester record.", "FORBIDDEN");
        ticket = await prisma.ticket.findFirst({ where: { id: ticketId, requesterId: principal.legacyRequesterId }, select: { id: true } });
      } else if (STAFF_ROLES.includes(principal.role)) {
        ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      } else {
        return sendError(res, 403, "You are not permitted to perform this action.", "FORBIDDEN");
      }
      if (!ticket) return sendError(res, 404, "Ticket not found.", "NOT_FOUND");
      const rows = await prisma.actionTaken.findMany({
        where: { ticketId },
        orderBy: [{ actionAt: "asc" }, { id: "asc" }],
        select: ACTION_SELECT,
      });
      res.json({ items: rows.map(actionResponse) });
    } catch (error) { handleError(res, error, "Unable to load Actions Taken."); }
  });

  app.post("/api/staff/tickets/:ticketId/actions", protect(STAFF_ROLES), async (req, res) => {
    try {
      const ticketId = routeId(req.params.ticketId, "ticketId");
      const actorId = (req as any).user.id as number;
      const body = objectBody(req.body);
      rejectUnknownFields(body, CREATE_FIELDS);
      const actionAt = actionInstant(body.actionAt, "actionAt");
      const description = requiredText(body.description, "description", 2000);
      const result = requiredText(body.result, "result", 2000);
      const assignedToUserId = body.assignedToUserId === undefined ? null : nullableId(body.assignedToUserId, "assignedToUserId");
      const followUpRequired = requiredBoolean(body.followUpRequired, "followUpRequired");
      const followUpNote = nullableText(body.followUpNote, "followUpNote", 1000);
      const attachmentNotes = nullableText(body.attachmentNotes, "attachmentNotes", 1000);
      validateFollowUp(followUpRequired, followUpNote);
      const key = idempotencyKey(req);
      const normalizedPayload = { actionAt: actionAt.toISOString(), description, result, assignedToUserId, followUpRequired, followUpNote, attachmentNotes };
      const hash = payloadHash(normalizedPayload);
      const prisma = getPrisma() as any;

      const prior = await prisma.actionTaken.findUnique({ where: { idempotencyKey: key } });
      if (prior) {
        if (!sameIdempotentCreate(prior, ticketId, actorId, hash)) return sendError(res, 409, "Idempotency key was already used for a different action request.", "IDEMPOTENCY_KEY_REUSED");
        const existing = await prisma.actionTaken.findUnique({ where: { idempotencyKey: key }, select: ACTION_SELECT });
        return res.status(200).json({ action: actionResponse(existing) });
      }

      const outcome = await prisma.$transaction(async (tx: any) => {
        const ticket = await lockTicket(tx, ticketId);
        if (!ticket) throw new ActionRequestError(404, "Ticket not found.", "NOT_FOUND");
        const existing = await tx.actionTaken.findUnique({ where: { idempotencyKey: key } });
        if (existing) {
          if (!sameIdempotentCreate(existing, ticketId, actorId, hash)) throw new ActionRequestError(409, "Idempotency key was already used for a different action request.", "IDEMPOTENCY_KEY_REUSED");
          return { replay: true, action: await tx.actionTaken.findUnique({ where: { idempotencyKey: key }, select: ACTION_SELECT }) };
        }
        if (!ACTIVE_TICKET_STATUSES.has(ticket.currentStatus)) throw new ActionRequestError(409, "Actions can only be written while the Ticket is active.", "CONFLICT");
        await validateAssignee(tx, assignedToUserId);
        const action = await tx.actionTaken.create({
          data: {
            ticketId,
            actionAt,
            description,
            result,
            status: "OPEN",
            followUpRequired,
            followUpNote,
            attachmentNotes,
            assignedToUserId,
            performedByUserId: actorId,
            idempotencyKey: key,
            idempotencyPayloadHash: hash,
          },
          select: ACTION_SELECT,
        });
        return { replay: false, action };
      });
      res.status(outcome.replay ? 200 : 201).json({ action: actionResponse(outcome.action) });
    } catch (error) {
      if ((error as any)?.code === "P2002") {
        try {
          const key = req.header("Idempotency-Key")?.trim();
          const prior = key ? await (getPrisma() as any).actionTaken.findUnique({ where: { idempotencyKey: key } }) : null;
          if (prior) {
            const body = objectBody(req.body);
            const actionAt = actionInstant(body.actionAt, "actionAt");
            const normalizedPayload = {
              actionAt: actionAt.toISOString(),
              description: requiredText(body.description, "description", 2000),
              result: requiredText(body.result, "result", 2000),
              assignedToUserId: body.assignedToUserId === undefined ? null : nullableId(body.assignedToUserId, "assignedToUserId"),
              followUpRequired: requiredBoolean(body.followUpRequired, "followUpRequired"),
              followUpNote: nullableText(body.followUpNote, "followUpNote", 1000),
              attachmentNotes: nullableText(body.attachmentNotes, "attachmentNotes", 1000),
            };
            const ticketId = routeId(req.params.ticketId, "ticketId");
            const actorId = (req as any).user.id as number;
            if (sameIdempotentCreate(prior, ticketId, actorId, payloadHash(normalizedPayload))) {
              const existing = await (getPrisma() as any).actionTaken.findUnique({ where: { idempotencyKey: key }, select: ACTION_SELECT });
              return void res.status(200).json({ action: actionResponse(existing) });
            }
            return void sendError(res, 409, "Idempotency key was already used for a different action request.", "IDEMPOTENCY_KEY_REUSED");
          }
        } catch (replayError) {
          return void handleError(res, replayError, "Unable to create the Action Taken.");
        }
      }
      handleError(res, error, "Unable to create the Action Taken.");
    }
  });

  async function editAction(req: Request, res: Response, cancel: boolean) {
    try {
      const ticketId = routeId(req.params.ticketId, "ticketId");
      const actionId = routeId(req.params.actionId, "actionId");
      const body = objectBody(req.body);
      const allowed = cancel ? new Set(["expectedUpdatedAt"]) : PATCH_FIELDS;
      rejectUnknownFields(body, allowed);
      const expectedUpdatedAt = actionInstant(body.expectedUpdatedAt, "expectedUpdatedAt");
      const patchKeys = Object.keys(body).filter((key) => key !== "expectedUpdatedAt");
      if (!cancel && patchKeys.length === 0) throw new ActionRequestError(400, "At least one mutable Action Taken field is required.");

      const data: Record<string, unknown> = {};
      if (cancel) data.status = "CANCELLED";
      else {
        if (Object.prototype.hasOwnProperty.call(body, "actionAt")) data.actionAt = actionInstant(body.actionAt, "actionAt");
        if (Object.prototype.hasOwnProperty.call(body, "description")) data.description = requiredText(body.description, "description", 2000);
        if (Object.prototype.hasOwnProperty.call(body, "result")) data.result = requiredText(body.result, "result", 2000);
        if (Object.prototype.hasOwnProperty.call(body, "assignedToUserId")) data.assignedToUserId = nullableId(body.assignedToUserId, "assignedToUserId");
        if (Object.prototype.hasOwnProperty.call(body, "status")) {
          if (typeof body.status !== "string" || !Object.prototype.hasOwnProperty.call(ACTION_TRANSITIONS, body.status)) throw new ActionRequestError(400, "status is invalid.");
          data.status = body.status;
        }
        if (Object.prototype.hasOwnProperty.call(body, "followUpRequired")) data.followUpRequired = requiredBoolean(body.followUpRequired, "followUpRequired");
        if (Object.prototype.hasOwnProperty.call(body, "followUpNote")) data.followUpNote = nullableText(body.followUpNote, "followUpNote", 1000);
        if (Object.prototype.hasOwnProperty.call(body, "attachmentNotes")) data.attachmentNotes = nullableText(body.attachmentNotes, "attachmentNotes", 1000);
      }

      const prisma = getPrisma() as any;
      const updated = await prisma.$transaction(async (tx: any) => {
        const ticket = await lockTicket(tx, ticketId);
        if (!ticket) throw new ActionRequestError(404, "Ticket not found.", "NOT_FOUND");
        if (!ACTIVE_TICKET_STATUSES.has(ticket.currentStatus)) throw new ActionRequestError(409, "Actions can only be written while the Ticket is active.", "CONFLICT");
        const current = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId } });
        if (!current) throw new ActionRequestError(404, "Action Taken not found.", "NOT_FOUND");
        if (new Date(current.updatedAt).getTime() !== expectedUpdatedAt.getTime()) throw new ActionRequestError(409, "Action Taken changed; reload and retry.", "CONFLICT");
        if (TERMINAL_ACTION_STATUSES.has(current.status)) throw new ActionRequestError(409, "Completed or cancelled Actions Taken cannot be changed.", "CONFLICT");

        if (cancel) {
          if (!ACTION_TRANSITIONS[current.status]?.includes("CANCELLED")) throw new ActionRequestError(409, "Action status transition is not permitted.", "CONFLICT");
        } else if (typeof data.status === "string" && data.status !== current.status && !ACTION_TRANSITIONS[current.status]?.includes(data.status)) {
          throw new ActionRequestError(409, "Action status transition is not permitted.", "CONFLICT");
        }
        if (Object.prototype.hasOwnProperty.call(data, "assignedToUserId")) await validateAssignee(tx, data.assignedToUserId as number | null);
        const nextFollowUpRequired = typeof data.followUpRequired === "boolean" ? data.followUpRequired : current.followUpRequired;
        const nextFollowUpNote = Object.prototype.hasOwnProperty.call(data, "followUpNote") ? data.followUpNote as string | null : current.followUpNote;
        validateFollowUp(nextFollowUpRequired, nextFollowUpNote);

        const result = await tx.actionTaken.updateMany({ where: { id: actionId, ticketId, updatedAt: expectedUpdatedAt }, data });
        if (!result.count) throw new ActionRequestError(409, "Action Taken changed; reload and retry.", "CONFLICT");
        return tx.actionTaken.findFirst({ where: { id: actionId, ticketId }, select: ACTION_SELECT });
      });
      res.json({ action: actionResponse(updated) });
    } catch (error) { handleError(res, error, cancel ? "Unable to cancel the Action Taken." : "Unable to update the Action Taken."); }
  }

  app.patch("/api/staff/tickets/:ticketId/actions/:actionId", protect(STAFF_ROLES), (req, res) => void editAction(req, res, false));
  app.post("/api/staff/tickets/:ticketId/actions/:actionId/cancel", protect(STAFF_ROLES), (req, res) => void editAction(req, res, true));
}
