import { expect, test } from "playwright/test";
import { installLab3ApiMock } from "./fixtures";

test("login, mandatory first-login change, authenticated shell, and logout", async ({ page }) => {
  await page.goto("/");
  await installLab3ApiMock(page, "REQUESTER");

  await page.getByLabel("Email").fill("ada@example.test");
  await page.getByLabel("Password").fill("Lab3Pass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Change your initial password" })).toBeVisible();

  await page.getByLabel("New password").fill("NewValidPass123");
  await page.getByLabel("Confirm password").fill("NewValidPass123");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  await expect(page.getByText(/Ada Requester/)).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "TokTickIT Login" })).toBeVisible();
});
