import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "playwright/test";
import { openAuthenticatedApp } from "../lab-03/fixtures";

const screenshotDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "../../../artifacts/lab-04/screenshots/actions-taken");

async function openStaffDetail(page: Parameters<typeof openAuthenticatedApp>[0]) {
  await openAuthenticatedApp(page, "IT_STAFF");
  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await page.getByRole("button", { name: "Open TKT-2026-000012" }).first().click();
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
}

test("Staff can record, assign, edit, complete, and cancel Actions Taken", async ({ page }) => {
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openStaffDetail(page);

  const firstAction = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Action #31" }) });
  await expect(firstAction.getByText("Reviewed the VPN client settings.")).toBeVisible();
  await expect(page.getByLabel("Assigned To")).toHaveCount(0);
  const addAction = page.getByRole("button", { name: "Add Action Taken" });
  await addAction.focus();
  await page.keyboard.press("Tab");
  const startAction = firstAction.getByRole("button", { name: "Start action #31" });
  await expect(startAction).toBeFocused();
  expect(await startAction.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await firstAction.getByRole("button", { name: "Edit action #31" }).click();
  await page.getByLabel("Description").fill("Updated the VPN client profile.");
  await page.getByLabel("Result").fill("The requester can connect again.");
  await page.getByLabel("Assigned To").selectOption("2");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(firstAction.getByText("Updated the VPN client profile.")).toBeVisible();
  await expect(firstAction.getByText("Admin One")).toBeVisible();
  await expect(firstAction.getByText("IT Staff One")).toBeVisible();
  await expect(page.getByLabel("Owner", { exact: true })).toHaveValue("");

  await firstAction.getByRole("button", { name: "Start action #31" }).click();
  await expect(firstAction.getByText("IN PROGRESS")).toBeVisible();
  await firstAction.getByRole("button", { name: "Complete action #31" }).click();
  await expect(firstAction.getByText("COMPLETED")).toBeVisible();
  await expect(firstAction.getByRole("button", { name: "Edit action #31" })).toHaveCount(0);

  await page.getByRole("button", { name: "Add Action Taken" }).click();
  await page.getByLabel("Action Date/Time").fill("2026-10-29T10:30");
  await page.getByLabel("Description").fill("Replaced the VPN profile.");
  await page.getByLabel("Result").fill("New profile imported successfully.");
  await page.getByLabel("Assigned To").selectOption("4");
  await page.getByRole("button", { name: "Record action" }).click();
  const secondAction = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Action #32" }) });
  await expect(secondAction.getByText("Replaced the VPN profile.")).toBeVisible();
  await expect(secondAction.getByText("IT Staff One")).toHaveCount(2);
  await expect(secondAction.getByRole("button", { name: "Start action #32" })).toBeEnabled();

  for (const viewport of [
    { width: 1440, height: 1000, name: "actions-taken-1440.png" },
    { width: 768, height: 1024, name: "actions-taken-768.png" },
    { width: 375, height: 812, name: "actions-taken-375.png" },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
    await page.screenshot({ path: resolve(screenshotDirectory, viewport.name), fullPage: true });
  }

  await secondAction.getByRole("button", { name: "Cancel action #32" }).click();
  await secondAction.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(secondAction.getByText("CANCELLED")).toBeVisible();
  await expect(secondAction.getByRole("button", { name: "Edit action #32" })).toHaveCount(0);
});

test("Requester can read own action history without staff controls", async ({ page }) => {
  await openAuthenticatedApp(page, "REQUESTER");
  await page.getByRole("button", { name: "Open ticket TKT-2026-000012" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
  await expect(page.getByText("Reviewed the VPN client settings.")).toBeVisible();
  await expect(page.getByText("The profile is current.")).toBeVisible();
  const action = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Action #31" }) });
  await expect(action.getByText("IT Staff One")).toHaveCount(2);
  await expect(page.getByRole("button", { name: /Add Action Taken/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Edit action/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Complete action/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Cancel action/ })).toHaveCount(0);
  await expect(page.getByText("No internal notes.")).toHaveCount(0);
});
