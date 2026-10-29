import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "playwright/test";
import type { Page } from "playwright/test";
import { openAuthenticatedApp } from "../lab-03/fixtures";
import { watchForBrowserErrors } from "./browser-errors";

const screenshotDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../../artifacts/lab-04/screenshots/ticket-resolution");
const viewports = [
  { width: 1440, height: 1000, name: "1440" },
  { width: 768, height: 1024, name: "768" },
  { width: 375, height: 812, name: "375" },
];

async function capture(page: Page, prefix: string) {
  mkdirSync(screenshotDirectory, { recursive: true });
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.mouse.move(0, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: resolve(screenshotDirectory, `${prefix}-${viewport.name}.png`), fullPage: true, animations: "disabled" });
  }
}

test("active Actions Taken block Ticket resolution until completed or cancelled", async ({ page }) => {
  const browserErrors = watchForBrowserErrors(page, (message) => message.includes("status of 409 (Conflict)"));
  await openAuthenticatedApp(page, "IT_STAFF");
  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await page.getByRole("button", { name: "Open TKT-2026-000012" }).first().click();
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();

  const workflowStatus = page.getByRole("combobox", { name: "Workflow status" });
  await expect(workflowStatus).toHaveValue("NEW");
  await workflowStatus.selectOption("IN_PROGRESS");
  await expect(workflowStatus).toHaveValue("IN_PROGRESS");

  await workflowStatus.selectOption("RESOLVED");
  await expect(page.getByRole("alert")).toContainText("Complete or cancel all active Actions Taken before resolving this Ticket.");
  await expect(workflowStatus).toHaveValue("IN_PROGRESS");
  await capture(page, "resolution-blocked-by-active-action");

  const action = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Action #31" }) });
  await action.getByRole("button", { name: "Cancel action #31" }).click();
  await page.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(action.getByText("CANCELLED")).toBeVisible();

  await workflowStatus.selectOption("RESOLVED");
  await expect(workflowStatus).toHaveValue("RESOLVED");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await capture(page, "resolution-after-action-cancelled");
  expect(browserErrors()).toEqual([]);
});
