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

type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

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
} finally {
  await browser.close();
}
