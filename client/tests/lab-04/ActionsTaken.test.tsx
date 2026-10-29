import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionsTaken from "../../src/ActionsTaken";

const staff = { id: 4, name: "IT Staff One", role: "IT_STAFF" };
const administrator = { id: 2, name: "Admin One", role: "ADMINISTRATOR" };

type Action = {
  id: number;
  ticketId: number;
  actionAt: string;
  description: string;
  result: string;
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  assignedToUserId: number | null;
  assignedTo: typeof staff | typeof administrator | null;
  performedBy: typeof staff;
  createdAt: string;
  updatedAt: string;
};

function action(id: number, overrides: Partial<Action> = {}): Action {
  return {
    id,
    ticketId: 12,
    actionAt: "2026-10-29T10:00:00.000Z",
    description: `Action ${id} description`,
    result: `Action ${id} result`,
    status: "OPEN",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    assignedToUserId: null,
    assignedTo: null,
    performedBy: staff,
    createdAt: "2026-10-29T10:01:00.000Z",
    updatedAt: "2026-10-29T10:02:00.000Z",
    ...overrides,
  };
}

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function installApiMock(initial: Action[], failFirstCreate = false, holdFirstCreate = false, failFirstLoad = false, failFirstCreateStatus = 0, conflictStatus?: Action["status"]) {
  let rows = [...initial];
  let creates = 0;
  let conflictOnce = true;
  let loadFails = failFirstLoad;
  let releaseHeldCreate: (() => void) | null = null;
  const calls = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    if (url.endsWith("/api/tickets/12/actions") && method === "GET") {
      if (loadFails) {
        loadFails = false;
        return response({ error: "Ticket not found.", code: "NOT_FOUND" }, 404);
      }
      return response({ items: rows });
    }
    if (url.endsWith("/api/staff/users") && method === "GET") return response([staff, administrator]);
    if (url.endsWith("/api/staff/tickets/12/actions") && method === "POST") {
      creates += 1;
      if (failFirstCreate && creates === 1) throw new TypeError("network lost after submit");
      if (failFirstCreateStatus && creates === 1) return response({ error: "Input rejected.", code: "VALIDATION_ERROR" }, failFirstCreateStatus);
      if (holdFirstCreate && creates === 1) await new Promise<void>((resolve) => { releaseHeldCreate = resolve; });
      const assignedToUserId = body.assignedToUserId as number | null;
      const created = action(55, {
        actionAt: String(body.actionAt),
        description: String(body.description),
        result: String(body.result),
        followUpRequired: Boolean(body.followUpRequired),
        followUpNote: body.followUpNote as string | null,
        attachmentNotes: body.attachmentNotes as string | null,
        assignedToUserId,
        assignedTo: assignedToUserId === administrator.id ? administrator : assignedToUserId === staff.id ? staff : null,
      });
      rows = [...rows, created];
      return response({ action: created }, 201);
    }
    const cancelMatch = url.match(/\/api\/staff\/tickets\/12\/actions\/(\d+)\/cancel$/);
    if (cancelMatch && method === "POST") {
      rows = rows.map((item) => item.id === Number(cancelMatch[1]) ? { ...item, status: "CANCELLED", updatedAt: "2026-10-29T10:05:00.000Z" } : item);
      return response({ action: rows.find((item) => item.id === Number(cancelMatch[1])) });
    }
    const patchMatch = url.match(/\/api\/staff\/tickets\/12\/actions\/(\d+)$/);
    if (patchMatch && method === "PATCH") {
      if (conflictOnce) {
        conflictOnce = false;
        rows = rows.map((item) => item.id === Number(patchMatch[1]) ? { ...item, description: "Concurrent update from another staff member", status: conflictStatus ?? item.status, updatedAt: "2026-10-29T10:03:00.000Z" } : item);
        return response({ error: "Action Taken changed; reload and retry.", code: "CONFLICT" }, 409);
      }
      rows = rows.map((item) => item.id === Number(patchMatch[1]) ? {
        ...item,
        ...body,
        assignedTo: body.assignedToUserId === administrator.id ? administrator : body.assignedToUserId === staff.id ? staff : null,
        updatedAt: "2026-10-29T10:04:00.000Z",
      } as Action : item);
      return response({ action: rows.find((item) => item.id === Number(patchMatch[1])) });
    }
    return response({ error: "Unhandled mock route.", code: "NOT_FOUND" }, 404);
  });
  vi.stubGlobal("fetch", calls);
  return { calls, rows: () => rows, releaseHeldCreate: () => releaseHeldCreate?.() };
}

afterEach(() => vi.unstubAllGlobals());

