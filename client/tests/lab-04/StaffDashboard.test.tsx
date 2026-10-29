import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "../../src/Dashboard";

const window = { from: "2026-10-22T12:00:00.000Z", to: "2026-10-29T12:00:00.000Z" };
const ticket = { id: 12, ticketNumber: "TKT-2026-000012", summary: "VPN cannot connect", currentStatus: "IN_PROGRESS", requestedPriority: "HIGH", itPriority: "HIGH", updatedAt: "2026-10-29T10:00:00.000Z" };
const staffData = {
  asOf: window.to,
  resolvedLast7DaysWindow: window,
  metrics: {
    activeTickets: 9,
    unassignedActiveTickets: 2,
    myActiveTickets: 3,
    activeByStatus: { NEW: 1, OPEN: 2, IN_PROGRESS: 3, WAITING_FOR_REQUESTER: 2, REOPENED: 1 },
    activeByItPriority: { LOW: 2, MEDIUM: 5, HIGH: 2 },
    waitingForRequester: 2,
    resolvedLast7Days: 4,
    myActiveActions: 1,
  },
  myActions: [{ id: 31, ticketId: 12, actionAt: "2026-10-29T09:00:00.000Z", description: "Check the VPN adapter", status: "IN_PROGRESS", ticket }],
  recentTickets: [ticket],
};
const resolvedTicket = { ...ticket, id: 13, ticketNumber: "TKT-2026-000013", summary: "Reset the account password", currentStatus: "CLOSED", resolvedAt: "2026-10-28T15:00:00.000Z" };

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe("Issue #70 Staff Dashboard", () => {
  it("shows operational metrics, status and priority filters, Actions Taken, and Ticket links", async () => {
    const user = userEvent.setup();
    const onOpenTickets = vi.fn();
    const onOpenTicket = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => response(staffData)));
    render(<Dashboard token="staff-session" role="IT_STAFF" userId={4} onOpenTickets={onOpenTickets} onOpenTicket={onOpenTicket} />);

    expect(await screen.findByRole("heading", { name: "Staff Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Active tickets: 9/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /IN PROGRESS: 3/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Unassigned active tickets: 2/ }));
    expect(onOpenTickets).toHaveBeenCalledWith({ statusGroup: "active", owner: "unassigned" });
    await user.click(screen.getByRole("button", { name: /HIGH priority: 2/ }));
    expect(onOpenTickets).toHaveBeenCalledWith({ statusGroup: "active", itPriority: "HIGH" });
    await user.click(screen.getByRole("button", { name: "Open ticket TKT-2026-000012 for action 31" }));
    expect(onOpenTicket).toHaveBeenCalledWith(12);
  });

  it("opens resolved-ticket pages with the exact dashboard window", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes("resolved-tickets")
      ? response({ items: [resolvedTicket], nextCursor: null })
      : response(staffData));
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard token="staff-session" role="ADMINISTRATOR" userId={3} onOpenTickets={vi.fn()} onOpenTicket={vi.fn()} />);

    await user.click(await screen.findByRole("button", { name: /Resolved in the last 7 days: 4/ }));
    expect(await screen.findByText("Reset the account password")).toBeInTheDocument();
    const request = fetchMock.mock.calls.find(([input]) => String(input).includes("resolved-tickets"));
    const url = new URL(String(request?.[0]));
    expect(url.pathname).toBe("/api/staff/dashboard/resolved-tickets");
    expect(url.searchParams.get("from")).toBe(window.from);
    expect(url.searchParams.get("to")).toBe(window.to);
  });

  it("shows an explicit empty state and retries a forbidden response safely", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) return response({ error: "Forbidden.", code: "FORBIDDEN" }, 403);
      return response({ ...staffData, myActions: [], recentTickets: [] });
    }));
    render(<Dashboard token="admin-session" role="ADMINISTRATOR" userId={3} onOpenTickets={vi.fn()} onOpenTicket={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have permission to view this dashboard.");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No active Actions Taken are assigned to you.")).toBeInTheDocument();
    expect(screen.getByText("No recently updated tickets.")).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
