import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

const staff = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true } as const;
const administrator = { id: 2, name: "Admin One", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true } as const;
const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true } as const;
const category = { id: 1, name: "Network" };
const system = { id: 2, name: "VPN" };
const queueItem = {
  id: 12,
  ticketNumber: "TKT-2026-000012",
  summary: "VPN cannot connect",
  requestedPriority: "HIGH",
  itPriority: "MEDIUM",
  currentStatus: "IN_PROGRESS",
  owner: null,
  requester: { id: requester.id, name: requester.name },
  category,
  relatedSystem: system,
  createdAt: "2026-09-19T08:00:00.000Z",
  updatedAt: "2026-09-19T09:00:00.000Z",
};
const detail = { ...queueItem, description: "VPN fails after sign in.", requester, attachments: [], publicComments: [], internalNotes: [] };
const counts = { totalItems: 21, unassigned: 7, byStatus: { NEW: 4, OPEN: 3, IN_PROGRESS: 8, WAITING_FOR_REQUESTER: 2, RESOLVED: 2, CLOSED: 1, REOPENED: 1, CANCELLED: 0 }, byItPriority: { LOW: 3, MEDIUM: 10, HIGH: 8 } };

type QueueMode = "normal" | "empty" | "no-results" | "error";
function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => new Blob(["file"]) } as Response;
}