describe("Issue #69 Actions Taken Ticket Detail interface", () => {
  it("shows all action fields in stable chronological order and keeps Requester history read-only", async () => {
    const earlier = action(40, {
      actionAt: "2026-10-28T08:00:00.000Z",
      description: "Restarted the VPN gateway",
      result: "Connection restored",
      status: "COMPLETED",
      followUpRequired: true,
      followUpNote: "Confirm access tomorrow",
      attachmentNotes: "Diagnostic log attached to ticket",
      performedBy: administrator,
      assignedTo: staff,
      assignedToUserId: staff.id,
    });
    const later = action(41, { description: "Checked the VPN profile" });
    installApiMock([later, earlier]);
    render(<ActionsTaken ticketId={12} token="requester-session" canManage={false} ticketActive={false} />);

    expect(await screen.findByText("Restarted the VPN gateway")).toBeInTheDocument();
    expect(screen.getByText("Connection restored")).toBeInTheDocument();
    expect(screen.getByText("Admin One")).toBeInTheDocument();
    expect(screen.getAllByText("IT Staff One")).toHaveLength(2);
    expect(screen.getByText("Confirm access tomorrow")).toBeInTheDocument();
    expect(screen.getByText("Diagnostic log attached to ticket")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(["Action #40", "Action #41"]);
    expect(screen.queryByRole("button", { name: /Add Action Taken/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit action/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Complete action/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cancel action/ })).not.toBeInTheDocument();
  });

  it("creates an assigned action, validates follow-up, and reuses its idempotency key after a lost response", async () => {
    const user = userEvent.setup();
    const { calls, rows } = installApiMock([], true);
    render(<ActionsTaken ticketId={12} token="staff-session" canManage ticketActive />);
    await user.click(await screen.findByRole("button", { name: "Add Action Taken" }));

    fireEvent.change(screen.getByLabelText("Action Date/Time"), { target: { value: "2026-10-29T10:30" } });
    await user.selectOptions(screen.getByLabelText("Assigned To"), String(administrator.id));
    await user.type(screen.getByLabelText("Description"), "Recreated the VPN profile");
    await user.type(screen.getByLabelText("Result"), "Sign-in now succeeds");
    await user.click(screen.getByLabelText("Follow-Up Required"));
    expect(screen.getByLabelText("Follow-up note")).toBeRequired();
    await user.type(screen.getByLabelText("Follow-up note"), "Check again tomorrow");
    await user.type(screen.getByLabelText("Attachment notes"), "No new attachment");

    await user.click(screen.getByRole("button", { name: "Record action" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to reach the backend");
    expect(screen.getByLabelText("Description")).toHaveValue("Recreated the VPN profile");
    const firstPost = calls.mock.calls.find(([, init]) => init?.method === "POST");
    expect(firstPost).toBeDefined();
    const firstKey = (firstPost?.[1]?.headers as Record<string, string>)["Idempotency-Key"];
    expect(firstKey).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Record action" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Action Taken recorded.");
    const posts = calls.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(2);
    expect((posts[1][1]?.headers as Record<string, string>)["Idempotency-Key"]).toBe(firstKey);
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual(JSON.parse(String(posts[1][1]?.body)));
    expect(JSON.parse(String(posts[1][1]?.body))).toMatchObject({
      actionAt: new Date("2026-10-29T10:30").toISOString(),
      description: "Recreated the VPN profile",
      result: "Sign-in now succeeds",
      assignedToUserId: administrator.id,
      followUpRequired: true,
      followUpNote: "Check again tomorrow",
      attachmentNotes: "No new attachment",
    });
    expect(rows()).toHaveLength(1);
  });

  it("rotates the idempotency key after a deterministic create rejection and preserves the form", async () => {
    const user = userEvent.setup();
    const { calls, rows } = installApiMock([], false, false, false, 400);
    render(<ActionsTaken ticketId={12} token="staff-session" canManage ticketActive />);
    await user.click(await screen.findByRole("button", { name: "Add Action Taken" }));
    await user.type(screen.getByLabelText("Description"), "Corrected the VPN profile");
    await user.type(screen.getByLabelText("Result"), "Connection restored");
    await user.click(screen.getByRole("button", { name: "Record action" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Input rejected.");
    expect(screen.getByLabelText("Description")).toHaveValue("Corrected the VPN profile");
    const firstPost = calls.mock.calls.find(([, init]) => init?.method === "POST");
    const firstKey = (firstPost?.[1]?.headers as Record<string, string>)["Idempotency-Key"];

    await user.selectOptions(screen.getByLabelText("Assigned To"), String(administrator.id));
    await user.click(screen.getByRole("button", { name: "Record action" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Action Taken recorded.");
    const posts = calls.mock.calls.filter(([, init]) => init?.method === "POST");
    const secondKey = (posts[1][1]?.headers as Record<string, string>)["Idempotency-Key"];
    expect(secondKey).not.toBe(firstKey);
    expect(JSON.parse(String(posts[1][1]?.body))).toMatchObject({
      description: "Corrected the VPN profile",
      assignedToUserId: administrator.id,
    });
    expect(rows()).toHaveLength(1);
  });

  it("preserves edit values on a conflict, supports status completion, and confirms cancellation", async () => {
    const user = userEvent.setup();
    const first = action(40);
    const second = action(41, { status: "IN_PROGRESS", actionAt: "2026-10-29T11:00:00.000Z" });
    const { calls, rows } = installApiMock([first, second]);
    render(<ActionsTaken ticketId={12} token="staff-session" canManage ticketActive />);

    await user.click(await screen.findByRole("button", { name: "Edit action #40" }));
    await user.clear(screen.getByLabelText("Description"));
    await user.type(screen.getByLabelText("Description"), "Unsaved corrected description");
    await user.selectOptions(screen.getByLabelText("Assigned To"), String(administrator.id));
    await user.selectOptions(screen.getByLabelText("Status"), "IN_PROGRESS");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Action Taken changed; reload and retry.");
    expect(screen.getByLabelText("Description")).toHaveValue("Unsaved corrected description");
    expect(screen.getByText("Concurrent update from another staff member")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Action Taken updated.");
    const patchCalls = calls.mock.calls.filter(([, init]) => init?.method === "PATCH");
    expect(patchCalls[0][1]?.body).toContain('"expectedUpdatedAt":"2026-10-29T10:02:00.000Z"');
    expect(JSON.parse(String(patchCalls[1][1]?.body))).toMatchObject({
      description: "Unsaved corrected description",
      assignedToUserId: administrator.id,
      status: "IN_PROGRESS",
      expectedUpdatedAt: "2026-10-29T10:03:00.000Z",
    });

    const firstAction = screen.getByText("Unsaved corrected description").closest("li");
    expect(firstAction).not.toBeNull();
    await user.click(within(firstAction as HTMLElement).getByRole("button", { name: "Complete action #40" }));
    await waitFor(() => expect(rows().find((item) => item.id === 40)?.status).toBe("COMPLETED"));
    expect(within(firstAction as HTMLElement).getByText("COMPLETED")).toBeInTheDocument();

    const secondAction = screen.getByText("Action 41 description").closest("li");
    expect(secondAction).not.toBeNull();
    await user.click(within(secondAction as HTMLElement).getByRole("button", { name: "Cancel action #41" }));
    expect(within(secondAction as HTMLElement).getByRole("group", { name: "Confirm cancellation of action 41" })).toBeInTheDocument();
    await user.click(within(secondAction as HTMLElement).getByRole("button", { name: "Confirm cancellation" }));
    await waitFor(() => expect(rows().find((item) => item.id === 41)?.status).toBe("CANCELLED"));
    expect(calls.mock.calls.some(([url, init]) => String(url).endsWith("/actions/41/cancel") && init?.method === "POST")).toBe(true);
    expect(within(secondAction as HTMLElement).getByText("CANCELLED")).toBeInTheDocument();
    expect(within(secondAction as HTMLElement).queryByRole("button", { name: /Edit action/ })).not.toBeInTheDocument();
  });

  it("closes an edit form when a conflict refresh shows the action is terminal", async () => {
    const user = userEvent.setup();
    const { calls, rows } = installApiMock([action(40)], false, false, false, 0, "COMPLETED");
    render(<ActionsTaken ticketId={12} token="staff-session" canManage ticketActive />);

    await user.click(await screen.findByRole("button", { name: "Edit action #40" }));
    await user.clear(screen.getByLabelText("Description"));
    await user.type(screen.getByLabelText("Description"), "Unsaved description");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Action Taken changed; reload and retry.");
    expect(rows()[0].status).toBe("COMPLETED");
    expect(screen.getByText("Concurrent update from another staff member")).toBeInTheDocument();
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit action #40" })).not.toBeInTheDocument();
    expect(calls.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(1);
  });

  it("shows explicit empty/loading failure states and hides controls for inactive Tickets", async () => {
    const { calls } = installApiMock([], false, false, true);
    render(<ActionsTaken ticketId={12} token="staff-session" canManage ticketActive={false} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Ticket not found.");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No Actions Taken yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Action Taken" })).not.toBeInTheDocument();
    expect(calls.mock.calls.some(([url]) => String(url).endsWith("/api/staff/users"))).toBe(false);
  });

  it("disables repeated submits while an action create is still in flight", async () => {
    const user = userEvent.setup();
    const { calls, releaseHeldCreate } = installApiMock([], false, true);
    render(<ActionsTaken ticketId={12} token="staff-session" canManage ticketActive />);
    await user.click(await screen.findByRole("button", { name: "Add Action Taken" }));
    await user.type(screen.getByLabelText("Description"), "Checked the connection");
    await user.type(screen.getByLabelText("Result"), "The connection is stable");

    await user.click(screen.getByRole("button", { name: "Record action" }));
    const savingButton = screen.getByRole("button", { name: "Saving…" });
    expect(savingButton).toBeDisabled();
    await user.click(savingButton);
    expect(calls.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);

    releaseHeldCreate();
    expect(await screen.findByRole("status")).toHaveTextContent("Action Taken recorded.");
    expect(calls.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
});
