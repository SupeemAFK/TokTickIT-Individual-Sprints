import type { Express, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { protect, ticketSummary } from "./lab3.js";

const STAFF_ROLES = [UserRole.IT_STAFF, UserRole.ADMINISTRATOR];
const ACTIVE_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const;
const ACTIVE_ACTION_STATUSES = ["OPEN", "IN_PROGRESS"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const PAGE_SIZE = 25;
const DASHBOARD_TICKET_SELECT = {
  id: true,
  ticketNumber: true,
  summary: true,
  requestedPriority: true,
  itPriority: true,
  currentStatus: true,
  owner: { select: { id: true, name: true, role: true } },
  category: { select: { id: true, name: true } },
  relatedSystem: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

class DashboardRequestError extends Error {
  constructor(readonly status: number, message: string, readonly code = "INVALID_REQUEST") { super(message); }
}

function sendError(res: Response, status: number, error: string, code: string) {
  return res.status(status).json({ error, code });
}

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof DashboardRequestError) return sendError(res, error.status, error.message, error.code);
  return sendError(res, 500, fallback, "SERVER_ERROR");
}

function parseInstant(value: unknown, field: string): Date {
  if (typeof value !== "string") throw new DashboardRequestError(400, `${field} must be an ISO-8601 instant with an explicit offset.`);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) throw new DashboardRequestError(400, `${field} must be an ISO-8601 instant with an explicit offset.`);
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
    throw new DashboardRequestError(400, `${field} must be a valid instant.`);
  }
  if (offsetHourText !== undefined && (Number(offsetHourText) > 23 || Number(offsetMinuteText) > 59)) {
    throw new DashboardRequestError(400, `${field} must have a valid UTC offset.`);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new DashboardRequestError(400, `${field} must be a valid instant.`);
  return date;
}

function requestedWindow(req: Request) {
  const from = parseInstant(req.query.from, "from");
  const to = parseInstant(req.query.to, "to");
  if (from.getTime() >= to.getTime()) throw new DashboardRequestError(400, "from must be earlier than to.");
  return { from, to };
}

type ResolvedCursor = { scope: "staff" | "requester"; from: string; to: string; resolvedAt: string; id: number };

function encodeCursor(cursor: ResolvedCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: unknown, scope: ResolvedCursor["scope"], from: Date, to: Date) {
  if (value === undefined) return null;
  if (typeof value !== "string" || value.length < 1 || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new DashboardRequestError(400, "cursor is invalid.");
  }
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<ResolvedCursor>;
    const resolvedAt = parseInstant(cursor.resolvedAt, "cursor");
    if (cursor.scope !== scope || cursor.from !== from.toISOString() || cursor.to !== to.toISOString() ||
      !Number.isSafeInteger(cursor.id) || Number(cursor.id) < 1 || resolvedAt < from || resolvedAt >= to) {
      throw new DashboardRequestError(400, "cursor does not match this resolved Ticket window.");
    }
    return { resolvedAt, id: Number(cursor.id) };
  } catch (error) {
    if (error instanceof DashboardRequestError) throw error;
    throw new DashboardRequestError(400, "cursor is invalid.");
  }
}

function groupCount(row: any) {
  return Number(row?._count?._all ?? 0);
}

function groupedBuckets(groups: any[], field: string, values: readonly string[]) {
  const result = Object.fromEntries(values.map((value) => [value, 0])) as Record<string, number>;
  for (const group of groups) if (Object.prototype.hasOwnProperty.call(result, group[field])) result[group[field]] = groupCount(group);
  return result;
}

function toDashboardTicket(ticket: any) {
  return ticketSummary(ticket);
}

