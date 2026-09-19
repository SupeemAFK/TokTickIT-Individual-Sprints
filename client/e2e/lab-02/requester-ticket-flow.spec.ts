import { expect, test, type Page, type Route } from "playwright/test";

type Attachment = { id: number; originalFilename: string; mimeType: string; byteSize: number; createdAt: string; removedAt: string | null; removalReason: string | null };
type Ticket = { id: number; ticketNumber: string; summary: string; description: string; requestedPriority: string; itPriority: string; currentStatus: string; category: { id: number; name: string }; relatedSystem: { id: number; name: string }; createdAt: string; updatedAt: string; attachments: Attachment[]; publicComments: unknown[] };

const requester = { id: 1, name: "Anan Srisuk", email: "anan@example.com", role: "REQUESTER", isActive: true };
const categories = [{ id: 1, name: "Hardware" }, { id: 2, name: "Network" }];
const systems = [{ id: 1, name: "Email" }, { id: 2, name: "VPN" }];

function ticket(id: number, summary: string): Ticket {
  return { id, ticketNumber: `TKT-2026-${String(id).padStart(6, "0")}`, summary, description: "VPN fails after sign in and requires investigation.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", category: categories[1], relatedSystem: systems[1], createdAt: "2026-08-30T00:00:00.000Z", updatedAt: "2026-08-30T12:00:00.000Z", attachments: [], publicComments: [] };
}

async function installApiMock(page: Page) {
  const tickets = [ticket(8, "VPN cannot connect"), ticket(9, "Email delivery delayed")];
  const attachments: Attachment[] = [{ id: 11, originalFilename: "vpn-error.png", mimeType: "image/png", byteSize: 12_400, createdAt: "2026-08-30T00:00:00.000Z", removedAt: null, removalReason: null }];
  tickets[0].attachments.push(attachments[0]);
  let nextTicketId = 42;
  let nextAttachmentId = 13;

  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/auth/me") return json({ user: requester, mustChangePassword: false });
    if (url.pathname === "/api/auth/logout") return route.fulfill({ status: 204 });
    if (url.pathname === "/api/categories") return json(categories);
    if (url.pathname === "/api/related-systems") return json(systems);
    if (url.pathname === "/api/tickets" && request.method() === "POST") {
      const input = request.postDataJSON() as { categoryId: number; relatedSystemId: number; summary: string; requestedPriority: string; description: string };
      const created = { ...ticket(nextTicketId++, input.summary), category: categories.find((item) => item.id === input.categoryId) ?? categories[0], relatedSystem: systems.find((item) => item.id === input.relatedSystemId) ?? systems[0], requestedPriority: input.requestedPriority, itPriority: input.requestedPriority, description: input.description };
      tickets.push(created);
      return json({ ticket: created }, 201);
    }
    if (url.pathname === "/api/tickets" && request.method() === "GET") {
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const filtered = tickets.filter((item) => !search || item.summary.toLowerCase().includes(search) || item.ticketNumber.toLowerCase().includes(search));
      return json({ items: filtered, pagination: { page: Number(url.searchParams.get("page") ?? 1), pageSize: Number(url.searchParams.get("pageSize") ?? 10), totalItems: filtered.length, totalPages: Math.ceil(filtered.length / Number(url.searchParams.get("pageSize") ?? 10)) || 0 } });
    }
    const ticketMatch = url.pathname.match(/^\/api\/tickets\/(\d+)$/);
    if (ticketMatch && request.method() === "GET") {
      const item = tickets.find((candidate) => candidate.id === Number(ticketMatch[1]));
      return item ? json({ ticket: item }) : json({ error: "Ticket not found.", code: "NOT_FOUND" }, 404);
    }
    const ticketAttachmentMatch = url.pathname.match(/^\/api\/tickets\/(\d+)\/attachments$/);
    if (ticketAttachmentMatch && request.method() === "POST") {
      const item = tickets.find((candidate) => candidate.id === Number(ticketAttachmentMatch[1]))!;
      const created: Attachment = { id: nextAttachmentId++, originalFilename: "evidence.png", mimeType: "image/png", byteSize: 4, createdAt: "2026-08-30T12:00:00.000Z", removedAt: null, removalReason: null };
      item.attachments.push(created); attachments.push(created); return json({ attachment: created }, 201);
    }
    const removalMatch = url.pathname.match(/^\/api\/attachments\/(\d+)$/);
    if (removalMatch && request.method() === "DELETE") {
      const attachment = attachments.find((candidate) => candidate.id === Number(removalMatch[1]));
      if (!attachment) return json({ error: "Attachment not found.", code: "NOT_FOUND" }, 404);
      attachment.removedAt = "2026-08-30T12:01:00.000Z"; attachment.removalReason = "No longer relevant"; return json(attachment);
    }
    const downloadMatch = url.pathname.match(/^\/api\/attachments\/(\d+)\/download$/);
    if (downloadMatch && request.method() === "GET") return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from([1, 2, 3]) });
    return json({ error: "Unhandled mock route.", code: "NOT_FOUND" }, 404);
  });
}

async function loginAsRequester(page: Page) {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-session"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
}

test.beforeEach(async ({ page }) => installApiMock(page));

test("authenticated requester validates, creates, searches, opens, and manages an owned ticket", async ({ page }) => {
  await loginAsRequester(page);
  await page.locator("#ticket-priority").selectOption("HIGH");
  await page.locator("#ticket-category").selectOption("2");
  await page.locator("#ticket-system").selectOption("2");
  await page.locator("#requester-summary").fill("VPN client cannot connect");
  await page.locator("#requester-description").fill("The VPN client fails after successful sign in and needs investigation.");
  await page.getByRole("button", { name: "Create ticket" }).click();
  await expect(page.getByText(/TKT-2026-000042 created/)).toBeVisible();
  await page.getByLabel("Search").fill("VPN client");
  await expect(page.getByRole("button", { name: "Open ticket TKT-2026-000042" })).toBeVisible();
  await page.getByRole("button", { name: "Open ticket TKT-2026-000042" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await page.getByLabel("Attachment file").setInputFiles({ name: "evidence.png", mimeType: "image/png", buffer: Buffer.from([1, 2, 3, 4]) });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("evidence.png")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept("No longer relevant"));
  await page.getByRole("button", { name: "Remove" }).last().click();
  const uploadedAttachment = page.locator(".list-group-item", { hasText: "evidence.png" });
  await expect(uploadedAttachment.getByText("Removed", { exact: true })).toBeVisible();
  await expect(uploadedAttachment.getByRole("button", { name: "Download" })).toHaveCount(0);
  await expect(uploadedAttachment.getByRole("button", { name: "Remove" })).toHaveCount(0);
});

test("authenticated requester remains usable at desktop, tablet, and mobile widths", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await loginAsRequester(page);
    expect(await page.locator("body").evaluate((body) => document.documentElement.scrollWidth <= body.ownerDocument.defaultView!.innerWidth)).toBe(true);
    await expect(page.locator(".ticket-card").first()).toBeVisible();
    await expect(page.getByLabel("Search")).toBeVisible();
    await expect(page.getByLabel("Page size")).toBeVisible();
  }
});
