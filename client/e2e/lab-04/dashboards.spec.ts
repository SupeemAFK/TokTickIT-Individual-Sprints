import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "playwright/test";
import { openAuthenticatedApp } from "../lab-03/fixtures";
import { watchForBrowserErrors } from "./browser-errors";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../artifacts/lab-04/screenshots");

async function captureResponsiveDashboard(page: Parameters<typeof openAuthenticatedApp>[0], heading: string, directory: string, prefix: string) {
  mkdirSync(directory, { recursive: true });
  for (const viewport of [
    { width: 1440, height: 1000, suffix: "1440" },
    { width: 768, height: 1024, suffix: "768" },
    { width: 375, height: 812, suffix: "375" },
  ]) {
    await page.setViewportSize(viewport);
    await page.mouse.move(0, 0);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: resolve(directory, `${prefix}-${viewport.suffix}.png`), fullPage: true, animations: "disabled" });
  }
}

test("Requester dashboard shows own work and opens authorized Ticket Detail", async ({ page }) => {
  const browserErrors = watchForBrowserErrors(page);
  await openAuthenticatedApp(page, "REQUESTER");
  const dashboardButton = page.getByRole("button", { name: "Dashboard" });
  await dashboardButton.focus();
  expect(await dashboardButton.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await dashboardButton.click();
  await expect(dashboardButton).toHaveAttribute("aria-current", "page");
  await dashboardButton.evaluate((button) => (button as HTMLButtonElement).blur());
  await page.mouse.move(0, 0);
  await expect(dashboardButton).toHaveCSS("background-color", "rgb(0, 107, 60)");
  await expect(dashboardButton).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.getByRole("button", { name: /Active tickets:/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recently updated tickets" })).toBeVisible();

  await captureResponsiveDashboard(page, "Requester Dashboard", resolve(root, "requester-dashboard"), "requester-dashboard");
  await page.getByRole("button", { name: "Open ticket TKT-2026-000012" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await expect(page.getByText("VPN cannot connect")).toBeVisible();
  expect(browserErrors()).toEqual([]);
});

test("Staff dashboard shows operational work and opens its Ticket Detail", async ({ page }) => {
  const browserErrors = watchForBrowserErrors(page);
  await openAuthenticatedApp(page, "IT_STAFF");
  const dashboardButton = page.getByRole("button", { name: "Dashboard" });
  await dashboardButton.click();
  await expect(dashboardButton).toHaveAttribute("aria-current", "page");
  await dashboardButton.evaluate((button) => (button as HTMLButtonElement).blur());
  await page.mouse.move(0, 0);
  await expect(dashboardButton).toHaveCSS("background-color", "rgb(0, 107, 60)");
  await expect(dashboardButton).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.getByRole("heading", { name: "Active tickets by status" })).toBeVisible();
  await expect(page.getByText("Reviewed the VPN client settings.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recently updated tickets" })).toBeVisible();

  await captureResponsiveDashboard(page, "Staff Dashboard", resolve(root, "staff-dashboard"), "staff-dashboard");
  await page.getByRole("button", { name: "Open ticket TKT-2026-000012 for action 31" }).click();
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
  await expect(page.getByText("VPN cannot connect")).toBeVisible();
  expect(browserErrors()).toEqual([]);
});
