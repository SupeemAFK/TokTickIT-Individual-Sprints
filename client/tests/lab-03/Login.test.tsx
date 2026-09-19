import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

describe("Lab 3 Login", () => {
  it("shows credentials and sign in", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /toktickit login/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it.each(["invalid credentials", "inactive account"])("shows the same safe failure for %s", async (kind) => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/api/auth/login")) {
        return response({ error: "Invalid email or password.", code: "LOGIN_FAILED" }, 401);
      }
      return response({});
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<App />);

    await user.type(screen.getByLabelText("Email"), kind === "inactive account" ? "inactive@example.test" : "unknown@example.test");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(screen.getByRole("heading", { name: "TokTickIT Login" })).toBeInTheDocument();
    expect(screen.queryByText(/inactive/i)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/auth/login"), expect.objectContaining({ method: "POST" }));
  });
});
