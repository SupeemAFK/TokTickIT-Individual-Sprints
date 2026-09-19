import { expect, test } from "playwright/test";
import { openAuthenticatedApp } from "./fixtures";

test("authenticated Requester retains creation, detail, Public Comment, and resolution behavior", async ({ page }) => {
  await openAuthenticatedApp(page, "REQUESTER");

  await page.locator("#ticket-priority").selectOption("HIGH");
  await page.locator("#ticket-category").selectOption("1");
  await page.locator("#ticket-system").selectOption("2");
  await page.locator("#requester-summary").fill("VPN client cannot connect");
  await page.locator("#requester-description").fill("The VPN client fails after sign in and needs investigation.");
  await page.getByRole("button", { name: "Create ticket" }).click();
  await expect(page.getByRole("button", { name: "Open ticket TKT-2026-000020" })).toBeVisible();

  await page.getByRole("button", { name: "Open ticket TKT-2026-000020" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await page.getByRole("textbox", { name: "Public comment" }).fill("The issue is still visible.");
  await page.getByRole("button", { name: "Comment" }).click();
  await expect(page.getByText("The issue is still visible.")).toBeVisible();
  await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
  await expect(page.getByRole("status")).toContainText("appears resolved");
  await expect(page.getByText("Internal notes")).not.toBeVisible();
});
