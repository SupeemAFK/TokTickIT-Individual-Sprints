import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { installFetch, requester } from "./fixtures";

describe("Lab 3 authenticated Requester", () => {
  afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

  it("preserves the Lab 2 ticket controls without a requester selector", async () => {
    sessionStorage.setItem("toktickit.token", "opaque-session");
    const fetchMock = installFetch(requester);
    render(<App />);

    expect(await screen.findByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(document.getElementById("requester-category-filter")).toBeInTheDocument();
    expect(document.getElementById("requester-system-filter")).toBeInTheDocument();
    expect(document.getElementById("requester-priority-filter")).toBeInTheDocument();
    expect(document.getElementById("requester-status-filter")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Development Requester|Change Requester/i)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("requesterId"))).toBe(false);
  });

  it("renders authenticated ticket detail with public comments and resolution action", async () => {
    sessionStorage.setItem("toktickit.token", "opaque-session");
    installFetch(requester);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "Open ticket TKT-2026-000012" }));
    expect(await screen.findByRole("heading", { name: "Ticket Detail" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Public comments" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Problem appears resolved/i })).toBeInTheDocument();
    expect(screen.queryByText("Internal notes")).not.toBeInTheDocument();
  });
});
