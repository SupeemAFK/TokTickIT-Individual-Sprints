import { expect, type Page, type Route } from "playwright/test";

export const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true };
export const staff = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true };
export const administrator = { id: 2, name: "Admin One", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true };

const additionalRequesters = [
  { id: 9, name: "Anan Kittisak", email: "anan@example.test", role: "REQUESTER", isActive: true },
  { id: 10, name: "Mali Charoen", email: "mali@example.test", role: "REQUESTER", isActive: true },
  { id: 11, name: "Preecha Wattanakul", email: "preecha@example.test", role: "REQUESTER", isActive: true },
  { id: 12, name: "Suda Inactive", email: "suda@example.test", role: "REQUESTER", isActive: false },
] as const;

const additionalStaff = [
  { id: 5, name: "Bua Support", email: "bua@example.test", role: "IT_STAFF", isActive: true },
  { id: 6, name: "Chai Support", email: "chai@example.test", role: "IT_STAFF", isActive: true },
  { id: 7, name: "Dormant Support", email: "dormant@example.test", role: "IT_STAFF", isActive: false },
] as const;

const categories = [
  { id: 1, name: "Network" },
  { id: 2, name: "Account and Access" },
  { id: 3, name: "Hardware" },
  { id: 4, name: "Software" },
] as const;

const systems = [
  { id: 1, name: "Email" },
  { id: 2, name: "VPN" },
  { id: 3, name: "Campus Wi-Fi" },
  { id: 4, name: "Corporate Laptop" },
  { id: 5, name: "LEB2 App" },
  { id: 6, name: "Grade Submission App" },
] as const;

const attachment = { id: 4, originalFilename: "vpn-error.png", mimeType: "image/png", byteSize: 20, createdAt: "2026-09-19T08:03:00.000Z", removedAt: null, removalReason: null };

function makeTicket(overrides: Record<string, unknown> = {}) {
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
    relatedSystem: systems[1],
    attachments: [attachment],
    publicComments: [],
    internalNotes: [],
    createdAt: "2026-09-19T08:00:00.000Z",
    updatedAt: "2026-09-19T08:00:00.000Z",
    ...overrides,
  };
}

