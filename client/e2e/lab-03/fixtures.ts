import { expect, type Page, type Route } from "playwright/test";

export const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true };
export const staff = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true };
export const administrator = { id: 2, name: "Admin One", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true };
const categories = [{ id: 1, name: "Network" }];
const systems = [{ id: 2, name: "VPN" }];

function ticket() {
  return {
    id: 12,
    ticketNumber: "TKT-2026-000012",
    summary: "VPN cannot connect",
    description: "VPN fails after sign in.",
    requestedPriority: "HIGH",
    itPriority: "MEDIUM",
    currentStatus: "NEW",
    owner: null,
    requester,
    category: categories[0],
    relatedSystem: systems[0],
    attachments: [{ id: 4, originalFilename: "screenshot.png", mimeType: "image/png", byteSize: 20, createdAt: "2026-09-19T08:03:00.000Z", removedAt: null, removalReason: null }],
    publicComments: [],
    internalNotes: [],
    createdAt: "2026-09-19T08:00:00.000Z",
    updatedAt: "2026-09-19T08:00:00.000Z",
  };
}

export async function installLab3ApiMock(page: Page, role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") {
  let firstLogin = false;
  const currentUser = role === "REQUESTER" ? requester : role === "IT_STAFF" ? staff : administrator;
  const users = [requester, staff, administrator];
  const currentTicket = ticket();

  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/auth/login") {
      firstLogin = true;
      return json({ user: currentUser, mustChangePassword: true, session: { token: "e2e-session", expiresAt: "2026-09-20T00:00:00.000Z" } });
    }
    if (url.pathname === "/api/auth/me") return json({ user: currentUser, mustChangePassword: firstLogin });
    if (url.pathname === "/api/auth/change-password") {
      firstLogin = false;
      return json({ user: currentUser, mustChangePassword: false });
    }
    if (url.pathname === "/api/auth/logout") return route.fulfill({ status: 204 });
    if (url.pathname === "/api/categories") return json(categories);
    if (url.pathname === "/api/related-systems") return json(systems);
    if (url.pathname === "/api/staff/users") return json([staff, administrator]);

    if (url.pathname === "/api/tickets" && request.method() === "GET") {
      return json({ items: [ticket()], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    }
    if (url.pathname === "/api/tickets/12" && request.method() === "GET") return json({ ticket: currentTicket });
    if (url.pathname === "/api/tickets" && request.method() === "POST") return json({ ticket: currentTicket }, 201);
    if (url.pathname === "/api/tickets/12/comments" && request.method() === "GET") return json({ items: [] });
    if (url.pathname === "/api/tickets/12/comments" && request.method() === "POST") return json({ id: 20, content: "Comment", author: currentUser, createdAt: new Date().toISOString() }, 201);
    if (url.pathname === "/api/tickets/12/resolution-signal") return json({ ticket: currentTicket });
    if (url.pathname === "/api/tickets/12/attachments") return json({ attachment: currentTicket.attachments[0] }, 201);
    if (url.pathname === "/api/attachments/4/download") return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from([1, 2, 3]) });
    if (url.pathname === "/api/attachments/4" && request.method() === "DELETE") return json({ ...currentTicket.attachments[0], removedAt: new Date().toISOString(), removalReason: "removed" });

    if (url.pathname === "/api/staff/tickets" && request.method() === "GET") {
      return json({ items: [{ ...ticket(), requester: { id: requester.id, name: requester.name } }], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }, counts: { totalItems: 1, unassigned: 1, byStatus: { NEW: 1 }, byItPriority: { LOW: 0, MEDIUM: 1, HIGH: 0 } } });
    }
    if (url.pathname === "/api/staff/tickets/12" && request.method() === "GET") return json({ ticket: currentTicket });
    if (url.pathname === "/api/staff/tickets/12/claim") return json({ ticket: currentTicket });
    if (url.pathname.startsWith("/api/staff/tickets/12/") && request.method() === "PATCH") return json({ ticket: currentTicket });
    if (url.pathname === "/api/staff/tickets/12/comments" && request.method() === "GET") return json({ items: [] });
    if (url.pathname === "/api/staff/tickets/12/comments" && request.method() === "POST") return json({ id: 20, content: "Comment", author: staff, createdAt: new Date().toISOString() }, 201);
    if (url.pathname === "/api/staff/tickets/12/notes" && request.method() === "GET") return json({ items: [] });
    if (url.pathname === "/api/staff/tickets/12/notes" && request.method() === "POST") return json({ id: 21, content: "Note", author: staff, createdAt: new Date().toISOString() }, 201);
    if (url.pathname === "/api/staff/attachments/4/download") return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from([1, 2, 3]) });

    if (url.pathname === "/api/admin/users" && request.method() === "GET") return json({ items: users });
    if (url.pathname === "/api/admin/users" && request.method() === "POST") return json(administrator, 201);
    if (url.pathname.startsWith("/api/admin/users/")) return route.fulfill({ status: 204 });

    return json({ error: "Unhandled mock route.", code: "NOT_FOUND" }, 404);
  });
}

export async function openAuthenticatedApp(page: Page, role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR") {
  await page.goto("/");
  await installLab3ApiMock(page, role);
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-session"));
  await page.reload();
  if (role === "REQUESTER") await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  if (role === "IT_STAFF") await expect(page.getByRole("heading", { name: /Welcome|Ticket Queue/ })).toBeVisible();
  if (role === "ADMINISTRATOR") await expect(page.getByRole("heading", { name: /Welcome|User Management/ })).toBeVisible();
}
