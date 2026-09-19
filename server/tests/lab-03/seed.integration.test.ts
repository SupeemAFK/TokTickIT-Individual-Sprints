import { describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed-data.js";
import { makeSeedPrisma } from "./seed-test-utils.js";

describe("Lab 3 idempotent seed behavior", () => {
  it("creates varied workflow data with owners, comments, and notes", async () => {
    const { prisma, state } = makeSeedPrisma();

    await seedDatabase(prisma);

    expect(state.users.rows.filter((user) => user.role === "REQUESTER" && user.isActive).length).toBeGreaterThanOrEqual(4);
    expect(state.users.rows.filter((user) => user.role === "IT_STAFF" && user.isActive)).toHaveLength(3);
    expect(state.users.rows.filter((user) => user.role === "ADMINISTRATOR" && user.isActive)).toHaveLength(1);
    expect(state.tickets.rows.length).toBeGreaterThanOrEqual(13); // 12 workflow tickets plus the preserved Lab 2 legacy ticket.
    expect(state.tickets.rows.some((ticket) => ticket.ownerUserId === null)).toBe(true);
    expect(state.tickets.rows.some((ticket) => ticket.ownerUserId !== null)).toBe(true);
    for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"]) expect(state.tickets.rows.some((ticket) => ticket.currentStatus === status)).toBe(true);
    for (const priority of ["LOW", "MEDIUM", "HIGH"]) expect(state.tickets.rows.some((ticket) => ticket.requestedPriority === priority)).toBe(true);
    expect(state.comments.rows.length).toBeGreaterThanOrEqual(8);
    expect(state.notes.rows.length).toBeGreaterThan(0);
  });

  it("preserves seeded password hashes and row counts on a second run", async () => {
    const { prisma, state } = makeSeedPrisma();

    await seedDatabase(prisma);
    const firstCounts = {
      users: state.users.rows.length,
      tickets: state.tickets.rows.length,
      comments: state.comments.rows.length,
      notes: state.notes.rows.length,
    };
    const firstHashes = new Map(state.users.rows.map((user) => [user.email, user.passwordHash]));

    await seedDatabase(prisma);

    expect({ users: state.users.rows.length, tickets: state.tickets.rows.length, comments: state.comments.rows.length, notes: state.notes.rows.length }).toEqual(firstCounts);
    for (const [email, passwordHash] of firstHashes) expect(state.users.rows.find((user) => user.email === email)?.passwordHash).toBe(passwordHash);
  });
});
