import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

const user = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true };
const ticket = { id: 8, ticketNumber: "TKT-2026-000008", summary: "VPN cannot connect", description: "VPN fails after signing in.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", owner: null, category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" }, attachments: [], publicComments: [] };

function response(body: unknown, status = 200) { return { ok: status >= 200 && status < 300, status, json: async () => body } as Response; }
function setupFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/auth/me")) return response({ user, mustChangePassword: false });
    if (url.endsWith("/api/categories")) return response([{ id: 1, name: "Network" }]);
    if (url.endsWith("/api/related-systems")) return response([{ id: 2, name: "VPN" }]);
    if (url.endsWith("/api/tickets/8")) return response(ticket);
    if (url.endsWith("/api/tickets")) return response({ items: [ticket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    return response({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("authenticated requester regression", () => {
  beforeEach(() => { sessionStorage.setItem("toktickit.token", "opaque-session"); setupFetch(); });
  afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

  it("shows the signed-in requester workspace instead of the Lab 2 selector", async () => { render(<App />); expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument(); expect(screen.queryByText(/not a sign-in method/i)).not.toBeInTheDocument(); });
  it("opens an authenticated ticket detail", async () => { render(<App />); await userEvent.click(await screen.findByRole("button", { name: ticket.ticketNumber })); expect(await screen.findByRole("heading", { name: ticket.ticketNumber })).toBeInTheDocument(); });
  it("keeps requester ownership out of the browser API calls", async () => { const fetchMock = setupFetch(); render(<App />); await screen.findByRole("heading", { name: "My Tickets" }); expect(fetchMock.mock.calls.some(([url]) => String(url).includes("requesterId"))).toBe(false); });
  it("renders the authenticated ticket creation flow", async () => { render(<App />); expect(await screen.findByRole("heading", { name: "Create ticket" })).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Create ticket" })).toBeInTheDocument(); });
});
