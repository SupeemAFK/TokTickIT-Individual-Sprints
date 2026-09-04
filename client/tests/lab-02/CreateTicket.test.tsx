import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api";
import CreateTicketForm from "../../src/CreateTicketForm";

const requester = { id: 1, name: "Anan Kittisak", email: "anan.kittisak@toktickit.test" };

function renderForm() {
  return render(<CreateTicketForm requester={requester} onCancel={vi.fn()} />);
}

async function completeValidForm() {
  await userEvent.selectOptions(await screen.findByLabelText(/^Category/), "2");
  await userEvent.selectOptions(screen.getByLabelText(/^Related System/), "3");
  await userEvent.selectOptions(screen.getByLabelText(/^Requested Priority/), "MEDIUM");
  await userEvent.type(screen.getByLabelText(/^Ticket Summary/), "VPN cannot connect");
  await userEvent.type(screen.getByLabelText(/^Description/), "VPN connection fails after signing in.");
}

describe("CreateTicketForm", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 2, name: "Network" }]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 3, name: "VPN" }]);
  });

  afterEach(() => vi.restoreAllMocks());

  it("loads reference data and displays server-generated values as read-only", async () => {
    renderForm();
    expect(await screen.findByRole("option", { name: "Network" })).toBeInTheDocument();
    expect(screen.getByLabelText("Requester")).toHaveValue("Anan Kittisak");
    expect(screen.getByLabelText("Ticket Date")).toHaveValue("Set by server on submission");
    expect(screen.getByLabelText("Ticket Number")).toHaveValue("Generated on submission");
  });

  it("shows field-level validation and does not call the API for an invalid form", async () => {
    const createTicket = vi.spyOn(api, "createTicket");
    renderForm();
    await screen.findByRole("option", { name: "Network" });
    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(await screen.findByText("Choose a category.")).toBeInTheDocument();
    expect(screen.getByText("Description must be between 10 and 4,000 characters.")).toBeInTheDocument();
    expect(createTicket).not.toHaveBeenCalled();
  });

  it("submits the selected requester and shows the official ticket number", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue({ id: 42, ticketNumber: "TKT-2026-000042", requesterId: 1, categoryId: 2, relatedSystemId: 3, summary: "VPN cannot connect", requestedPriority: "MEDIUM", description: "VPN connection fails after signing in.", currentStatus: "NEW", createdAt: "2026-08-25T00:00:00.000Z", updatedAt: "2026-08-25T00:00:00.000Z" });
    const uploadAttachment = vi.spyOn(api, "uploadAttachment").mockResolvedValue({ id: 1, originalFilename: "note.pdf", mimeType: "application/pdf", byteSize: 1, createdAt: "2026-08-25T00:00:00.000Z", removedAt: null, removalReason: null });
    renderForm();
    await completeValidForm();
    await userEvent.upload(screen.getByLabelText("Attachments"), new File(["x"], "note.pdf", { type: "application/pdf" }));
    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(await screen.findByText("TKT-2026-000042")).toBeInTheDocument();
    expect(uploadAttachment).toHaveBeenCalledWith(42, 1, expect.any(File));
    expect(api.createTicket).toHaveBeenCalledWith(expect.objectContaining({ requesterId: 1, categoryId: 2, relatedSystemId: 3 }));
  });

  it("keeps entered values when ticket creation fails", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Unable to create the ticket."));
    renderForm();
    await completeValidForm();
    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    expect(await screen.findByText("Ticket not created")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Ticket Summary/)).toHaveValue("VPN cannot connect");
  });

  it("disables duplicate submission while the request is pending", async () => {
    let resolveTicket: (ticket: api.Ticket) => void;
    vi.spyOn(api, "createTicket").mockReturnValue(new Promise((resolve) => { resolveTicket = resolve; }));
    renderForm();
    await completeValidForm();
    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));
    const submittingButton = screen.getByRole("button", { name: /submitting/i });
    expect(submittingButton).toBeDisabled();
    await userEvent.click(submittingButton);
    expect(api.createTicket).toHaveBeenCalledTimes(1);
    resolveTicket!({ id: 42, ticketNumber: "TKT-2026-000042", requesterId: 1, categoryId: 2, relatedSystemId: 3, summary: "VPN cannot connect", requestedPriority: "MEDIUM", description: "VPN connection fails after signing in.", currentStatus: "NEW", createdAt: "2026-08-25T00:00:00.000Z", updatedAt: "2026-08-25T00:00:00.000Z" });
    expect(await screen.findByText("TKT-2026-000042")).toBeInTheDocument();
  });
});
