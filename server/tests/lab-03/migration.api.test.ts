import { describe, expect, it } from "vitest";
import { seedDatabase } from "../../prisma/seed-data.js";
import { makeSeedPrisma } from "./seed-test-utils.js";

describe("Lab 3 additive migration/backfill behavior", () => {
  it("creates exactly one linked User for an existing unlinked legacy requester", async () => {
    const { prisma, state } = makeSeedPrisma();

    await seedDatabase(prisma);

    const linked = state.users.rows.filter((user) => user.legacyRequesterId === 999);
    expect(linked).toHaveLength(1);
    expect(linked[0]).toMatchObject({ email: "legacy@example.test", role: "REQUESTER", mustChangePassword: true });
    expect(state.tickets.rows.find((ticket) => ticket.ticketNumber === "TKT-LEGACY")).toMatchObject({ requesterId: 999 });
  });

  it("does not create a second linked User when the backfill runs again", async () => {
    const { prisma, state } = makeSeedPrisma();

    await seedDatabase(prisma);
    const firstId = state.users.rows.find((user) => user.legacyRequesterId === 999)?.id;
    await seedDatabase(prisma);

    expect(state.users.rows.filter((user) => user.legacyRequesterId === 999)).toHaveLength(1);
    expect(state.users.rows.find((user) => user.legacyRequesterId === 999)?.id).toBe(firstId);
  });
});
