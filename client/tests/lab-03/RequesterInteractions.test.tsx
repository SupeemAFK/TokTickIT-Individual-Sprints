import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true };
const category = { id: 1, name: "Network" };
const system = { id: 2, name: "VPN" };
const calls = (fetchMock: ReturnType<typeof vi.fn>, path: string, method: string) => fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith(path) && ((init?.method ?? "GET") === method));

function installRequesterApi() {
  let comments: Array<{ id: number; content: string; author: typeof requester; createdAt: string }> = [];
  let resolvedAt: string | null = null;
  const ticket = () => ({
    id: 12, ticketNumber: "TKT-2026-000012", summary: "VPN cannot connect", description: "VPN fails after sign in.",
    requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS", owner: null, requester, category, relatedSystem: system,
    attachments: [], publicComments: comments, internalNotes: [], problemAppearsResolvedAt: resolvedAt,
    createdAt: "2026-09-19T08:00:00.000Z", updatedAt: "2026-09-19T08:00:00.000Z",
  });
  const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => new Blob(["file"]) }) as Response;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/api/auth/me")) return response({ user: requester, mustChangePassword: false });
    if (url.endsWith("/api/categories")) return response([category]);
    if (url.endsWith("/api/related-systems")) return response([system]);
    if (url.includes("/api/tickets?") && method === "GET") return response({ items: [ticket()], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    if (url.endsWith("/api/tickets/12") && method === "GET") return response({ ticket: ticket() });
    if (url.endsWith("/api/tickets/12/comments") && method === "GET") return response({ items: comments });
    if (url.endsWith("/api/tickets/12/comments") && method === "POST") {
      const body = JSON.parse(String(init?.body));
      comments = [{ id: 20, content: body.content, author: requester, createdAt: "2026-09-19T10:00:00.000Z" }];
      return response(comments[0], 201);
    }
    if (url.endsWith("/api/tickets/12/resolution-signal") && method === "POST") {
      resolvedAt = "2026-09-19T10:01:00.000Z";
      return response({ ticket: ticket() });
    }
    return response({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

describe("Lab 3 Requester interactions", () => {
  it("posts a Public Comment with the authenticated ticket and content", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("toktickit.token", "opaque-session");
    const fetchMock = installRequesterApi();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Open ticket TKT-2026-000012" }));
    await user.type(screen.getByRole("textbox", { name: "Public comment" }), "VPN is working now.");
    await user.click(screen.getByRole("button", { name: "Comment" }));

    await waitFor(() => expect(screen.getByRole("listitem")).toHaveTextContent("VPN is working now."));
    const commentCalls = calls(fetchMock, "/api/tickets/12/comments", "POST");
    expect(commentCalls).toHaveLength(1);
    expect(JSON.parse(String(commentCalls[0][1]?.body))).toEqual({ content: "VPN is working now." });
  });

  it("records the resolution signal and shows the resulting state", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("toktickit.token", "opaque-session");
    const fetchMock = installRequesterApi();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Open ticket TKT-2026-000012" }));
    await user.click(screen.getByRole("button", { name: "Problem Appears Resolved" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("You reported that this problem appears resolved."));
    expect(screen.queryByRole("button", { name: "Problem Appears Resolved" })).not.toBeInTheDocument();
    const resolutionCalls = calls(fetchMock, "/api/tickets/12/resolution-signal", "POST");
    expect(resolutionCalls).toHaveLength(1);
    expect(resolutionCalls[0][1]?.body).toBeUndefined();
  });
});
