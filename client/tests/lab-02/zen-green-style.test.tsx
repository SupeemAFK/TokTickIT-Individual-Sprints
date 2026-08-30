import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/app.css"), "utf8");
describe("Zen Green responsive foundation", () => {
  it("uses the approved color tokens and visible green keyboard focus", () => {
    expect(css).toContain("--toktickit-primary: #006B3C");
    expect(css).toContain("--toktickit-secondary: #0B7A46");
    expect(css).toContain("--toktickit-pale: #EAF6EF");
    expect(css).toContain("outline: 3px solid var(--toktickit-secondary)");
  });
  it("uses responsive layout rules without globally hiding overflow", () => {
    expect(css).toContain("@media (max-width: 767.98px)");
    expect(css).not.toContain("body { overflow-x: hidden; }");
  });
});
