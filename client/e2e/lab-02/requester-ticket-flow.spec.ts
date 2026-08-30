import { expect, test, type Page, type Route } from "playwright/test";

type Attachment = { id: number; originalFilename: string; mimeType: string; byteSize: number; createdAt: string; removedAt: string | null; removalReason: string | null };

const requesterOne = { id: 1, name: "Anan Srisuk", email: "anan@example.com" };
const requesterTwo = { id: 2, name: "Mali Chai", email: "mali@example.com" };
const categories = [{ id: 1, name: "Hardware" }, { id: 2, name: "Network" }];
const systems = [{ id: 1, name: "Email" }, { id: 2, name: "VPN" }];

function ticket(id: number, requesterId: number, summary: string) {
  const requester = requesterId === 1 ? requesterOne : requesterTwo;
  return { id, ticketNumber: `TKT-2026-${String(id).padStart(6, "0")}`, requesterId, categoryId: 2, relatedSystemId: 2, summary, description: "VPN fails after sign in and requires investigation.", requestedPriority: "HIGH", currentStatus: "NEW", createdAt: "2026-08-30T00:00:00.000Z", updatedAt: "2026-08-30T12:00:00.000Z", requester, category: categories[1], relatedSystem: systems[1] };
}

async function installApiMock(page: Page) {
  const tickets = [ticket(8, 1, "VPN cannot connect"), ticket(9, 2, "Email delivery delayed")];
  const attachments: Attachment[] = [
    { id: 11, originalFilename: "vpn-error.png", mimeType: "image/png", byteSize: 12_400, createdAt: "2026-08-30T00:00:00.000Z", removedAt: null, removalReason: null },
    { id: 12, originalFilename: "old-log.pdf", mimeType: "application/pdf", byteSize: 4_200, createdAt: "2026-08-29T00:00:00.000Z", removedAt: "2026-08-30T01:00:00.000Z", removalReason: "Superseded evidence" },
  ];
  let nextTicketId = 42;
  let nextAttachmentId = 13;

  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/development-requesters") return json([requesterOne, requesterTwo]);
    if (url.pathname === "/api/categories") return json(categories);
    if (url.pathname === "/api/related-systems") return json(systems);
    if (url.pathname === "/api/tickets" && request.method() === "POST") {
      const input = request.postDataJSON() as { requesterId: number; categoryId: number; relatedSystemId: number; summary: string; requestedPriority: "LOW" | "MEDIUM" | "HIGH"; description: string };
      const created = { ...ticket(nextTicketId++, input.requesterId, input.summary), categoryId: input.categoryId, relatedSystemId: input.relatedSystemId, requestedPriority: input.requestedPriority, description: input.description };
      tickets.push(created);
      return json(created, 201);
    }
    if (url.pathname === "/api/tickets" && request.method() === "GET") {
      const requesterId = Number(url.searchParams.get("requesterId"));
      const search = url.searchParams.get("search")?.toLowerCase();
      const filtered = tickets.filter((item) => item.requesterId === requesterId && (!search || item.summary.toLowerCase().includes(search) || item.ticketNumber.toLowerCase().includes(search)));
      return json({ items: filtered, pagination: { page: Number(url.searchParams.get("page") ?? 1), pageSize: Number(url.searchParams.get("pageSize") ?? 10), totalItems: filtered.length, totalPages: 1 } });
    }
    const ticketMatch = url.pathname.match(/^\/api\/tickets\/(\d+)$/);
    if (ticketMatch && request.method() === "GET") {
      const item = tickets.find((candidate) => candidate.id === Number(ticketMatch[1]) && candidate.requesterId === Number(url.searchParams.get("requesterId")));
      return item ? json(item) : json({ error: "Ticket not found." }, 404);
    }
    const ticketAttachmentMatch = url.pathname.match(/^\/api\/tickets\/(\d+)\/attachments$/);
    if (ticketAttachmentMatch && request.method() === "GET") return json(attachments);
    if (ticketAttachmentMatch && request.method() === "POST") {
      const created: Attachment = { id: nextAttachmentId++, originalFilename: "evidence.png", mimeType: "image/png", byteSize: 4, createdAt: "2026-08-30T12:00:00.000Z", removedAt: null, removalReason: null };
      attachments.push(created);
      return json(created, 201);
    }
    const removalMatch = url.pathname.match(/^\/api\/attachments\/(\d+)$/);
    if (removalMatch && request.method() === "DELETE") {
      const attachment = attachments.find((candidate) => candidate.id === Number(removalMatch[1]));
      if (!attachment) return json({ error: "Attachment not found." }, 404);
      attachment.removedAt = "2026-08-30T12:01:00.000Z";
      attachment.removalReason = "No longer relevant";
      return json(attachment);
    }
    return json({ error: "Unhandled mock route." }, 404);
  });
}

async function chooseRequester(page: Page, id = "1") {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.locator("#development-requester").selectOption(id);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
}

test.beforeEach(async ({ page }) => installApiMock(page));

test("requester validates, creates, finds, and manages an owned ticket", async ({ page }) => {
  await chooseRequester(page);
  await page.locator("section[aria-labelledby='my-tickets-heading']").getByRole("button", { name: "Create Ticket" }).click();
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(page.getByText("Summary must be between 5 and 160 characters.")).toBeVisible();
  await page.locator("#ticket-category").selectOption("2");
  await page.locator("#ticket-system").selectOption("2");
  await page.locator("#ticket-priority").selectOption("HIGH");
  await page.locator("#ticket-summary").fill("VPN client cannot connect");
  await page.locator("#ticket-description").fill("The VPN client fails after successful sign in and needs investigation.");
  await page.getByRole("button", { name: "Submit Ticket" }).click();
  await expect(page.getByRole("heading", { name: "Ticket created" })).toBeVisible();
  await expect(page.getByText("TKT-2026-000042")).toBeVisible();
  await page.getByRole("button", { name: "Back to My Tickets" }).click();
  await page.locator("#ticket-search").fill("VPN client");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("button", { name: "Open ticket TKT-2026-000042" })).toBeVisible();
  await page.getByRole("button", { name: "Open ticket TKT-2026-000042" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Detail" })).toBeVisible();
  await page.getByLabel("Attachment file").setInputFiles({ name: "evidence.png", mimeType: "image/png", buffer: Buffer.from([1, 2, 3, 4]) });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByText("evidence.png")).toBeVisible();
  await page.locator("#attachment-removal-reason").fill("No longer relevant");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove" }).last().click();
  await expect(page.getByText("Removed")).toBeVisible();
});

test("requester switching and responsive layouts preserve usable navigation", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    await chooseRequester(page);
    expect(await page.locator("body").evaluate((body) => document.documentElement.scrollWidth <= body.ownerDocument.defaultView!.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Change Requester" }).click();
    await page.locator("#development-requester").selectOption("2");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Tickets submitted by Mali Chai.")).toBeVisible();
    if (viewport.width < 768) {
      await expect(page.locator(".ticket-card").getByText("Email delivery delayed")).toBeVisible();
      await expect(page.locator(".ticket-card").getByText("VPN cannot connect")).toHaveCount(0);
    } else {
      await expect(page.getByRole("button", { name: "Open ticket TKT-2026-000009" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Open ticket TKT-2026-000008" })).toHaveCount(0);
    }
  }
});
