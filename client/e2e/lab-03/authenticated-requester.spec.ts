import { expect, test, type Page, type Route } from "playwright/test";

const requester = { id: 1, name: "Anan Kittisak", email: "anan@test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 1 };
const categories = [{ id: 1, name: "Network" }];
const systems = [{ id: 1, name: "Campus Wi-Fi" }];
const detail = { id: 7, ticketNumber: "TKT-2026-000007", summary: "Wi-Fi issue", description: "Wi-Fi drops in the lab.", currentStatus: "IN_PROGRESS", requestedPriority: "HIGH", category: categories[0], relatedSystem: systems[0], attachments: [{ id: 4, originalFilename: "guide.pdf", mimeType: "application/pdf", byteSize: 10, removedAt: null, removalReason: null }], publicComments: [{ id: 8, content: "We are investigating.", author: { name: "Arun", role: "IT_STAFF" } }] };

async function installApiMock(page: Page) {
  await page.route("**/api/**", async (route: Route) => {
    const request = route.request(); const url = new URL(request.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/auth/me") return json({ user: requester });
    if (url.pathname === "/api/categories") return json(categories);
    if (url.pathname === "/api/related-systems") return json(systems);
    if (url.pathname === "/api/requester/tickets" && request.method() === "GET") return json({ items: [detail] });
    if (url.pathname === "/api/requester/tickets" && request.method() === "POST") return json({ ...detail, id: 8, ticketNumber: "TKT-2026-000008" }, 201);
    if (url.pathname === "/api/requester/tickets/7" && request.method() === "GET") return json(detail);
    if (url.pathname === "/api/requester/tickets/7/comments" || url.pathname === "/api/requester/tickets/7/appears-resolved") return json({ ok: true }, 201);
    if (url.pathname === "/api/tickets/7/attachments" && request.method() === "POST") return json({ ...detail.attachments[0], id: 5, originalFilename: "new-evidence.png" }, 201);
    if (url.pathname === "/api/attachments/4/download") return route.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from("pdf") });
    return json({ error: "Unhandled mock route." }, 404);
  });
}

async function openRequester(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("toktickit.token", "requester-session"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
}

test.beforeEach(async ({ page }) => installApiMock(page));

test("authenticated requester can create, inspect, comment, report resolution, and manage attachments", async ({ page }) => {
  await openRequester(page);
  await page.getByPlaceholder("Summary").fill("New Wi-Fi ticket");
  await page.getByPlaceholder("Description").fill("The wireless connection drops repeatedly in the lab.");
  await page.getByRole("button", { name: "Create ticket" }).click();
  await expect(page.getByText("Ticket created.")).toBeVisible();
  await page.getByRole("button", { name: "View details" }).click();
  await expect(page.getByText("guide.pdf")).toBeVisible();
  await expect(page.getByText("We are investigating.")).toBeVisible();
  await page.getByRole("button", { name: "Problem Appears Resolved" }).click();
  await page.getByPlaceholder("Add a public comment").fill("Thanks for the update");
  await page.getByRole("button", { name: "Comment" }).click();
  await expect(page.getByPlaceholder("Add a public comment")).toHaveValue("");
  await page.getByLabel("Attachment file").setInputFiles({ name: "evidence.png", mimeType: "image/png", buffer: Buffer.from([1, 2, 3]) });
  await page.getByRole("button", { name: "Upload" }).click();
});

test("authenticated requester remains usable at desktop, tablet, and mobile widths", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport); await openRequester(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("button", { name: "View details" })).toBeVisible();
  }
});
