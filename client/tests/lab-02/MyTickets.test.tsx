import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api";
import MyTickets from "../../src/MyTickets";

const requester = { id: 2, name: "Mali Charoen", email: "mali@test" };
const ticket = { id: 8, ticketNumber: "TKT-2026-000008", summary: "VPN cannot connect", currentStatus: "NEW" as const, requestedPriority: "HIGH" as const, category: { id: 1, name: "Network" }, relatedSystem: { id: 2, name: "VPN" }, createdAt: "2026-08-20T00:00:00.000Z", updatedAt: "2026-08-21T00:00:00.000Z" };
describe("MyTickets", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Network" }]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 2, name: "VPN" }]);
  });
  afterEach(() => vi.restoreAllMocks());
  it("loads only the selected requester tickets and applies search", async () => {
    const fetchTickets = vi.spyOn(api, "fetchTickets").mockResolvedValue({ items: [ticket], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    render(<MyTickets requester={requester} onCreateTicket={vi.fn()} />);
    expect((await screen.findAllByText(ticket.ticketNumber)).length).toBeGreaterThan(0);
    expect(fetchTickets).toHaveBeenCalledWith(2, expect.objectContaining({ sort: "createdAt", direction: "desc", page: 1, pageSize: 10 }));
    await userEvent.type(screen.getByLabelText("Search"), "vpn");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(fetchTickets).toHaveBeenLastCalledWith(2, expect.objectContaining({ search: "vpn", page: 1 }));
  });
  it("distinguishes no tickets from no matching tickets", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
    render(<MyTickets requester={requester} onCreateTicket={vi.fn()} />);
    expect(await screen.findByText("No tickets yet")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Search"), "vpn");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("No matching tickets")).toBeInTheDocument();
  });
  it("shows a retryable API failure", async () => {
    vi.spyOn(api, "fetchTickets").mockRejectedValue(new Error("Ticket list request failed with HTTP 500."));
    render(<MyTickets requester={requester} onCreateTicket={vi.fn()} />);
    expect(await screen.findByText("Tickets unavailable")).toBeInTheDocument();
    expect(screen.getByText(/ticket list request failed/i)).toBeInTheDocument();
  });
})
