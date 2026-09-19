import { expect, test } from "playwright/test";
import { installLab3ApiMock } from "./fixtures";

test("authenticated requester retains ticket creation, search, detail, and resolution behavior", async ({ page }) => {
  await page.goto("/");
  await installLab3ApiMock(page, "REQUESTER");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-session"));
  await page.reload();

  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await page.locator("#ticket-priority").selectOption("HIGH");
  await page.locator("#ticket-category").selectOption("1");
  await page.locator("#ticket-system").selectOption("2");
  await page.locator("#requester-summary").fill("VPN client cannot connect");
  await page.locator("#requester-description").fill("The VPN client fails after sign in and needs investigation.");
  await page.getByRole("button", { name: "Create ticket" }).click();
  await expect(page.getByRole("button", { name: "Open ticket TKT-2026-000012" })).toBeVisible();
  await page.getByRole("button", { name: "Open ticket TKT-2026-000012" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Problem appears resolved/i })).toBeVisible();
});
