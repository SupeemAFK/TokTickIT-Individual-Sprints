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