async function resolvedTickets(prisma: any, whereBase: Record<string, unknown>, scope: ResolvedCursor["scope"], from: Date, to: Date, cursor: unknown) {
  const position = decodeCursor(cursor, scope, from, to);
  const where: any = {
    ...whereBase,
    resolvedAt: { gte: from, lt: to },
    ...(position ? { OR: [
      { resolvedAt: { lt: position.resolvedAt } },
      { resolvedAt: position.resolvedAt, id: { lt: position.id } },
    ] } : {}),
  };
  const rows = await prisma.ticket.findMany({
    where,
    orderBy: [{ resolvedAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    select: { ...DASHBOARD_TICKET_SELECT, resolvedAt: true },
  });
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    items: page.map((ticket: any) => ({ ...toDashboardTicket(ticket), resolvedAt: new Date(ticket.resolvedAt).toISOString() })),
    nextCursor: hasMore && last ? encodeCursor({ scope, from: from.toISOString(), to: to.toISOString(), resolvedAt: new Date(last.resolvedAt).toISOString(), id: last.id }) : null,
  };
}

function requesterId(req: Request) {
  const id = (req as any).user.legacyRequesterId;
  if (!Number.isSafeInteger(id) || id < 1) throw new DashboardRequestError(403, "Requester account is not linked to a requester record.", "FORBIDDEN");
  return id as number;
}

export function registerLab4Dashboards(app: Express) {
  app.get("/api/staff/dashboard", protect(STAFF_ROLES), async (req, res) => {
    try {
      const userId = (req as any).user.id as number;
      const asOf = new Date();
      const from = new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000);
      const whereActive = { currentStatus: { in: ACTIVE_STATUSES } };
      const prisma = getPrisma() as any;
      const [statusGroups, priorityGroups, unassignedActiveTickets, myActiveTickets, resolvedLast7Days, myActiveActions, actions, recentTickets] = await Promise.all([
        prisma.ticket.groupBy({ by: ["currentStatus"], where: whereActive, _count: { _all: true } }),
        prisma.ticket.groupBy({ by: ["itPriority"], where: whereActive, _count: { _all: true } }),
        prisma.ticket.count({ where: { ...whereActive, ownerUserId: null } }),
        prisma.ticket.count({ where: { ...whereActive, ownerUserId: userId } }),
        prisma.ticket.count({ where: { resolvedAt: { gte: from, lt: asOf } } }),
        prisma.actionTaken.count({ where: { assignedToUserId: userId, status: { in: ACTIVE_ACTION_STATUSES } } }),
        prisma.actionTaken.findMany({
          where: { assignedToUserId: userId, status: { in: ACTIVE_ACTION_STATUSES } },
          orderBy: [{ actionAt: "asc" }, { id: "asc" }],
          take: 10,
          select: { id: true, ticketId: true, actionAt: true, description: true, status: true, ticket: { select: DASHBOARD_TICKET_SELECT } },
        }),
        prisma.ticket.findMany({ where: {}, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 10, select: DASHBOARD_TICKET_SELECT }),
      ]);
      const activeByStatus = groupedBuckets(statusGroups, "currentStatus", ACTIVE_STATUSES);
      const activeByItPriority = groupedBuckets(priorityGroups, "itPriority", PRIORITIES);
      const myActions = actions.map((action: any) => ({
        id: action.id,
        ticketId: action.ticketId,
        actionAt: new Date(action.actionAt).toISOString(),
        description: action.description,
        status: action.status,
        ticket: toDashboardTicket(action.ticket),
      }));
      res.json({
        asOf: asOf.toISOString(),
        resolvedLast7DaysWindow: { from: from.toISOString(), to: asOf.toISOString() },
        metrics: {
          activeTickets: Object.values(activeByStatus).reduce((sum, count) => sum + count, 0),
          unassignedActiveTickets,
          myActiveTickets,
          activeByStatus,
          activeByItPriority,
          waitingForRequester: activeByStatus.WAITING_FOR_REQUESTER,
          resolvedLast7Days,
          myActiveActions,
        },
        myActions,
        recentTickets: recentTickets.map(toDashboardTicket),
      });
    } catch (error) { handleError(res, error, "Unable to load the staff dashboard."); }
  });

  app.get("/api/requester/dashboard", protect([UserRole.REQUESTER]), async (req, res) => {
    try {
      const id = requesterId(req);
      const asOf = new Date();
      const from = new Date(asOf.getTime() - 30 * 24 * 60 * 60 * 1000);
      const prisma = getPrisma() as any;
      const [totalTickets, activeGroups, resolvedLast30Days, recentlyResolvedTickets, recentTickets] = await Promise.all([
        prisma.ticket.count({ where: { requesterId: id } }),
        prisma.ticket.groupBy({ by: ["currentStatus"], where: { requesterId: id, currentStatus: { in: ACTIVE_STATUSES } }, _count: { _all: true } }),
        prisma.ticket.count({ where: { requesterId: id, resolvedAt: { gte: from, lt: asOf } } }),
        prisma.ticket.findMany({ where: { requesterId: id, resolvedAt: { gte: from, lt: asOf } }, orderBy: [{ resolvedAt: "desc" }, { id: "desc" }], take: 10, select: { ...DASHBOARD_TICKET_SELECT, resolvedAt: true } }),
        prisma.ticket.findMany({ where: { requesterId: id }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 10, select: DASHBOARD_TICKET_SELECT }),
      ]);
      const activeByStatus = groupedBuckets(activeGroups, "currentStatus", ACTIVE_STATUSES);
      res.json({
        asOf: asOf.toISOString(),
        resolvedLast30DaysWindow: { from: from.toISOString(), to: asOf.toISOString() },
        metrics: {
          totalTickets,
          activeTickets: Object.values(activeByStatus).reduce((sum, count) => sum + count, 0),
          waitingForRequester: activeByStatus.WAITING_FOR_REQUESTER,
          resolvedLast30Days,
        },
        recentlyResolvedTickets: recentlyResolvedTickets.map((ticket: any) => ({ ...toDashboardTicket(ticket), resolvedAt: new Date(ticket.resolvedAt).toISOString() })),
        recentTickets: recentTickets.map(toDashboardTicket),
      });
    } catch (error) { handleError(res, error, "Unable to load the Requester dashboard."); }
  });

  app.get("/api/staff/dashboard/resolved-tickets", protect(STAFF_ROLES), async (req, res) => {
    try {
      const { from, to } = requestedWindow(req);
      const page = await resolvedTickets(getPrisma() as any, {}, "staff", from, to, req.query.cursor);
      res.json({ window: { from: from.toISOString(), to: to.toISOString() }, ...page });
    } catch (error) { handleError(res, error, "Unable to load resolved Tickets."); }
  });

  app.get("/api/requester/dashboard/resolved-tickets", protect([UserRole.REQUESTER]), async (req, res) => {
    try {
      const { from, to } = requestedWindow(req);
      const id = requesterId(req);
      const page = await resolvedTickets(getPrisma() as any, { requesterId: id }, "requester", from, to, req.query.cursor);
      res.json({ window: { from: from.toISOString(), to: to.toISOString() }, ...page });
    } catch (error) { handleError(res, error, "Unable to load resolved Tickets."); }
  });
}
