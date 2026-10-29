import { expect, test } from "playwright/test";
import { openAuthenticatedApp } from "../lab-03/fixtures";
import { watchForBrowserErrors } from "./browser-errors";

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

  const action = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Action #31" }) });
  await action.getByRole("button", { name: "Cancel action #31" }).click();
  await page.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(action.getByText("CANCELLED")).toBeVisible();

  await workflowStatus.selectOption("RESOLVED");
  await expect(workflowStatus).toHaveValue("RESOLVED");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(browserErrors()).toEqual([]);
});
