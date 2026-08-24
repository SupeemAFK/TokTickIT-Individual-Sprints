import { describe, expect, it, vi } from "vitest";
import { developmentRequesters, relatedSystems, seedDatabase, ticketCategories } from "../../prisma/seed-data.js";

describe("Lab 2 seed data", () => {
  it("defines the required active and inactive reference data", () => {
    expect(ticketCategories).toEqual(["Account and Access", "Hardware", "Software", "Network"]);
    expect(relatedSystems).toHaveLength(6);
    expect(new Set(relatedSystems).size).toBe(6);
    expect(developmentRequesters.filter((requester) => requester.isActive)).toHaveLength(4);
    expect(developmentRequesters.filter((requester) => !requester.isActive)).toHaveLength(1);
  });

  it("uses upserts so rerunning the seed does not create duplicates", async () => {
    const prisma = {
      category: { upsert: vi.fn().mockResolvedValue({}) },
      relatedSystem: { upsert: vi.fn().mockResolvedValue({}) },
      developmentRequester: { upsert: vi.fn().mockResolvedValue({}) },
    };

    await seedDatabase(prisma);
    await seedDatabase(prisma);

    expect(prisma.category.upsert).toHaveBeenCalledTimes(ticketCategories.length * 2);
    expect(prisma.relatedSystem.upsert).toHaveBeenCalledTimes(relatedSystems.length * 2);
    expect(prisma.developmentRequester.upsert).toHaveBeenCalledTimes(developmentRequesters.length * 2);
    expect(prisma.developmentRequester.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "nicha.somchai@toktickit.test" } }));
  });
});
