import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "playwright/test";
import { openAuthenticatedApp } from "../lab-03/fixtures";
import { watchForBrowserErrors } from "./browser-errors";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../artifacts/lab-04/screenshots");
const actionCases = resolve(root, "actions-taken/cases");
const dashboardCases = resolve(root, "dashboard-states");
const viewportCases = [
  { width: 1440, height: 1000, name: "1440" },
  { width: 768, height: 1024, name: "768" },
  { width: 375, height: 812, name: "375" },
];

async function openStaffDetail(page: Page) {
  await openAuthenticatedApp(page, "IT_STAFF");
  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await page.getByRole("button", { name: "Open TKT-2026-000012" }).first().click();
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
}

async function capture(page: Page, directory: string, prefix: string, sizes = [viewportCases[0]], clearFocus = true) {
  mkdirSync(directory, { recursive: true });
  for (const viewport of sizes) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.mouse.move(0, 0);
    if (clearFocus) await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: resolve(directory, `${prefix}-${viewport.name}.png`), fullPage: true, animations: "disabled" });
  }
}

test("Action Taken form and lifecycle evidence: create, edit, progress, complete, and cancel", async ({ page }) => {
  const browserErrors = watchForBrowserErrors(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openStaffDetail(page);

  const firstAction = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Action #31" }) });
  const addAction = page.getByRole("button", { name: "Add Action Taken" });
  await addAction.focus();
  await page.keyboard.press("Tab");
  const startAction = firstAction.getByRole("button", { name: "Start action #31" });
  await expect(startAction).toBeFocused();
  expect(await startAction.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
  await capture(page, actionCases, "staff-action-keyboard-focus", [viewportCases[0]], false);

  await firstAction.getByRole("button", { name: "Edit action #31" }).click();
  await expect(page.getByRole("heading", { name: "Edit Action Taken" })).toBeVisible();
  await page.getByLabel("Description").fill("Updated the VPN client profile.");
  await page.getByLabel("Result").fill("The requester can connect again.");
  await page.getByLabel("Assigned To").selectOption("2");
  await capture(page, actionCases, "staff-action-edit-form");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(firstAction.getByText("Updated the VPN client profile.")).toBeVisible();
  await expect(page.getByText("Action Taken updated.")).toBeVisible();
  await capture(page, actionCases, "staff-action-edit-success");

  await firstAction.getByRole("button", { name: "Start action #31" }).click();
  await expect(firstAction.getByText("IN PROGRESS")).toBeVisible();
  await expect(page.getByText("Action Taken moved to in progress.")).toBeVisible();
  await capture(page, actionCases, "staff-action-in-progress");
  await firstAction.getByRole("button", { name: "Complete action #31" }).click();
  await expect(firstAction.getByText("COMPLETED")).toBeVisible();
  await expect(page.getByText("Action Taken completed.")).toBeVisible();
  await expect(firstAction.getByRole("button", { name: "Edit action #31" })).toHaveCount(0);
  await capture(page, actionCases, "staff-action-completed");

  await page.getByRole("button", { name: "Add Action Taken" }).click();
  await page.getByLabel("Action Date/Time").fill("2026-10-29T10:30");
  await page.getByLabel("Description").fill("Replaced the VPN profile.");
  await page.getByLabel("Result").fill("New profile imported successfully.");
  await page.getByLabel("Assigned To").selectOption("4");
  await page.getByLabel("Follow-Up Required").check();
  await page.getByLabel("Follow-up note").fill("Confirm the connection after the next restart.");
  await page.getByLabel("Attachment notes").fill("See vpn-error.png for the original report.");
  await capture(page, actionCases, "staff-action-create-form", viewportCases);
  await page.getByRole("button", { name: "Record action" }).click();
  const secondAction = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Action #32" }) });
  await expect(secondAction.getByText("Replaced the VPN profile.")).toBeVisible();
  await expect(secondAction.getByText("Confirm the connection after the next restart.")).toBeVisible();
  await expect(page.getByText("Action Taken recorded.")).toBeVisible();
  await capture(page, actionCases, "staff-action-recorded");

  await secondAction.getByRole("button", { name: "Cancel action #32" }).click();
  await expect(secondAction.getByRole("group", { name: "Confirm cancellation of action 32" })).toBeVisible();
  await capture(page, actionCases, "staff-action-cancel-confirmation");
  await secondAction.getByRole("button", { name: "Confirm cancellation" }).click();
  await expect(secondAction.getByText("CANCELLED")).toBeVisible();
  await expect(page.getByText("Action Taken cancelled.")).toBeVisible();
  await expect(secondAction.getByRole("button", { name: "Edit action #32" })).toHaveCount(0);
  await capture(page, actionCases, "staff-action-cancelled");
  expect(browserErrors()).toEqual([]);
});

test("Requester Action Taken history is read-only at all target viewports", async ({ page }) => {
  const browserErrors = watchForBrowserErrors(page);
  await openAuthenticatedApp(page, "REQUESTER");
  await page.getByRole("button", { name: "Open ticket TKT-2026-000012" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actions Taken" })).toBeVisible();
  await expect(page.getByText("Reviewed the VPN client settings.")).toBeVisible();
  await expect(page.getByText("The profile is current.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Add Action Taken/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Edit action/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Complete action/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Cancel action/ })).toHaveCount(0);
  await expect(page.getByText("No internal notes.")).toHaveCount(0);
  await capture(page, actionCases, "requester-action-history-read-only", viewportCases);
  expect(browserErrors()).toEqual([]);
});

test("Action Taken empty state and safe loading failure are captured", async ({ page }) => {
  mkdirSync(actionCases, { recursive: true });
  await openAuthenticatedApp(page, "IT_STAFF");
  await page.route("**/api/tickets/12/actions", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }));
  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await page.getByRole("button", { name: "Open TKT-2026-000012" }).first().click();
  await expect(page.getByText("No Actions Taken yet.")).toBeVisible();
  await capture(page, actionCases, "staff-action-empty");

  await page.reload();
  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await page.route("**/api/tickets/12/actions", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Action history is temporarily unavailable. Please retry.", code: "SERVER_ERROR" }) }));
  await page.getByRole("button", { name: "Open TKT-2026-000012" }).first().click();
  await expect(page.getByRole("alert")).toContainText("Action history is temporarily unavailable. Please retry.");
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await capture(page, actionCases, "staff-action-load-failure");
});

test("Recoverable create failure preserves values and shows a safe retry message", async ({ page }) => {
  await openStaffDetail(page);
  await page.route("**/api/staff/tickets/12/actions", (route) => route.request().method() === "POST"
    ? route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Assigned user is inactive or unavailable.", code: "INVALID_ASSIGNEE" }) })
    : route.fallback());
  await page.getByRole("button", { name: "Add Action Taken" }).click();
  await page.getByLabel("Action Date/Time").fill("2026-10-29T10:30");
  await page.getByLabel("Description").fill("Reassign the VPN profile check.");
  await page.getByLabel("Result").fill("Waiting for an active assignee.");
  await page.getByLabel("Assigned To").selectOption("4");
  await page.getByRole("button", { name: "Record action" }).click();
  await expect(page.getByRole("alert")).toContainText("Assigned user is inactive or unavailable.");
  await expect(page.getByLabel("Description")).toHaveValue("Reassign the VPN profile check.");
  await expect(page.getByLabel("Result")).toHaveValue("Waiting for an active assignee.");
  await capture(page, actionCases, "staff-action-create-failure-values-preserved");
});

const emptyDashboard = {
  asOf: "2026-10-30T00:00:00.000Z",
  resolvedLast7DaysWindow: { from: "2026-10-23T00:00:00.000Z", to: "2026-10-30T00:00:00.000Z" },
  metrics: {
    activeTickets: 0,
    unassignedActiveTickets: 0,
    myActiveTickets: 0,
    activeByStatus: { NEW: 0, OPEN: 0, IN_PROGRESS: 0, WAITING_FOR_REQUESTER: 0, REOPENED: 0 },
    activeByItPriority: { LOW: 0, MEDIUM: 0, HIGH: 0 },
    waitingForRequester: 0,
    resolvedLast7Days: 0,
    myActiveActions: 0,
  },
  myActions: [],
  recentTickets: [],
};

test("Staff Dashboard empty and loading states are captured", async ({ page }) => {
  await openAuthenticatedApp(page, "IT_STAFF");
  await page.route("**/api/staff/dashboard", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyDashboard) }));
  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(page.getByText("No active Actions Taken are assigned to you.")).toBeVisible();
  await expect(page.getByText("No recently updated tickets.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Active tickets: 0. View active queue" })).toBeVisible();
  await capture(page, dashboardCases, "staff-dashboard-empty");

  await page.reload();
  await expect(page.getByRole("button", { name: "Ticket Queue" })).toBeVisible();
  await page.route("**/api/staff/dashboard", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(emptyDashboard) });
  });
  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(page.getByRole("status")).toContainText("Loading dashboard");
  await capture(page, dashboardCases, "staff-dashboard-loading");
  await expect(page.getByRole("heading", { name: "Active tickets by status" })).toBeVisible();
});

test("Staff Dashboard forbidden and safe server failure states are captured", async ({ page }) => {
  await openAuthenticatedApp(page, "IT_STAFF");
  await page.route("**/api/staff/dashboard", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Forbidden.", code: "FORBIDDEN" }) }));
  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(page.getByRole("alert")).toContainText("You do not have permission to view this dashboard.");
  await capture(page, dashboardCases, "staff-dashboard-forbidden");

  await page.reload();
  await expect(page.getByRole("button", { name: "Ticket Queue" })).toBeVisible();
  await page.route("**/api/staff/dashboard", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Dashboard is temporarily unavailable. Please retry.", code: "SERVER_ERROR" }) }));
  await page.getByRole("button", { name: "Dashboard" }).click();
  await expect(page.getByRole("alert")).toContainText("Dashboard is temporarily unavailable. Please retry.");
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await capture(page, dashboardCases, "staff-dashboard-safe-failure");
});
