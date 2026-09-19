import { expect, test, type Page, type Route } from "playwright/test";

const staff = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true };
const administrator = { id: 2, name: "Admin One", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true };
const requester = { id: 8, name: "Ada Requester", email: "ada@example.test" };
const category = { id: 1, name: "Network" };
const relatedSystem = { id: 2, name: "VPN" };

async function installStaffFlowMock(page: Page) {
  let ticket = {
    id: 12,
    ticketNumber: "TKT-2026-000012",
    summary: "VPN cannot connect",
    description: "VPN fails after signing in.",
    requestedPriority: "HIGH",
    itPriority: "MEDIUM",
    currentStatus: "OPEN",
    owner: null as typeof staff | typeof administrator | null,
    requester,
    category,
    relatedSystem,
    attachments: [{ id: 4, originalFilename: "screenshot.png", mimeType: "image/png", byteSize: 20, createdAt: "2026-09-19T08:03:00.000Z", removedAt: null, removalReason: null }],
    publicComments: [{ id: 31, content: "Existing public update", author: staff, createdAt: "2026-09-19T08:05:00.000Z" }],
    internalNotes: [{ id: 9, content: "Existing private note", author: staff, createdAt: "2026-09-19T08:06:00.000Z" }],
    problemAppearsResolvedAt: null,
    createdAt: "2026-09-19T08:00:00.000Z",
    updatedAt: "2026-09-19T08:07:00.000Z",
  };
  const summary = () => ({ ...ticket, requester: undefined, attachments: undefined, publicComments: undefined, internalNotes: undefined });
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body = request.postDataJSON?.() as Record<string, unknown> | undefined;
    if (url.pathname === "/api/auth/me") return json(route, { user: staff, mustChangePassword: false });
    if (url.pathname === "/api/staff/users") return json(route, [staff, administrator]);
    if (url.pathname === "/api/categories") return json(route, [category]);
    if (url.pathname === "/api/staff/tickets" && method === "GET") return json(route, { items: [summary()], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }, counts: { totalItems: 1, unassigned: ticket.owner ? 0 : 1, byStatus: { [ticket.currentStatus]: 1 }, byItPriority: { LOW: 0, MEDIUM: ticket.itPriority === "MEDIUM" ? 1 : 0, HIGH: ticket.itPriority === "HIGH" ? 1 : 0 } } });
    if (url.pathname === "/api/staff/tickets/12" && method === "GET") return json(route, { ticket });
    if (url.pathname === "/api/staff/tickets/12/claim" && method === "POST") { ticket = { ...ticket, owner: staff }; return json(route, { ticket: summary() }); }
    if (url.pathname === "/api/staff/tickets/12/owner" && method === "PATCH") { ticket = { ...ticket, owner: body?.ownerUserId === administrator.id ? administrator : body?.ownerUserId === null ? null : staff }; return json(route, { ticket: summary() }); }
    if (url.pathname === "/api/staff/tickets/12/priority" && method === "PATCH") { ticket = { ...ticket, itPriority: String(body?.itPriority) }; return json(route, { ticket: summary() }); }
    if (url.pathname === "/api/staff/tickets/12/status" && method === "PATCH") { ticket = { ...ticket, currentStatus: String(body?.currentStatus) }; return json(route, { ticket: summary() }); }
    if (url.pathname === "/api/staff/tickets/12/comments" && method === "POST") { ticket = { ...ticket, publicComments: [...ticket.publicComments, { id: 32, content: String(body?.content), author: staff, createdAt: "2026-09-19T10:00:00.000Z" }] }; return json(route, ticket.publicComments.at(-1), 201); }
    if (url.pathname === "/api/staff/tickets/12/notes" && method === "POST") { ticket = { ...ticket, internalNotes: [...ticket.internalNotes, { id: 10, content: String(body?.content), author: staff, createdAt: "2026-09-19T10:01:00.000Z" }] }; return json(route, ticket.internalNotes.at(-1), 201); }
    if (url.pathname === "/api/staff/attachments/4/download" && method === "GET") return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from([1, 2, 3]) });
    return json(route, {});
  });
}

async function openStaffTicket(page: Page) {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-staff-session"));
  await page.reload();
  await page.getByRole("button", { name: "Ticket Queue" }).click();
  await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible();
  await page.getByRole("button", { name: "Open TKT-2026-000012" }).first().click();
  await expect(page.getByRole("heading", { name: "Staff Ticket Detail" })).toBeVisible();
}

test.beforeEach(async ({ page }) => installStaffFlowMock(page));

test("staff can operate a ticket and the detail remains usable without overflow at all required widths", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStaffTicket(page);
  await expect(page.getByText("Existing public update")).toBeVisible();
  await expect(page.getByText("Existing private note")).toBeVisible();
  await expect(page.getByRole("button", { name: "Download attachment" })).toBeVisible();

  await page.getByRole("button", { name: "Claim ticket" }).click();
  await expect(page.getByRole("button", { name: "Already assigned" })).toBeVisible();
  await page.getByLabel("Owner", { exact: true }).selectOption(String(administrator.id));
  await expect(page.getByLabel("Owner", { exact: true })).toHaveValue(String(administrator.id));
  await page.getByLabel("IT priority").selectOption("HIGH");
  await expect(page.getByLabel("IT priority")).toHaveValue("HIGH");
  await page.getByLabel("Workflow status").selectOption("IN_PROGRESS");
  await expect(page.getByLabel("Workflow status")).toHaveValue("IN_PROGRESS");
  await page.getByRole("textbox", { name: "Staff public comment" }).fill("Public update from the browser.");
  await page.getByRole("button", { name: "Comment" }).click();
  await expect(page.getByText("Public update from the browser.")).toBeVisible();
  await page.getByRole("textbox", { name: "Internal note" }).fill("Private browser investigation note.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Private browser investigation note.")).toBeVisible();

  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await openStaffTicket(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.getByRole("heading", { name: "Ownership, priority, and status" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Public comments" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Internal notes" })).toBeVisible();
  }
});
