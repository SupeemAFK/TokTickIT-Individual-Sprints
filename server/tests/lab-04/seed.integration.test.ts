import { describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed-data.js";
import { makeSeedPrisma } from "../lab-03/seed-test-utils.js";

type SeedRow = Record<string, any>;

const seededTicket = (state: ReturnType<typeof makeSeedPrisma>["state"], ticketNumber: string) =>
  state.tickets.rows.find((ticket) => ticket.ticketNumber === ticketNumber);

describe("Lab 4 Action Taken seed", () => {
  it("covers zero, one, and multiple actions with distinct owner, assignee, and performer identities", async () => {
    const { prisma, state } = makeSeedPrisma();

    await seedDatabase(prisma);

    const noActionTicket = seededTicket(state, "TKT-2026-000902");
    const oneActionTicket = seededTicket(state, "TKT-2026-000903");
    const multipleActionTicket = seededTicket(state, "TKT-2026-000901");
    const actionsFor = (ticket: SeedRow | undefined) => state.actions.rows.filter((action) => action.ticketId === ticket?.id);

    expect(noActionTicket).toBeDefined();
    expect(actionsFor(noActionTicket)).toHaveLength(0);
    expect(actionsFor(oneActionTicket)).toHaveLength(1);
    expect(actionsFor(multipleActionTicket)).toHaveLength(2);

    const distinctAction = actionsFor(multipleActionTicket).find((action) => action.assignedToUserId !== null);
    const owner = state.users.rows.find((user) => user.id === multipleActionTicket?.ownerUserId);
    const assignee = state.users.rows.find((user) => user.id === distinctAction?.assignedToUserId);
    const performer = state.users.rows.find((user) => user.id === distinctAction?.performedByUserId);
    expect(owner?.email).toBe("arun.support@toktickit.test");
    expect(assignee?.email).toBe("chai.support@toktickit.test");
    expect(performer?.email).toBe("bua.support@toktickit.test");
    expect(new Set([owner?.id, assignee?.id, performer?.id]).size).toBe(3);
  });

  it("supplies active and terminal action states, follow-up data, and resolved dashboard dates", async () => {
    const { prisma, state } = makeSeedPrisma();

    await seedDatabase(prisma);

    expect(new Set(state.actions.rows.map((action) => action.status))).toEqual(new Set(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]));
    expect(state.actions.rows.some((action) => action.followUpRequired && action.followUpNote?.trim())).toBe(true);
    expect(state.actions.rows.every((action) => /^[0-9a-f]{64}$/.test(action.idempotencyPayloadHash))).toBe(true);
    expect(seededTicket(state, "TKT-2026-000903")?.resolvedAt).toBeInstanceOf(Date);
    expect(seededTicket(state, "TKT-2026-000907")?.resolvedAt).toBeInstanceOf(Date);
    expect(seededTicket(state, "TKT-2026-000902")?.resolvedAt).toBeNull();
  });

  it("keeps action identities and row counts stable on repeated runs", async () => {
    const { prisma, state } = makeSeedPrisma();

    await seedDatabase(prisma);
    const firstIds = new Map(state.actions.rows.map((action) => [action.idempotencyKey, action.id]));
    const firstActionCount = state.actions.rows.length;
    const firstTicketCount = state.tickets.rows.length;

    await seedDatabase(prisma);

    expect(state.actions.rows).toHaveLength(firstActionCount);
    expect(state.tickets.rows).toHaveLength(firstTicketCount);
    for (const [key, id] of firstIds) {
      expect(state.actions.rows.find((action) => action.idempotencyKey === key)?.id).toBe(id);
    }
  });
});
