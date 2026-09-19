import { chromium, type Page } from "playwright";
import { installLab3ApiMock } from "../e2e/lab-03/fixtures";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const baseURL = "http://127.0.0.1:5173";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../artifacts/lab-03/screenshots/final");
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;
const desktop = viewports[0];

type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
type JsonBody = Record<string, unknown>;

async function authenticatedPage(role: Role, viewport: (typeof viewports)[number]) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  await installLab3ApiMock(page, role);
  await page.goto(baseURL);
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "final-evidence-session"));
  await page.reload();
  return { context, page };
}

async function save(page: Page, relativePath: string) {
  const path = resolve(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
  console.log(path);
}

async function failRoute(page: Page, pathname: string, method: string, body: JsonBody, status = 500) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === pathname && request.method() === method) {
      await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      return;
    }
    await route.fallback();
  });
}

async function queueRoute(page: Page, mode: "empty" | "no-results" | "error") {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname !== "/api/staff/tickets" || request.method() !== "GET") {
      await route.fallback();
      return;
    }
    if (mode === "error") {
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Queue service unavailable.", code: "SERVER_ERROR" }) });
      return;
    }
    const body = mode === "empty"
      ? { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }, counts: { totalItems: 0, unassigned: 0, byStatus: {}, byItPriority: {} } }
      : { items: [], pagination: { page: 1, pageSize: 10, totalItems: 21, totalPages: 2 }, counts: { totalItems: 21, unassigned: 7, byStatus: { NEW: 4 }, byItPriority: { MEDIUM: 10 } } };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

async function captureLoginFailure(kind: "invalid" | "inactive") {
  const context = await browser.newContext({ viewport: { width: desktop.width, height: desktop.height } });
  const page = await context.newPage();
  await installLab3ApiMock(page, "REQUESTER");
  await failRoute(page, "/api/auth/login", "POST", { error: "Invalid email or password.", code: "LOGIN_FAILED" }, 401);
  await page.goto(baseURL);
  await page.getByLabel("Email").fill(kind === "inactive" ? "inactive@example.test" : "unknown@example.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("alert").waitFor();
  await save(page, `authentication/login-${kind}-desktop.png`);
  await context.close();
}

async function captureInvalidPassword() {
  const context = await browser.newContext({ viewport: { width: desktop.width, height: desktop.height } });
  const page = await context.newPage();
  await installLab3ApiMock(page, "REQUESTER");
  await page.goto(baseURL);
  await page.getByLabel("Email").fill("ada@example.test");
  await page.getByLabel("Password").fill("Lab3Pass123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("heading", { name: "Change your initial password" }).waitFor();
  await page.getByLabel("New password").fill("weak");
  await page.getByLabel("Confirm password").fill("different");
  await page.getByRole("button", { name: "Save password" }).click();
  await page.getByRole("alert").waitFor();
  await save(page, "authentication/change-password-invalid-desktop.png");
  await context.close();
}

async function captureQueueState(mode: "empty" | "no-results" | "error") {
  const { context, page } = await authenticatedPage("IT_STAFF", desktop);
  await queueRoute(page, mode);
  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();
  if (mode === "error") await page.getByRole("alert").waitFor();
  if (mode === "empty") await page.getByText("No tickets in the queue.").waitFor();
  if (mode === "no-results") await page.getByText("No matching tickets.").waitFor();
  await save(page, `staff-queue/queue-${mode === "error" ? "failure" : mode}-desktop.png`);
  await context.close();
}

async function captureStaffCommentFailure() {
  const { context, page } = await authenticatedPage("IT_STAFF", desktop);
  await failRoute(page, "/api/staff/tickets/12/comments", "POST", { error: "Comment service unavailable.", code: "SERVER_ERROR" });
  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();
  await page.getByRole("button", { name: /Open TKT-/ }).first().click();
  await page.getByRole("heading", { name: "Staff Ticket Detail" }).waitFor();
  await page.getByRole("textbox", { name: "Staff public comment" }).fill("This comment will fail safely.");
  await page.getByRole("button", { name: "Comment" }).click();
  await page.getByRole("alert").waitFor();
  await save(page, "staff-ticket-detail/staff-ticket-comment-failure-desktop.png");
  await context.close();
}

async function captureAdminListFailure() {
  const { context, page } = await authenticatedPage("ADMINISTRATOR", desktop);
  await failRoute(page, "/api/admin/users", "GET", { error: "User service unavailable.", code: "SERVER_ERROR" });
  await page.getByRole("button", { name: "User Management" }).click();
  await page.getByRole("heading", { name: "User Management" }).waitFor();
  await page.getByRole("alert").waitFor();
  await save(page, "user-management/user-management-failure-desktop.png");
  await context.close();
}

async function captureAdminConflict() {
  const { context, page } = await authenticatedPage("ADMINISTRATOR", desktop);
  await failRoute(page, "/api/admin/users", "POST", { error: "Email is already in use.", code: "CONFLICT" }, 409);
  await page.getByRole("button", { name: "User Management" }).click();
  await page.getByRole("heading", { name: "User Management" }).waitFor();
  await page.getByLabel("Name", { exact: true }).last().fill("Duplicate User");
  await page.getByLabel("Email", { exact: true }).last().fill("admin@example.test");
  await page.getByLabel("Initial password").fill("InitialAdmin123");
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("alert").waitFor();
  await save(page, "user-management/user-management-conflict-desktop.png");
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    await installLab3ApiMock(page, "REQUESTER");
    await page.goto(baseURL);
    await page.getByLabel("Email").fill("ada@example.test");
    await page.getByLabel("Password").fill("Lab3Pass123");
    await save(page, `authentication/login-${viewport.name}.png`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("heading", { name: "Change your initial password" }).waitFor();
    await save(page, `authentication/change-password-${viewport.name}.png`);
    await context.close();
  }

  for (const viewport of viewports) {
    const { context, page } = await authenticatedPage("IT_STAFF", viewport);
    await page.getByRole("button", { name: "Ticket Queue" }).click();
    await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();
    await save(page, `staff-queue/ticket-queue-${viewport.name}.png`);
    await context.close();
  }

  for (const viewport of viewports) {
    const { context, page } = await authenticatedPage("IT_STAFF", viewport);
    await page.getByRole("button", { name: "Ticket Queue" }).click();
    await page.getByRole("heading", { name: "Ticket Queue" }).waitFor();
    const openButton = viewport.width >= 992
      ? page.getByRole("button", { name: /Open TKT-/ }).first()
      : page.locator(".queue-card button").first();
    await openButton.click();
    await page.getByRole("heading", { name: "Staff Ticket Detail" }).waitFor();
    await save(page, `staff-ticket-detail/staff-ticket-detail-${viewport.name}.png`);
    await context.close();
  }

  for (const viewport of viewports) {
    const { context, page } = await authenticatedPage("ADMINISTRATOR", viewport);
    await page.getByRole("button", { name: "User Management" }).click();
    await page.getByRole("heading", { name: "User Management" }).waitFor();
    await save(page, `user-management/user-management-${viewport.name}.png`);
    await context.close();
  }

  await captureLoginFailure("invalid");
  await captureLoginFailure("inactive");
  await captureInvalidPassword();
  await captureQueueState("empty");
  await captureQueueState("no-results");
  await captureQueueState("error");
  await captureStaffCommentFailure();
  await captureAdminListFailure();
  await captureAdminConflict();
} finally {
  await browser.close();
}