function installQueueApi(mode: QueueMode = "normal", currentUser: typeof staff | typeof administrator | typeof requester = staff) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/api/auth/me")) return response({ user: currentUser, mustChangePassword: false });
    if (url.endsWith("/api/staff/users")) return response([staff, administrator]);
    if (url.endsWith("/api/categories")) return response([category]);
    if (url.endsWith("/api/related-systems")) return response([system]);
    if (url.includes("/api/staff/tickets?") && method === "GET") {
      if (mode === "error") return response({ error: "Queue unavailable.", code: "SERVER_ERROR" }, 500);
      if (mode === "empty") return response({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }, counts: { totalItems: 0, unassigned: 0, byStatus: {}, byItPriority: {} } });
      const params = new URL(url).searchParams;
      if (mode === "no-results") return response({ items: [], pagination: { page: Number(params.get("page") ?? 1), pageSize: Number(params.get("pageSize") ?? 10), totalItems: 21, totalPages: 2 }, counts });
      const page = Number(params.get("page") ?? 1);
      const item = page === 2 ? { ...queueItem, id: 13, ticketNumber: "TKT-2026-000013", summary: "Second page ticket" } : queueItem;
      return response({ items: [item], pagination: { page, pageSize: Number(params.get("pageSize") ?? 10), totalItems: 21, totalPages: 2 }, counts });
    }
    if (url.endsWith("/api/staff/tickets/12") && method === "GET") return response({ ticket: detail });
    return response({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function queueRequests(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls
    .filter(([url, init]) => String(url).includes("/api/staff/tickets?") && (init?.method ?? "GET") === "GET")
    .map(([url]) => new URL(String(url)));
}

afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

describe("Issue #38 IT Staff Ticket Queue UI", () => {
  it("renders responsive queue representations and sends all documented filters", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("toktickit.token", "queue-session");
    const fetchMock = installQueueApi();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(document.querySelector("table.d-none.d-lg-table")).not.toBeNull();
    expect(document.querySelector(".d-lg-none .queue-card")).not.toBeNull();
    expect(screen.getByText("21 matching tickets")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("7 unassigned");

    await screen.findByRole("option", { name: "IT Staff One" });
    await user.type(screen.getByLabelText("Search"), "VPN");
    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");
    await user.selectOptions(screen.getByLabelText("Owner"), "unassigned");
    await user.selectOptions(screen.getByLabelText("Requested priority"), "HIGH");
    await user.selectOptions(screen.getByLabelText("IT priority"), "MEDIUM");
    await user.selectOptions(screen.getByLabelText("Category"), "1");
    await user.type(screen.getByLabelText("Requester ID"), "8");
    await user.selectOptions(screen.getByLabelText("Sort by"), "summary");
    await user.selectOptions(screen.getByLabelText("Direction"), "asc");
    await user.selectOptions(screen.getByLabelText("Page size"), "20");

    await waitFor(() => {
      const matching = queueRequests(fetchMock).find((url) => url.searchParams.get("search") === "VPN" && url.searchParams.get("requesterId") === "8" && url.searchParams.get("pageSize") === "20");
      expect(matching?.searchParams.get("status")).toBe("IN_PROGRESS");
      expect(matching?.searchParams.get("ownerUserId")).toBe("null");
      expect(matching?.searchParams.get("requestedPriority")).toBe("HIGH");
      expect(matching?.searchParams.get("itPriority")).toBe("MEDIUM");
      expect(matching?.searchParams.get("categoryId")).toBe("1");
      expect(matching?.searchParams.get("sort")).toBe("summary");
      expect(matching?.searchParams.get("direction")).toBe("asc");
    });
  });

  it("opens the selected ticket detail from the queue", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("toktickit.token", "queue-session");
    const fetchMock = installQueueApi();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    await user.click((await screen.findAllByRole("button", { name: "Open TKT-2026-000012" }))[0]);

    expect(await screen.findByRole("heading", { name: "Staff Ticket Detail" })).toBeInTheDocument();
    expect(screen.getByText("VPN fails after sign in.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/api/staff/tickets/12"))).toBe(true);
  });

  it("moves between pages and clears queue filters back to documented defaults", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("toktickit.token", "queue-session");
    const fetchMock = installQueueApi();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    await screen.findAllByText("TKT-2026-000012");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(screen.getByText("Page 2 of 2")).toBeInTheDocument());
    await waitFor(() => expect(queueRequests(fetchMock).at(-1)?.searchParams.get("page")).toBe("2"));
    expect(await screen.findAllByText("TKT-2026-000013")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() => expect(screen.getByText("Page 1 of 2")).toBeInTheDocument());
    await waitFor(() => expect(queueRequests(fetchMock).at(-1)?.searchParams.get("page")).toBe("1"));

    await user.type(screen.getByLabelText("Search"), "VPN");
    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");
    await user.selectOptions(screen.getByLabelText("Page size"), "20");
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => {
      const latest = queueRequests(fetchMock).at(-1);
      expect(latest?.searchParams.get("page")).toBe("1");
      expect(latest?.searchParams.get("pageSize")).toBe("10");
      expect(latest?.searchParams.get("sort")).toBe("updatedAt");
      expect(latest?.searchParams.get("direction")).toBe("desc");
      expect(latest?.searchParams.has("search")).toBe(false);
      expect(latest?.searchParams.has("status")).toBe(false);
    });
    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(screen.getByLabelText("Status")).toHaveValue("");
    expect(screen.getByLabelText("Page size")).toHaveValue("10");
  });

  it("shows safe queue failure feedback with retry", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("toktickit.token", "queue-session");
    installQueueApi("error");
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Queue unavailable.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("shows an empty queue message", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("toktickit.token", "queue-session");
    installQueueApi("empty");
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    expect(await screen.findByText("No tickets in the queue.")).toBeInTheDocument();
  });

  it("shows a distinct no-results message when the queue has tickets outside the current filters", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("toktickit.token", "queue-session");
    installQueueApi("no-results");
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    expect(await screen.findByText("No matching tickets.")).toBeInTheDocument();
    expect(screen.queryByText("No tickets in the queue.")).not.toBeInTheDocument();
    expect(screen.getByText("21 matching tickets")).toBeInTheDocument();
  });

  it("does not expose queue navigation to a Requester", async () => {
    sessionStorage.setItem("toktickit.token", "requester-session");
    installQueueApi("normal", requester);
    render(<App />);

    expect(await screen.findByRole("banner")).toHaveTextContent("Ada Requester");
    expect(screen.queryByRole("button", { name: "Ticket Queue" })).not.toBeInTheDocument();
  });
});
