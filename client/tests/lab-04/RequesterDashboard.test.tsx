import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Dashboard from "../../src/Dashboard";

const window = { from: "2026-09-29T12:00:00.000Z", to: "2026-10-29T12:00:00.000Z" };
const attentionTicket = { id: 14, ticketNumber: "TKT-2026-000014", summary: "Reply to the VPN question", currentStatus: "WAITING_FOR_REQUESTER", requestedPriority: "HIGH", itPriority: "HIGH", updatedAt: "2026-10-28T10:00:00.000Z" };
const recentTicket = { id: 15, ticketNumber: "TKT-2026-000015", summary: "Check the network adapter", currentStatus: "IN_PROGRESS", requestedPriority: "MEDIUM", itPriority: "MEDIUM", updatedAt: "2026-10-28T09:00:00.000Z" };
const resolvedTicket = { id: 16, ticketNumber: "TKT-2026-000016", summary: "Restore email access", currentStatus: "CLOSED", requestedPriority: "LOW", itPriority: "LOW", resolvedAt: "2026-10-27T11:00:00.000Z" };
const requesterData = {
  asOf: window.to,
  resolvedLast30DaysWindow: window,
  metrics: { totalTickets: 8, activeTickets: 3, waitingForRequester: 1, resolvedLast30Days: 2 },
  attentionTickets: [attentionTicket],
  recentlyResolvedTickets: [resolvedTicket],
  recentTickets: [recentTicket],
};

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

afterEach(() => vi.unstubAllGlobals());

describe("Issue #70 Requester Dashboard", () => {
  it("shows owned metrics and ticket lists with accessible filtered and detail drill-downs", async () => {
    const user = userEvent.setup();
    const onOpenTickets = vi.fn();
    const onOpenTicket = vi.fn();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer requester-session");
      return response(requesterData);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard token="requester-session" role="REQUESTER" userId={8} onOpenTickets={onOpenTickets} onOpenTicket={onOpenTicket} />);

    expect(await screen.findByRole("heading", { name: "Requester Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Total tickets: 8/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Active tickets: 3/ }));
    expect(onOpenTickets).toHaveBeenCalledWith({ statusGroup: "active" });
    await user.click(screen.getByRole("button", { name: /Waiting for your reply: 1/ }));
    expect(onOpenTickets).toHaveBeenCalledWith({ status: "WAITING_FOR_REQUESTER" });
    await user.click(screen.getByRole("button", { name: /Open ticket TKT-2026-000014/ }));
    expect(onOpenTicket).toHaveBeenCalledWith(14);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/requester/dashboard"), expect.any(Object));
  });

  it("requests resolved pages with the exact server window and supports retry and paging", async () => {
    const user = userEvent.setup();
    const onOpenTicket = vi.fn();
    const pageOne = { items: [resolvedTicket], nextCursor: "next-page-token" };
    const pageTwo = { items: [{ ...resolvedTicket, id: 17, ticketNumber: "TKT-2026-000017", summary: "Replace the display cable" }], nextCursor: null };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/requester/dashboard") return response(requesterData);
      if (url.pathname === "/api/requester/dashboard/resolved-tickets" && url.searchParams.get("cursor")) return response(pageTwo);
      if (url.pathname === "/api/requester/dashboard/resolved-tickets") return response(pageOne);
      return response({ error: "Not found." }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Dashboard token="requester-session" role="REQUESTER" userId={8} onOpenTickets={vi.fn()} onOpenTicket={onOpenTicket} />);

    await user.click(await screen.findByRole("button", { name: /Resolved in the last 30 days: 2/ }));
    expect(await screen.findByRole("heading", { name: "Resolved Tickets" })).toBeInTheDocument();
    expect(screen.getByText("Restore email access")).toBeInTheDocument();
    const firstResolvedRequest = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/requester/dashboard/resolved-tickets"));
    const firstUrl = new URL(String(firstResolvedRequest?.[0]));
    expect(firstUrl.searchParams.get("from")).toBe(window.from);
    expect(firstUrl.searchParams.get("to")).toBe(window.to);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Replace the display cable")).toBeInTheDocument();
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("Restore email access")).toBeInTheDocument();
  });

  it("shows empty state and a retry action after a safe API failure", async () => {
    const user = userEvent.setup();
    let failures = 1;
    vi.stubGlobal("fetch", vi.fn(async () => {
      if (failures-- > 0) return response({ error: "Dashboard unavailable.", code: "SERVER_ERROR" }, 500);
      return response({ ...requesterData, attentionTickets: [], recentTickets: [], recentlyResolvedTickets: [] });
    }));
    render(<Dashboard token="requester-session" role="REQUESTER" userId={8} onOpenTickets={vi.fn()} onOpenTicket={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Dashboard unavailable.");
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No tickets need a reply right now.")).toBeInTheDocument();
    expect(screen.getByText("No recently updated tickets.")).toBeInTheDocument();
    expect(screen.getByText("No tickets were resolved in this period.")).toBeInTheDocument();
  });
});