function realisticTickets() {
  return [
    makeTicket({ currentStatus: "IN_PROGRESS", owner: staff, publicComments: [{ id: 31, content: "Staff confirmed the VPN gateway is reachable and is checking the client profile.", author: staff, createdAt: "2026-09-19T08:05:00.000Z" }], internalNotes: [{ id: 41, content: "Compare the affected device profile with the current VPN policy.", author: staff, createdAt: "2026-09-19T08:06:00.000Z" }] }),
    makeTicket({ id: 13, ticketNumber: "TKT-2026-000013", summary: "Email access is unavailable", description: "The account cannot open the staff mailbox.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW", requester: additionalRequesters[0], category: categories[1], relatedSystem: systems[0], attachments: [], updatedAt: "2026-09-19T08:10:00.000Z" }),
    makeTicket({ id: 14, ticketNumber: "TKT-2026-000014", summary: "Laptop will not boot", description: "The assigned laptop stops at a blank screen.", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "RESOLVED", owner: additionalStaff[0], requester: additionalRequesters[1], category: categories[2], relatedSystem: systems[3], publicComments: [{ id: 32, content: "The requester confirmed that the laptop starts normally after the repair.", author: additionalStaff[0], createdAt: "2026-09-19T08:15:00.000Z" }], internalNotes: [{ id: 42, content: "Hardware diagnostics completed; no sensitive user data was copied.", author: additionalStaff[0], createdAt: "2026-09-19T08:16:00.000Z" }] }),
    makeTicket({ id: 15, ticketNumber: "TKT-2026-000015", summary: "Wi-Fi drops in the training room", description: "The wireless connection disconnects several times during a session.", requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "OPEN", owner: additionalStaff[1], requester: additionalRequesters[2], category: categories[0], relatedSystem: systems[2], publicComments: [{ id: 33, content: "IT Staff will inspect the access point after the next scheduled session.", author: additionalStaff[1], createdAt: "2026-09-19T08:20:00.000Z" }], internalNotes: [{ id: 43, content: "Check access-point channel utilization and recent non-sensitive alerts.", author: additionalStaff[1], createdAt: "2026-09-19T08:21:00.000Z" }] }),
    makeTicket({ id: 16, ticketNumber: "TKT-2026-000016", summary: "Required software update is pending", description: "The approved productivity update remains queued on the laptop.", requestedPriority: "LOW", itPriority: "MEDIUM", currentStatus: "WAITING_FOR_REQUESTER", owner: staff, category: categories[3], relatedSystem: systems[3], publicComments: [{ id: 34, content: "Please leave the laptop connected to power so the update can complete.", author: staff, createdAt: "2026-09-19T08:25:00.000Z" }], internalNotes: [{ id: 44, content: "Deployment job is staged; wait for the requester’s maintenance window.", author: staff, createdAt: "2026-09-19T08:26:00.000Z" }] }),
    makeTicket({ id: 17, ticketNumber: "TKT-2026-000017", summary: "Grade submission times out", description: "Saving a grade submission times out before confirmation appears.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "OPEN", requester: additionalRequesters[0], category: categories[3], relatedSystem: systems[5] }),
    makeTicket({ id: 18, ticketNumber: "TKT-2026-000018", summary: "Multi-factor sign-in reset needed", description: "The requester needs the approved local sign-in recovery process.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "CLOSED", owner: additionalStaff[0], requester: additionalRequesters[1], category: categories[1], relatedSystem: systems[0], publicComments: [{ id: 35, content: "The sign-in reset is complete and the requester confirmed access.", author: additionalStaff[0], createdAt: "2026-09-19T08:30:00.000Z" }], internalNotes: [{ id: 45, content: "Recovery completed using the documented local support procedure.", author: additionalStaff[0], createdAt: "2026-09-19T08:31:00.000Z" }] }),
    makeTicket({ id: 19, ticketNumber: "TKT-2026-000019", summary: "Printer driver is incompatible", description: "The approved printer driver cannot be installed on the laptop.", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "CANCELLED", requester: additionalRequesters[2], category: categories[2], relatedSystem: systems[3], publicComments: [{ id: 36, content: "The request was cancelled after the printer was replaced.", author: additionalRequesters[2], createdAt: "2026-09-19T08:35:00.000Z" }] }),
    makeTicket({ id: 20, ticketNumber: "TKT-2026-000020", summary: "VPN connection is intermittent", description: "The VPN reconnects repeatedly during remote work.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "REOPENED", owner: additionalStaff[1], category: categories[0], relatedSystem: systems[1], publicComments: [{ id: 37, content: "The issue returned after the first fix, so IT Staff reopened the ticket.", author: additionalStaff[1], createdAt: "2026-09-19T08:40:00.000Z" }], internalNotes: [{ id: 46, content: "Compare connection timestamps with the gateway event window.", author: additionalStaff[1], createdAt: "2026-09-19T08:41:00.000Z" }] }),
    makeTicket({ id: 21, ticketNumber: "TKT-2026-000021", summary: "Mailbox quota warning persists", description: "The mailbox continues to show a quota warning after cleanup.", requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "RESOLVED", owner: staff, requester: additionalRequesters[0], category: categories[1], relatedSystem: systems[0], publicComments: [{ id: 38, content: "The quota warning cleared after the mailbox cleanup.", author: staff, createdAt: "2026-09-19T08:45:00.000Z" }], internalNotes: [{ id: 47, content: "No message content was inspected; only quota metadata was reviewed.", author: staff, createdAt: "2026-09-19T08:46:00.000Z" }] }),
  ];
}

type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
type FixtureOptions = { realistic?: boolean };

export async function installLab3ApiMock(page: Page, role: Role, options: FixtureOptions = {}) {
  const realistic = options.realistic === true;
  let firstLogin = false;
  let tickets = realistic ? realisticTickets() : [makeTicket()];
  let nextTicketId = realistic ? 30 : 20;
  const currentUser = role === "REQUESTER" ? requester : role === "IT_STAFF" ? staff : administrator;
  const users = realistic ? [requester, ...additionalRequesters, staff, ...additionalStaff, administrator] : [requester, staff, administrator];
  const staffUsers = realistic ? [staff, ...additionalStaff.slice(0, 2), administrator] : [staff, administrator];
  const findTicket = (id: number) => tickets.find((item) => item.id === id) ?? tickets[0];
  const replaceTicket = (updated: (typeof tickets)[number]) => { tickets = tickets.map((item) => item.id === updated.id ? updated : item); };
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  const counts = () => ({ totalItems: tickets.length, unassigned: tickets.filter((item) => !item.owner).length, byStatus: Object.fromEntries([...new Set(tickets.map((item) => item.currentStatus))].map((status) => [status, tickets.filter((item) => item.currentStatus === status).length])), byItPriority: Object.fromEntries(["LOW", "MEDIUM", "HIGH"].map((priority) => [priority, tickets.filter((item) => item.itPriority === priority).length])) });

  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (url.pathname === "/api/auth/login") {
      firstLogin = true;
      return json(route, { user: currentUser, mustChangePassword: true, session: { token: "e2e-session", expiresAt: "2026-09-20T00:00:00.000Z" } });
    }
    if (url.pathname === "/api/auth/me") return json(route, { user: currentUser, mustChangePassword: firstLogin });
    if (url.pathname === "/api/auth/change-password") { firstLogin = false; return json(route, { user: currentUser, mustChangePassword: false }); }
    if (url.pathname === "/api/auth/logout") return route.fulfill({ status: 204 });
    if (url.pathname === "/api/categories") return json(route, categories);
    if (url.pathname === "/api/related-systems") return json(route, systems);
    if (url.pathname === "/api/staff/users") return json(route, staffUsers);

    if (url.pathname === "/api/tickets" && method === "GET") {
      const pageNumber = Number(url.searchParams.get("page") ?? 1);
      const pageSize = Number(url.searchParams.get("pageSize") ?? 10);
      const visible = realistic && role === "REQUESTER" ? tickets.filter((item) => item.requester?.id === currentUser.id) : tickets;
      const start = (pageNumber - 1) * pageSize;
      return json(route, { items: visible.slice(start, start + pageSize), pagination: { page: pageNumber, pageSize, totalItems: visible.length, totalPages: Math.ceil(visible.length / pageSize) || 0 } });
    }
    if (url.pathname === "/api/tickets" && method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      const created = makeTicket({ id: nextTicketId++, ticketNumber: realistic ? `TKT-2026-${String(nextTicketId - 1).padStart(6, "0")}` : "TKT-2026-000020", summary: String(body.summary), description: String(body.description), requestedPriority: String(body.requestedPriority), itPriority: String(body.requestedPriority), requester: currentUser });
      tickets = [created, ...tickets];
      return json(route, { ticket: created }, 201);
    }
    const requesterTicketMatch = url.pathname.match(/^\/api\/tickets\/(\d+)$/);
    if (requesterTicketMatch && method === "GET") return json(route, { ticket: findTicket(Number(requesterTicketMatch[1])) });
    const requesterCommentMatch = url.pathname.match(/^\/api\/tickets\/(\d+)\/comments$/);
    if (requesterCommentMatch && method === "GET") return json(route, { items: findTicket(Number(requesterCommentMatch[1])).publicComments });
    if (requesterCommentMatch && method === "POST") {
      const ticket = findTicket(Number(requesterCommentMatch[1]));
      const body = request.postDataJSON() as Record<string, unknown>;
      const comment = { id: 60, content: String(body.content), author: currentUser, createdAt: "2026-09-19T10:00:00.000Z" };
      replaceTicket({ ...ticket, publicComments: [...ticket.publicComments, comment] });
      return json(route, comment, 201);
    }
    if (/^\/api\/tickets\/\d+\/resolution-signal$/.test(url.pathname) && method === "POST") {
      const ticket = findTicket(Number(url.pathname.split("/")[3]));
      const updated = { ...ticket, problemAppearsResolvedAt: "2026-09-19T10:01:00.000Z" };
      replaceTicket(updated);
      return json(route, { ticket: updated });
    }
    if (/^\/api\/tickets\/\d+\/attachments$/.test(url.pathname) && method === "POST") return json(route, { attachment }, 201);
    if (url.pathname === "/api/attachments/4/download") return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from([1, 2, 3]) });

    if (url.pathname === "/api/staff/tickets" && method === "GET") {
      const pageNumber = Number(url.searchParams.get("page") ?? 1);
      const pageSize = Number(url.searchParams.get("pageSize") ?? 10);
      const start = (pageNumber - 1) * pageSize;
      return json(route, { items: tickets.slice(start, start + pageSize).map((item) => ({ ...item, requester: { id: item.requester.id, name: item.requester.name } })), pagination: { page: pageNumber, pageSize, totalItems: tickets.length, totalPages: Math.ceil(tickets.length / pageSize) || 0 }, counts: counts() });
    }
    const staffTicketMatch = url.pathname.match(/^\/api\/staff\/tickets\/(\d+)$/);
    if (staffTicketMatch && method === "GET") return json(route, { ticket: findTicket(Number(staffTicketMatch[1])) });
    const staffActionMatch = url.pathname.match(/^\/api\/staff\/tickets\/(\d+)\/(claim|owner|priority|status|comments|notes)$/);
    if (staffActionMatch) {
      const ticket = findTicket(Number(staffActionMatch[1]));
      const action = staffActionMatch[2];
      if (action === "claim" && method === "POST") { const updated = { ...ticket, owner: staff }; replaceTicket(updated); return json(route, { ticket: updated }); }
      if (action === "owner" && method === "PATCH") { const body = request.postDataJSON() as Record<string, unknown>; const ownerId = body.ownerUserId == null ? null : Number(body.ownerUserId); const owner = ownerId == null ? null : staffUsers.find((person) => person.id === ownerId) ?? null; const updated = { ...ticket, owner }; replaceTicket(updated); return json(route, { ticket: updated }); }
      if (action === "priority" && method === "PATCH") { const body = request.postDataJSON() as Record<string, unknown>; const updated = { ...ticket, itPriority: String(body.itPriority) }; replaceTicket(updated); return json(route, { ticket: updated }); }
      if (action === "status" && method === "PATCH") { const body = request.postDataJSON() as Record<string, unknown>; const updated = { ...ticket, currentStatus: String(body.currentStatus) }; replaceTicket(updated); return json(route, { ticket: updated }); }
      if (action === "comments" && method === "GET") return json(route, { items: ticket.publicComments });
      if (action === "comments" && method === "POST") { const body = request.postDataJSON() as Record<string, unknown>; const comment = { id: 61, content: String(body.content), author: staff, createdAt: "2026-09-19T10:02:00.000Z" }; const updated = { ...ticket, publicComments: [...ticket.publicComments, comment] }; replaceTicket(updated); return json(route, comment, 201); }
      if (action === "notes" && method === "GET") return json(route, { items: ticket.internalNotes });
      if (action === "notes" && method === "POST") { const body = request.postDataJSON() as Record<string, unknown>; const note = { id: 62, content: String(body.content), author: staff, createdAt: "2026-09-19T10:03:00.000Z" }; const updated = { ...ticket, internalNotes: [...ticket.internalNotes, note] }; replaceTicket(updated); return json(route, note, 201); }
    }
    if (/^\/api\/staff\/attachments\/4\/download$/.test(url.pathname)) return route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from([1, 2, 3]) });

    if (url.pathname === "/api/admin/users" && method === "GET") return json(route, { items: users });
    if (url.pathname === "/api/admin/users" && method === "POST") return json(route, administrator, 201);
    if (url.pathname.startsWith("/api/admin/users/")) return route.fulfill({ status: 204 });

    return json(route, { error: "Unhandled mock route.", code: "NOT_FOUND" }, 404);
  });
}

export async function openAuthenticatedApp(page: Page, role: Role) {
  await installLab3ApiMock(page, role);
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-session"));
  await page.reload();
  if (role === "REQUESTER") await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
  if (role !== "REQUESTER") await expect(page.getByRole("button", { name: "Ticket Queue" })).toBeVisible();
}
