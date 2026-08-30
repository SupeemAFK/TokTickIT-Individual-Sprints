import { describe, expect, it } from "vitest";

import { formatTicketNumber } from "../../src/ticket-number.js";

describe("formatTicketNumber", () => {
  it("uses the UTC creation year and a six-digit ticket id", () => {
    expect(formatTicketNumber(42, new Date("2026-08-25T08:00:00.000Z"))).toBe("TKT-2026-000042");
  });

  it("preserves the six-digit width for the first ticket", () => {
    expect(formatTicketNumber(1, new Date("2026-01-01T00:00:00.000Z"))).toBe("TKT-2026-000001");
  });
});
