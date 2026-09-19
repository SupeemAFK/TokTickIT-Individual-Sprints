import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

const staff = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true } as const;
const administrator = { id: 2, name: "Admin One", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true } as const;
const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true } as const;
const category = { id: 1, name: "Network" };
const relatedSystem = { id: 2, name: "VPN" };
const attachment = { id: 4, originalFilename: "screenshot.png", mimeType: "image/png", byteSize: 20, createdAt: "2026-09-19T08:03:00.000Z", removedAt: null, removalReason: null };

type CurrentUser = typeof staff | typeof administrator | typeof requester;
type FailurePath = "comment" | null;

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => new Blob(["attachment"]) } as Response;
}

function installStaffApi(currentUser: CurrentUser = staff, failurePath: FailurePath = null) {
  let ticket = {
    id: 12,
    ticketNumber: "TKT-2026-000012",
    summary: "VPN cannot connect",
    description: "VPN fails after signing in.",
    requestedPriority: "HIGH",
    itPriority: "MEDIUM",
    currentStatus: "OPEN",
    owner: null as typeof staff | typeof administrator | null,
    requester,
    category,
    relatedSystem,
    attachments: [attachment],
    publicComments: [{ id: 31, content: "Existing public update", author: staff, createdAt: "2026-09-19T08:05:00.000Z" }],
    internalNotes: [{ id: 9, content: "Existing private note", author: staff, createdAt: "2026-09-19T08:06:00.000Z" }],
    problemAppearsResolvedAt: null,
    createdAt: "2026-09-19T08:00:00.000Z",
    updatedAt: "2026-09-19T08:07:00.000Z",
  };
  const summary = () => ({ ...ticket, requester: undefined, attachments: undefined, publicComments: undefined, internalNotes: undefined });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (url.endsWith("/api/auth/me")) return response({ user: currentUser, mustChangePassword: false });
    if (url.endsWith("/api/staff/users")) return response([staff, administrator]);
    if (url.endsWith("/api/categories")) return response([category]);
    if (url.endsWith("/api/related-systems")) return response([relatedSystem]);
    if (url.includes("/api/staff/tickets?") && method === "GET") return response({ items: [summary()], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }, counts: { totalItems: 1, unassigned: ticket.owner ? 0 : 1, byStatus: { OPEN: 1 }, byItPriority: { MEDIUM: 1, HIGH: 0, LOW: 0 } } });
    if (url.endsWith("/api/staff/tickets/12") && method === "GET") return response({ ticket });
    if (url.endsWith("/api/staff/tickets/12/claim") && method === "POST") { ticket = { ...ticket, owner: staff }; return response({ ticket: summary() }); }
    if (url.endsWith("/api/staff/tickets/12/owner") && method === "PATCH") { ticket = { ...ticket, owner: body.ownerUserId === administrator.id ? administrator : body.ownerUserId === null ? null : staff }; return response({ ticket: summary() }); }
    if (url.endsWith("/api/staff/tickets/12/priority") && method === "PATCH") { ticket = { ...ticket, itPriority: body.itPriority }; return response({ ticket: summary() }); }
    if (url.endsWith("/api/staff/tickets/12/status") && method === "PATCH") { ticket = { ...ticket, currentStatus: body.currentStatus }; return response({ ticket: summary() }); }
    if (url.endsWith("/api/staff/tickets/12/comments") && method === "POST") {
      if (failurePath === "comment") return response({ error: "Comment service unavailable.", code: "SERVER_ERROR" }, 500);
      ticket = { ...ticket, publicComments: [...ticket.publicComments, { id: 32, content: body.content, author: staff, createdAt: "2026-09-19T10:00:00.000Z" }] };
      return response(ticket.publicComments.at(-1), 201);
    }
    if (url.endsWith("/api/staff/tickets/12/notes") && method === "POST") {
      ticket = { ...ticket, internalNotes: [...ticket.internalNotes, { id: 10, content: body.content, author: staff, createdAt: "2026-09-19T10:01:00.000Z" }] };
      return response(ticket.internalNotes.at(-1), 201);
    }
    if (url.endsWith("/api/staff/attachments/4/download") && method === "GET") return response(null);
    return response({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function calls(fetchMock: ReturnType<typeof vi.fn>, path: string, method: string) {
  return fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith(path) && (init?.method ?? "GET") === method);
}

async function openStaffDetail(user = staff, failurePath: FailurePath = null) {
  sessionStorage.setItem("toktickit.token", "staff-session");
  const fetchMock = installStaffApi(user, failurePath);
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: "Ticket Queue" }));
  await userEvent.click((await screen.findAllByRole("button", { name: "Open TKT-2026-000012" }))[0]);
  await screen.findByRole("heading", { name: "Staff Ticket Detail" });
  return fetchMock;
}

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); vi.unstubAllGlobals(); });

