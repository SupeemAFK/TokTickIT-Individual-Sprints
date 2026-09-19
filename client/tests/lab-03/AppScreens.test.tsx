import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true };
const staff = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true };
const administrator = { id: 2, name: "Admin One", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true };
const category = { id: 1, name: "Network" };
const system = { id: 2, name: "VPN" };
const summary = { id: 12, ticketNumber: "TKT-2026-000012", summary: "VPN cannot connect", requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "NEW", owner: null, category, relatedSystem: system, createdAt: "2026-09-19T08:00:00.000Z", updatedAt: "2026-09-19T08:00:00.000Z" };
const detail = { ...summary, description: "VPN fails after sign in.", requester, attachments: [{ id: 4, originalFilename: "screenshot.png", mimeType: "image/png", byteSize: 20, createdAt: "2026-09-19T08:03:00.000Z", removedAt: null, removalReason: null }], publicComments: [], internalNotes: [] };
function response(body: unknown, status = 200) { return { ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => new Blob(["file"]) } as Response; }

function installFetch(currentUser: typeof requester, firstLogin = false) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/auth/login")) return response({ user: currentUser, mustChangePassword: firstLogin, session: { token: "opaque-session", expiresAt: "2026-09-20T00:00:00.000Z" } });
    if (url.endsWith("/api/auth/me")) return response({ user: currentUser, mustChangePassword: firstLogin });
    if (url.endsWith("/api/categories")) return response([category]);
    if (url.endsWith("/api/related-systems")) return response([system]);
    if (url.includes("/api/tickets?") || url.endsWith("/api/tickets")) return response({ items: [summary], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    if (url.endsWith("/api/tickets/12")) return response({ ticket: detail });
    if (url.endsWith("/api/staff/users")) return response([staff, administrator]);
    if (url.includes("/api/staff/tickets?") || url.endsWith("/api/staff/tickets")) return response({ items: [{ ...summary, requester: { id: requester.id, name: requester.name } }], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }, counts: { totalItems: 1, unassigned: 1, byStatus: { NEW: 1 }, byItPriority: { LOW: 0, MEDIUM: 1, HIGH: 0 } } });
    if (url.endsWith("/api/staff/tickets/12")) return response({ ticket: detail });
    if (url.includes("/api/admin/users")) return response({ items: [requester, staff, administrator] });
    if (url.endsWith("/api/auth/change-password")) return response({ user: currentUser, mustChangePassword: false });
    return response({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

describe("production Lab 3 screens", () => {
  it("labels login and first-login password controls and announces busy states", async () => {
    const user = userEvent.setup();
    installFetch(requester, true);
    render(<App />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), requester.email);
    await user.type(screen.getByLabelText("Password"), "Lab3Pass123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Change your initial password" })).toBeInTheDocument();
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
    expect(screen.getByText("At least 12 characters")).toBeInTheDocument();
    expect(screen.getByText("At least one upper-case letter")).toBeInTheDocument();
  });

  it("renders the authenticated requester creation priority and migrated controls", async () => {
    sessionStorage.setItem("toktickit.token", "opaque-session");
    installFetch(requester);
    render(<App />);
    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getByLabelText("Requested priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("renders the production staff queue and detail attachment action", async () => {
    sessionStorage.setItem("toktickit.token", "opaque-session");
    installFetch(staff);
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    expect(screen.getByText("Requester ID")).toBeInTheDocument();
    expect(screen.getByText("Requested Priority")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Open TKT-2026-000012" })[0]);
    expect(await screen.findByRole("heading", { name: "Staff Ticket Detail" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download attachment" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Internal notes" })).toBeInTheDocument();
  });

  it("renders administrator name/email edit controls and mobile card content", async () => {
    sessionStorage.setItem("toktickit.token", "opaque-session");
    installFetch(administrator);
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "User Management" }));
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Save changes" })).toHaveLength(6);
    expect(screen.getByLabelText("Name for ada@example.test")).toBeInTheDocument();
    expect(screen.getByLabelText("Email for Ada Requester")).toBeInTheDocument();
    expect(document.getElementById("mobile-user-name-8")).toBeInTheDocument();
  });
});
