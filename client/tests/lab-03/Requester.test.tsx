import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

describe("Lab 3 authenticated requester", () => {
  beforeEach(() => {
    sessionStorage.setItem("toktickit.token", "requester-token");
    vi.spyOn(global, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const body = url.endsWith("/api/auth/me") ? { user: { id: 1, name: "Anan", email: "anan@test", role: "REQUESTER", isActive: true, mustChangePassword: false } } : { items: [{ id: 7, ticketNumber: "TKT-000007", summary: "Wi-Fi issue", currentStatus: "NEW" }] };
      return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
    });
  });
  afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });
  it("loads My Tickets from the authenticated session and offers Create Ticket", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: /my tickets/i })).toBeInTheDocument();
    expect(await screen.findByText("TKT-000007")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /create ticket/i })).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/requester/tickets"), expect.anything()));
  });
});

it("opens the authenticated detail with attachments, public comments, and resolution reporting", async () => {
  const user = userEvent.setup();
  const detail = { id: 7, ticketNumber: "TKT-2026-000007", summary: "Wi-Fi issue", description: "Wi-Fi drops in the lab.", currentStatus: "IN_PROGRESS", requestedPriority: "HIGH", category: { id: 1, name: "Network" }, relatedSystem: { id: 1, name: "Campus Wi-Fi" }, attachments: [{ id: 4, originalFilename: "guide.pdf", mimeType: "application/pdf", byteSize: 10, removedAt: null, removalReason: null }], publicComments: [{ id: 8, content: "We are investigating.", author: { name: "Arun", role: "IT_STAFF" } }] };
  vi.restoreAllMocks();
  sessionStorage.setItem("toktickit.token", "requester-token");
  vi.spyOn(global, "fetch").mockImplementation(async (input, options) => {
    const url = String(input);
    if (url.endsWith("/api/auth/me")) return new Response(JSON.stringify({ user: { id: 1, name: "Anan", email: "anan@test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 1 } }), { status: 200 });
    if (url.endsWith("/api/requester/tickets")) return new Response(JSON.stringify({ items: [{ id: 7, ticketNumber: "TKT-2026-000007", summary: "Wi-Fi issue", currentStatus: "IN_PROGRESS" }] }), { status: 200 });
    if (url.endsWith("/api/categories")) return new Response(JSON.stringify([{ id: 1, name: "Network" }]), { status: 200 });
    if (url.endsWith("/api/related-systems")) return new Response(JSON.stringify([{ id: 1, name: "Campus Wi-Fi" }]), { status: 200 });
    if (url.endsWith("/api/requester/tickets/7")) return new Response(JSON.stringify(detail), { status: 200 });
    if (url.endsWith("/comments") || url.endsWith("/appears-resolved")) return new Response(JSON.stringify({ ok: true }), { status: 200 });
    return new Response(JSON.stringify({}), { status: 200 });
  });
  render(<App />);
  await user.click(await screen.findByRole("button", { name: /view details/i }));
  expect(await screen.findByText("guide.pdf")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /public comments/i })).toBeInTheDocument();
  expect(screen.getByText(/We are investigating/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /problem appears resolved/i }));
  const comment = screen.getByPlaceholderText("Add a public comment");
  await user.type(comment, "Thanks for the update");
  await user.click(screen.getByRole("button", { name: "Comment" }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/requester/tickets/7/comments"), expect.objectContaining({ method: "POST" })));
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/api/requester/tickets/7/appears-resolved"), expect.objectContaining({ method: "POST" }));
});