describe("Issue #39 IT Staff Ticket Detail UI", () => {
  it("completes claim, reassign, priority, status, Public Comment, and Internal Note workflows", async () => {
    const user = userEvent.setup();
    const fetchMock = await openStaffDetail();

    expect(screen.getByText("Ada Requester (ada@example.test)")).toBeInTheDocument();
    expect(screen.getByText(/Existing public update/)).toBeInTheDocument();
    expect(screen.getByText(/Existing private note/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download attachment" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "IN_PROGRESS" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "CLOSED" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Claim ticket" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Already assigned" })).toBeInTheDocument());
    expect(screen.getByLabelText("Owner")).toHaveValue(String(staff.id));

    await user.selectOptions(screen.getByLabelText("Owner"), String(administrator.id));
    await waitFor(() => expect(screen.getByLabelText("Owner")).toHaveValue(String(administrator.id)));
    await user.selectOptions(screen.getByLabelText("IT priority"), "HIGH");
    await waitFor(() => expect(screen.getByLabelText("IT priority")).toHaveValue("HIGH"));
    await user.selectOptions(screen.getByLabelText("Workflow status"), "IN_PROGRESS");
    await waitFor(() => expect(screen.getByLabelText("Workflow status")).toHaveValue("IN_PROGRESS"));

    await user.type(screen.getByRole("textbox", { name: "Staff public comment" }), "Public update from staff.");
    await user.click(screen.getByRole("button", { name: "Comment" }));
    await waitFor(() => expect(screen.getByText(/Public update from staff/)).toBeInTheDocument());

    await user.type(screen.getByRole("textbox", { name: "Internal note" }), "Private investigation note.");
    await user.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(screen.getByText(/Private investigation note/)).toBeInTheDocument());

    expect(calls(fetchMock, "/api/staff/tickets/12/claim", "POST")).toHaveLength(1);
    expect(JSON.parse(String(calls(fetchMock, "/api/staff/tickets/12/owner", "PATCH")[0][1]?.body))).toEqual({ ownerUserId: administrator.id });
    expect(JSON.parse(String(calls(fetchMock, "/api/staff/tickets/12/priority", "PATCH")[0][1]?.body))).toEqual({ itPriority: "HIGH" });
    expect(JSON.parse(String(calls(fetchMock, "/api/staff/tickets/12/status", "PATCH")[0][1]?.body))).toEqual({ currentStatus: "IN_PROGRESS" });
    expect(JSON.parse(String(calls(fetchMock, "/api/staff/tickets/12/comments", "POST")[0][1]?.body))).toEqual({ content: "Public update from staff." });
    expect(JSON.parse(String(calls(fetchMock, "/api/staff/tickets/12/notes", "POST")[0][1]?.body))).toEqual({ content: "Private investigation note." });
  });

  it("keeps the authorized attachment download action connected to the staff endpoint", async () => {
    const user = userEvent.setup();
    const fetchMock = await openStaffDetail();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:attachment"), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await user.click(screen.getByRole("button", { name: "Download attachment" }));

    expect(calls(fetchMock, "/api/staff/attachments/4/download", "GET")).toHaveLength(1);
  });

  it("shows safe failure feedback when a staff update cannot be saved", async () => {
    const user = userEvent.setup();
    await openStaffDetail(staff, "comment");

    await user.type(screen.getByRole("textbox", { name: "Staff public comment" }), "Will not save");
    await user.click(screen.getByRole("button", { name: "Comment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Comment service unavailable.");
  });

  it("does not expose staff detail navigation to a Requester", async () => {
    sessionStorage.setItem("toktickit.token", "requester-session");
    installStaffApi(requester);
    render(<App />);

    await screen.findByRole("banner");
    expect(screen.queryByRole("button", { name: "Ticket Queue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Staff Ticket Detail" })).not.toBeInTheDocument();
  });
});
