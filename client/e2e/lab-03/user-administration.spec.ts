import { expect, test } from "playwright/test";
import { installLab3ApiMock } from "./fixtures";

test("administrator user management and forbidden requester navigation", async ({ page }) => {
  await page.goto("/");
  await installLab3ApiMock(page, "ADMINISTRATOR");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-session"));
  await page.reload();

  await page.getByRole("button", { name: "User Management" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
  await page.getByLabel("Search name or email").fill("ada");
  await expect(page.getByLabel("Name for ada@example.test")).toBeVisible();
  await expect(page.getByLabel("Initial password")).toHaveAttribute("minlength", "12");

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(".user-card").first()).toBeVisible();

  await page.goto("/");
  await installLab3ApiMock(page, "REQUESTER");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-session"));
  await page.reload();
  await expect(page.getByRole("button", { name: "User Management" })).toHaveCount(0);
});
