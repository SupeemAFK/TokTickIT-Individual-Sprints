import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as api from "../../src/api";
import TicketDetail from "../../src/TicketDetail";

const requester = { id: 1, name: "Anan", email: "anan@test" };
const ticket = { id: 8, requesterId: 1, categoryId: 2, relatedSystemId: 3, ticketNumber: "TKT-2026-000008", summary: "VPN cannot connect", description: "VPN fails after sign in.", requestedPriority: "HIGH" as const, currentStatus: "NEW" as const, createdAt: "2026-08-20T00:00:00.000Z", updatedAt: "2026-08-21T00:00:00.000Z", requester, category: { id: 2, name: "Network" }, relatedSystem: { id: 3, name: "VPN" } };
describe("TicketDetail", () => {
  afterEach(() => vi.restoreAllMocks());
  it("loads the owned ticket with read-only information", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(ticket);
    render(<TicketDetail ticketId={8} requester={requester} onBack={vi.fn()} />);
    expect(await screen.findByText("TKT-2026-000008")).toBeInTheDocument();
    expect(screen.getByText("VPN fails after sign in.")).toBeInTheDocument();
    expect(api.fetchTicket).toHaveBeenCalledWith(8, 1);
  });
  it("shows a safe retryable failure", async () => {
    vi.spyOn(api, "fetchTicket").mockRejectedValue(new Error("Ticket not found."));
    render(<TicketDetail ticketId={8} requester={requester} onBack={vi.fn()} />);
    expect(await screen.findByText("Ticket unavailable")).toBeInTheDocument();
    expect(screen.getByText("Ticket not found.")).toBeInTheDocument();
  });
})
