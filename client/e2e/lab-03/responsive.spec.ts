import { expect, test } from "playwright/test";
import { installLab3ApiMock } from "./fixtures";

test("requester screen has no horizontal overflow at desktop, tablet, or mobile widths", async ({ page }) => {
  await page.goto("/");
  await installLab3ApiMock(page, "REQUESTER");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-session"));

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await page.reload();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(fits).toBe(true);
  }
});
