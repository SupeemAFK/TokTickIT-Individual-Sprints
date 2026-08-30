import { randomUUID } from "node:crypto";
import { RequestedPriority } from "@prisma/client";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";

const SUMMARY_MIN_LENGTH = 5;
const SUMMARY_MAX_LENGTH = 160;
const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 4_000;
const REQUESTED_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);

class TicketRequestError extends Error {
  constructor(readonly status: 400 | 404, message: string) {
    super(message);
  }
}

function parsePositiveInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new TicketRequestError(400, `${fieldName} must be a positive integer.`);
  }

  return value;
}

function parseText(value: unknown, fieldName: string, minLength: number, maxLength: number): string {
  if (typeof value !== "string") {
    throw new TicketRequestError(400, `${fieldName} is required.`);
  }

  const trimmedValue = value.trim();
  if (trimmedValue.length < minLength || trimmedValue.length > maxLength) {
    throw new TicketRequestError(400, `${fieldName} must be between ${minLength} and ${maxLength} characters.`);
  }

  return trimmedValue;
}

function formatTicketNumber(ticketId: number, ticketDate: Date): string {
  return `TKT-${ticketDate.getUTCFullYear()}-${String(ticketId).padStart(6, "0")}`;
}

export const app = express();

app.use(cors());
app.use(express.json());

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof SyntaxError && (error as { status?: number }).status === 400) {
    res.status(400).json({ error: "Request body must be valid JSON." });
    return;
  }

  next(error);
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });

    res.status(200).json(categories);
  } catch {
    res.status(500).json({ error: "Unable to load categories." });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const relatedSystems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(relatedSystems);
  } catch {
    res.status(500).json({ error: "Unable to load related systems." });
  }
});

app.get("/api/development-requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().developmentRequester.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(requesters);
  } catch {
    res.status(500).json({ error: "Unable to load Development Requesters." });
  }
});


function parseQueryInteger(value: unknown, fieldName: string, fallback?: number): number | undefined {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new TicketRequestError(400, `${fieldName} must be a positive integer.`);
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    throw new TicketRequestError(400, `${fieldName} must be a positive integer.`);
  }

  return parsedValue;
}

function parseQueryEnum(value: unknown, fieldName: string, allowedValues: Set<string>): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !allowedValues.has(value)) {
    throw new TicketRequestError(400, `${fieldName} is invalid.`);
  }
  return value;
}

const TICKET_SORT_FIELDS = new Set(["createdAt", "updatedAt", "ticketNumber", "summary", "requestedPriority"]);
const SORT_DIRECTIONS = new Set(["asc", "desc"]);
const PAGE_SIZES = new Set([10, 20, 50]);

app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const requesterId = parseQueryInteger(req.query.requesterId, "requesterId");
    if (!requesterId) throw new TicketRequestError(400, "requesterId is required.");
    const categoryId = parseQueryInteger(req.query.categoryId, "categoryId");
    const relatedSystemId = parseQueryInteger(req.query.relatedSystemId, "relatedSystemId");
    const requestedPriority = parseQueryEnum(req.query.requestedPriority, "requestedPriority", REQUESTED_PRIORITIES) as RequestedPriority | undefined;
    const currentStatus = parseQueryEnum(req.query.status, "status", new Set(["NEW"])) as "NEW" | undefined;
    const sort = parseQueryEnum(req.query.sort, "sort", TICKET_SORT_FIELDS) ?? "createdAt";
    const direction = parseQueryEnum(req.query.direction, "direction", SORT_DIRECTIONS) ?? "desc";
    const page = parseQueryInteger(req.query.page, "page", 1) as number;
    const pageSize = parseQueryInteger(req.query.pageSize, "pageSize", 10) as number;
    if (!PAGE_SIZES.has(pageSize)) throw new TicketRequestError(400, "pageSize must be 10, 20, or 50.");
    if (req.query.search !== undefined && (typeof req.query.search !== "string" || req.query.search.trim().length > 160)) {
      throw new TicketRequestError(400, "search must be at most 160 characters.");
    }

    const requester = await getPrisma().developmentRequester.findFirst({
      where: { id: requesterId, isActive: true },
      select: { id: true },
    });
    if (!requester) throw new TicketRequestError(404, "Requester or reference data is unavailable.");

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const where = {
      requesterId,
      ...(categoryId ? { categoryId } : {}),
      ...(relatedSystemId ? { relatedSystemId } : {}),
      ...(requestedPriority ? { requestedPriority } : {}),
      ...(currentStatus ? { currentStatus } : {}),
      ...(search ? { OR: [{ ticketNumber: { contains: search, mode: "insensitive" as const } }, { summary: { contains: search, mode: "insensitive" as const } }] } : {}),
    };
    const orderBy = [{ [sort]: direction }, { id: "desc" }] as never;
    const [items, totalItems] = await Promise.all([
      getPrisma().ticket.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, requesterId: true, categoryId: true, relatedSystemId: true, ticketNumber: true, summary: true, currentStatus: true, requestedPriority: true, category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } }, createdAt: true, updatedAt: true },
      }),
      getPrisma().ticket.count({ where }),
    ]);
    res.status(200).json({ items, pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) } });
  } catch (error) {
    if (error instanceof TicketRequestError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Unable to load tickets." });
  }
});

