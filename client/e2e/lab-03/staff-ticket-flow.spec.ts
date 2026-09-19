import { expect, test } from "playwright/test";
import { installLab3ApiMock } from "./fixtures";

test("staff queue and ticket detail workflow", async ({ page }) => {
  await page.goto("/");
  await installLab3ApiMock(page, "IT_STAFF");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-session"));
  await page.reload();

  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await page.getByLabel("IT priority").selectOption("HIGH");
  await page.getByRole("button", { name: "Open TKT-2026-000012" }).first().click();

  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Internal notes" })).toBeVisible();
  await page.getByLabel("Staff public comment").fill("Investigating the VPN connection.");
  await page.getByRole("button", { name: "Comment" }).click();
  await expect(page.getByRole("button", { name: "Download attachment" })).toBeVisible();
});
