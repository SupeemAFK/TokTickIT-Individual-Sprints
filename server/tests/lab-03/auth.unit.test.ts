import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lab3.js";

describe("Lab 3 password hashing", () => {
  it("uses a unique scrypt salt and verifies only the original password", () => {
    const first = hashPassword("Lab3Pass123");
    const second = hashPassword("Lab3Pass123");

    expect(first).not.toBe(second);
    expect(verifyPassword("Lab3Pass123", first)).toBe(true);
    expect(verifyPassword("WrongPassword123", first)).toBe(false);
    expect(verifyPassword("Lab3Pass123", "not-a-valid-hash")).toBe(false);
  });
});
