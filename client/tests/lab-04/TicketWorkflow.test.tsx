import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

const staff = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true } as const;
const ticketRecord = () => ({
  id: 12,
  ticketNumber: "TKT-2026-000012",
  summary: "VPN cannot connect",
  description: "VPN fails after signing in.",
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  currentStatus: "OPEN",
  owner: null,
  requester: { id: 8, name: "Ada Requester", email: "ada@example.test" },
  category: { id: 1, name: "Network" },
  relatedSystem: { id: 2, name: "VPN" },
  attachments: [],
  publicComments: [],
  internalNotes: [],
  problemAppearsResolvedAt: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-28T10:00:00.000Z",
});

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => new Blob() } as Response;
}

function installWorkflowApi(conflictOnStatus = false) {
  let ticket = ticketRecord();
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (url.endsWith("/api/auth/me")) return response({ user: staff, mustChangePassword: false });
    if (url.endsWith("/api/staff/users")) return response([staff]);
    if (url.endsWith("/api/categories")) return response([{ id: 1, name: "Network" }]);
    if (url.includes("/api/staff/tickets?") && method === "GET") return response({ items: [{ ...ticket, internalNotes: undefined, attachments: undefined, publicComments: undefined }], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }, counts: { totalItems: 1, unassigned: 1, byStatus: { OPEN: 1 }, byItPriority: { LOW: 0, MEDIUM: 1, HIGH: 0 } } });
    if (url.endsWith("/api/staff/tickets/12") && method === "GET") return response({ ticket });
    if (url.endsWith("/api/staff/tickets/12/status") && method === "PATCH") {
      if (conflictOnStatus) {
        ticket = { ...ticket, currentStatus: "WAITING_FOR_REQUESTER", updatedAt: "2026-10-28T10:05:00.000Z" };
        return response({ error: "Ticket changed; reload and retry.", code: "CONFLICT" }, 409);
      }
      if (body.expectedCurrentStatus !== ticket.currentStatus) return response({ error: "Ticket changed; reload and retry.", code: "CONFLICT" }, 409);
      ticket = { ...ticket, currentStatus: body.currentStatus, updatedAt: "2026-10-28T10:05:00.000Z" };
      return response({ ticket: { ...ticket, requester: undefined, attachments: undefined, publicComments: undefined, internalNotes: undefined } });
    }
    return response({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function openTicketDetail() {
  sessionStorage.setItem("toktickit.token", "staff-session");
  const fetchMock = installWorkflowApi();
  render(<App />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Ticket Queue" }));
  await user.click((await screen.findAllByRole("button", { name: "Open TKT-2026-000012" }))[0]);
  await screen.findByRole("heading", { name: "Staff Ticket Detail" });
  return { fetchMock, user };
}

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); vi.unstubAllGlobals(); });

describe("Lab 4 Ticket workflow controls", () => {
  it("submits the expected status, updates the detail summary, and offers only allowed transitions", async () => {
    const { fetchMock, user } = await openTicketDetail();
    const status = screen.getByRole("combobox", { name: "Workflow status" });
    expect(screen.getByRole("option", { name: "IN_PROGRESS" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "CLOSED" })).not.toBeInTheDocument();

    await user.selectOptions(status, "IN_PROGRESS");

    await waitFor(() => expect(screen.getByRole("combobox", { name: "Workflow status" })).toHaveValue("IN_PROGRESS"));
    const call = fetchMock.mock.calls.find(([url, init]) => String(url).endsWith("/api/staff/tickets/12/status") && init?.method === "PATCH");
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ currentStatus: "IN_PROGRESS", expectedCurrentStatus: "OPEN" });
    expect(screen.getByRole("heading", { name: "Staff Ticket Detail" })).toBeInTheDocument();
  });

  it("refreshes the Ticket after a conflict, restores its real status, and keeps safe feedback visible", async () => {
    sessionStorage.setItem("toktickit.token", "staff-session");
    const fetchMock = installWorkflowApi(true);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    await user.click((await screen.findAllByRole("button", { name: "Open TKT-2026-000012" }))[0]);
    await screen.findByRole("heading", { name: "Staff Ticket Detail" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Workflow status" }), "IN_PROGRESS");

    expect(await screen.findByRole("alert")).toHaveTextContent("Ticket changed; reload and retry.");
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Workflow status" })).toHaveValue("WAITING_FOR_REQUESTER"));
    expect(screen.getByRole("heading", { name: "Staff Ticket Detail" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith("/api/staff/tickets/12") && (init?.method ?? "GET") === "GET").length).toBeGreaterThanOrEqual(2);
  });
});
