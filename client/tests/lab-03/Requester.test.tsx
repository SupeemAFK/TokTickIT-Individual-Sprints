import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
