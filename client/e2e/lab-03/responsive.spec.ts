import { expect, test } from "playwright/test";
import { openAuthenticatedApp } from "./fixtures";

const viewports = [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }];

test("Requester, Staff Queue, and Administrator screens fit desktop, tablet, and mobile widths", async ({ page }) => {
  for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await openAuthenticatedApp(page, role);
      if (role === "IT_STAFF") {
        await page.getByRole("button", { name: "Ticket Queue" }).click();
        await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
      }
      if (role === "ADMINISTRATOR") {
        await page.getByRole("button", { name: "User Management" }).click();
        await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  }
});