app.get("/api/tickets/:ticketId", async (req: Request, res: Response) => {
  try {
    const requesterId = parseQueryInteger(req.query.requesterId, "requesterId");
    if (!requesterId) throw new TicketRequestError(400, "requesterId is required.");
    const ticketId = parseQueryInteger(req.params.ticketId, "ticketId");
    if (!ticketId) throw new TicketRequestError(400, "ticketId is required.");

    const requester = await getPrisma().developmentRequester.findFirst({
      where: { id: requesterId, isActive: true },
      select: { id: true },
    });
    if (!requester) throw new TicketRequestError(404, "Ticket not found.");

    const ticket = await getPrisma().ticket.findFirst({
      where: { id: ticketId, requesterId },
      select: { id: true, ticketNumber: true, summary: true, description: true, requestedPriority: true, currentStatus: true, createdAt: true, updatedAt: true, requester: { select: { id: true, name: true, email: true } }, category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } } },
    });
    if (!ticket) throw new TicketRequestError(404, "Ticket not found.");

    res.status(200).json(ticket);
  } catch (error) {
    if (error instanceof TicketRequestError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Unable to load ticket." });
  }
});

app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const requesterId = parsePositiveInteger(req.body?.requesterId, "requesterId");
    const categoryId = parsePositiveInteger(req.body?.categoryId, "categoryId");
    const relatedSystemId = parsePositiveInteger(req.body?.relatedSystemId, "relatedSystemId");
    const summary = parseText(req.body?.summary, "summary", SUMMARY_MIN_LENGTH, SUMMARY_MAX_LENGTH);
    const description = parseText(req.body?.description, "description", DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH);
    const requestedPriority = req.body?.requestedPriority;

    if (typeof requestedPriority !== "string" || !REQUESTED_PRIORITIES.has(requestedPriority)) {
      throw new TicketRequestError(400, "requestedPriority must be LOW, MEDIUM, or HIGH.");
    }

    const priority = requestedPriority as RequestedPriority;

    const ticket = await getPrisma().$transaction(async (transaction) => {
      const [requester, category, relatedSystem] = await Promise.all([
        transaction.developmentRequester.findFirst({ where: { id: requesterId, isActive: true }, select: { id: true } }),
        transaction.category.findFirst({ where: { id: categoryId, isActive: true }, select: { id: true } }),
        transaction.relatedSystem.findFirst({ where: { id: relatedSystemId, isActive: true }, select: { id: true } }),
      ]);

      if (!requester || !category || !relatedSystem) {
        throw new TicketRequestError(404, "Requester or reference data is unavailable.");
      }

      const draftTicket = await transaction.ticket.create({
        data: {
          ticketNumber: `PENDING-${randomUUID()}`,
          requesterId,
          categoryId,
          relatedSystemId,
          summary,
          requestedPriority: priority,
          description,
          currentStatus: "NEW",
        },
        select: { id: true, createdAt: true },
      });

      return transaction.ticket.update({
        where: { id: draftTicket.id },
        data: { ticketNumber: formatTicketNumber(draftTicket.id, draftTicket.createdAt) },
        select: {
          id: true,
          ticketNumber: true,
          requesterId: true,
          categoryId: true,
          relatedSystemId: true,
          summary: true,
          requestedPriority: true,
          description: true,
          currentStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    res.status(201).json(ticket);
  } catch (error) {
    if (error instanceof TicketRequestError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Unable to create the ticket." });
  }
});

export default app;
