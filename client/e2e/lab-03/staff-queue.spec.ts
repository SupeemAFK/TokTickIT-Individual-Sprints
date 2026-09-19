import { expect, test, type Page, type Route } from "playwright/test";

const staff = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true };
const category = { id: 1, name: "Network" };
const system = { id: 2, name: "VPN" };
const queueItem = {
  id: 12,
  ticketNumber: "TKT-2026-000012",
  summary: "VPN cannot connect",
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  owner: null,
  requester: { id: 8, name: "Ada Requester" },
  category,
  relatedSystem: system,
  createdAt: "2026-09-19T08:00:00.000Z",
  updatedAt: "2026-09-19T09:00:00.000Z",
};

async function installQueueMock(page: Page) {
  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/auth/me") return json({ user: staff, mustChangePassword: false });
    if (url.pathname === "/api/staff/users") return json([staff]);
    if (url.pathname === "/api/categories") return json([category]);
    if (url.pathname === "/api/staff/tickets" && request.method() === "GET") {
      return json({
        items: [queueItem],
        pagination: { page: Number(url.searchParams.get("page") ?? 1), pageSize: Number(url.searchParams.get("pageSize") ?? 10), totalItems: 1, totalPages: 1 },
        counts: { totalItems: 1, unassigned: 1, byStatus: { IN_PROGRESS: 1 }, byItPriority: { MEDIUM: 1 } },
      });
    }
    return json({});
  });
}

async function openQueue(page: Page) {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-staff-session"));
  await page.reload();
  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await expect(page.locator(".queue-card").first()).toBeAttached();
}

test.beforeEach(async ({ page }) => installQueueMock(page));

test("staff queue uses the correct representation without horizontal overflow at desktop, tablet, and mobile widths", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await openQueue(page);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const table = page.locator("table.d-none.d-lg-table");
    const cards = page.locator(".d-lg-none .queue-card");
    if (viewport.width >= 992) {
      await expect(table).toBeVisible();
      await expect(cards.first()).toBeHidden();
    } else {
      await expect(table).toBeHidden();
      await expect(cards.first()).toBeVisible();
    }
  }
});
