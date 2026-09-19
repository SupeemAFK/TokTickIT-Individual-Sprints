import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

type ManagedRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
type ManagedUser = { id: number; name: string; email: string; role: ManagedRole; isActive: boolean };
const administrator: ManagedUser = { id: 2, name: "Admin One", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true };
const requester: ManagedUser = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true };
const staff: ManagedUser = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true };
const initialUsers: ManagedUser[] = [requester, staff, administrator];

type CurrentUser = ManagedUser;
type FailurePath = "list" | "create" | null;

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function installAdminApi(currentUser: CurrentUser = administrator, failurePath: FailurePath = null) {
  let users = initialUsers.map((user) => ({ ...user }));
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (url.endsWith("/api/auth/me")) return response({ user: currentUser, mustChangePassword: false });
    if (url.endsWith("/api/categories")) return response([]);
    if (url.endsWith("/api/related-systems")) return response([]);
    if (url.includes("/api/admin/users?") && method === "GET") {
      if (failurePath === "list") return response({ error: "User service unavailable.", code: "SERVER_ERROR" }, 500);
      const params = new URL(url).searchParams;
      const search = (params.get("search") ?? "").toLowerCase();
      const role = params.get("role");
      const items = users.filter((user) => (!search || `${user.name} ${user.email}`.toLowerCase().includes(search)) && (!role || user.role === role));
      return response({ items });
    }
    if (url.endsWith("/api/admin/users") && method === "POST") {
      if (failurePath === "create") return response({ error: "Email is already in use.", code: "CONFLICT" }, 409);
      const body = JSON.parse(String(init?.body));
      const user = { id: 20, name: body.name, email: body.email.toLowerCase(), role: body.role, isActive: body.isActive };
      users = [...users, user];
      return response(user, 201);
    }
    const updateMatch = url.match(/\/api\/admin\/users\/(\d+)$/);
    if (updateMatch && method === "PATCH") {
      const id = Number(updateMatch[1]);
      const body = JSON.parse(String(init?.body));
      users = users.map((user) => user.id === id ? { ...user, ...body } : user);
      return response(users.find((user) => user.id === id));
    }
    const resetMatch = url.match(/\/api\/admin\/users\/(\d+)\/initial-password$/);
    if (resetMatch && method === "POST") return response(null, 204);
    return response({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function calls(fetchMock: ReturnType<typeof vi.fn>, predicate: (url: URL, init?: RequestInit) => boolean) {
  return fetchMock.mock.calls.filter(([input, init]) => predicate(new URL(String(input)), init));
}

async function openUsers(currentUser: CurrentUser = administrator, failurePath: FailurePath = null) {
  sessionStorage.setItem("toktickit.token", "admin-session");
  const fetchMock = installAdminApi(currentUser, failurePath);
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: "User Management" }));
  await screen.findByRole("heading", { name: "User Management" });
  return fetchMock;
}

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); vi.unstubAllGlobals(); });

describe("Issue #40 Administrator User Management UI", () => {
  it("renders desktop and mobile user representations and sends name/email search and role filters", async () => {
    const user = userEvent.setup();
    const fetchMock = await openUsers();

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(document.querySelector(".d-lg-none .user-card")).not.toBeNull();
    expect(screen.getByText("Ada Requester")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search name or email"), "ada");
    await user.selectOptions(document.getElementById("user-role-filter") as HTMLSelectElement, "REQUESTER");
    await waitFor(() => {
      const matching = calls(fetchMock, (url) => url.pathname === "/api/admin/users" && url.searchParams.get("search") === "ada" && url.searchParams.get("role") === "REQUESTER");
      expect(matching.length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Ada Requester")).toBeInTheDocument();
  });

  it("creates, edits, deactivates, and resets a user account without exposing the password", async () => {
    const user = userEvent.setup();
    const fetchMock = await openUsers();

    await user.type(screen.getByLabelText("Name", { selector: "input#new-user-name" }), "New Support");
    await user.type(screen.getByLabelText("Email", { selector: "input#new-user-email" }), "new.support@example.test");
    await user.selectOptions(screen.getByLabelText("Role", { selector: "select#new-user-role" }), "IT_STAFF");
    await user.type(screen.getByLabelText("Initial password"), "InitialStaff123");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() => expect(screen.getByText("User created with a required first-login password change.")).toBeInTheDocument());

    const createCall = calls(fetchMock, (url, init) => url.pathname === "/api/admin/users" && (init?.method ?? "GET") === "POST")[0];
    expect(JSON.parse(String(createCall[1]?.body))).toEqual({ name: "New Support", email: "new.support@example.test", role: "IT_STAFF", initialPassword: "InitialStaff123", isActive: true });
    expect(screen.queryByText("InitialStaff123")).not.toBeInTheDocument();

    const nameInput = screen.getByLabelText("Name for ada@example.test");
    await user.clear(nameInput);
    await user.type(nameInput, "Ada Updated");
    await user.click(screen.getAllByRole("button", { name: "Save changes" })[0]);
    await waitFor(() => expect(screen.getByLabelText("Name for ada@example.test")).toHaveValue("Ada Updated"));

    await user.click(screen.getAllByRole("button", { name: "Deactivate" })[0]);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Reactivate" })).toHaveLength(2));

    vi.spyOn(window, "prompt").mockReturnValue("ResetStaff123");
    await user.click(screen.getAllByRole("button", { name: "Reset password" })[0]);
    await waitFor(() => expect(calls(fetchMock, (url, init) => url.pathname === "/api/admin/users/8/initial-password" && init?.method === "POST")).toHaveLength(1));
    expect(JSON.parse(String(calls(fetchMock, (url, init) => url.pathname === "/api/admin/users/8/initial-password" && init?.method === "POST")[0][1]?.body))).toEqual({ initialPassword: "ResetStaff123" });
  });

  it("shows safe create failure feedback", async () => {
    const user = userEvent.setup();
    await openUsers(administrator, "create");
    await user.type(screen.getByLabelText("Name", { selector: "input#new-user-name" }), "Duplicate");
    await user.type(screen.getByLabelText("Email", { selector: "input#new-user-email" }), "admin@example.test");
    await user.type(screen.getByLabelText("Initial password"), "InitialAdmin123");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email is already in use.");
  });

  it("does not expose User Management navigation to Requesters", async () => {
    sessionStorage.setItem("toktickit.token", "requester-session");
    installAdminApi(requester);
    render(<App />);
    await screen.findByRole("banner");
    expect(screen.queryByRole("button", { name: "User Management" })).not.toBeInTheDocument();
  });
});
