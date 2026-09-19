import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { installFetch, staff } from "./fixtures";

describe("Lab 3 IT Staff Ticket Queue", () => {
  afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

  it("renders queue fields, filters, counts, and responsive-card content", async () => {
    sessionStorage.setItem("toktickit.token", "opaque-session");
    installFetch(staff);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    expect(await screen.findByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Requested priority")).toBeInTheDocument();
    expect(screen.getByLabelText("IT priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Page size")).toBeInTheDocument();
    expect(screen.getByText(/matching tickets/i)).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
  });

  it("supports page-size selection without exposing requester ownership controls", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("toktickit.token", "opaque-session");
    const fetchMock = installFetch(staff);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    await user.selectOptions(screen.getByLabelText("Page size"), "20");

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("pageSize=20"))).toBe(true);
    expect(screen.queryByLabelText("Development Requester")).not.toBeInTheDocument();
  });
});
