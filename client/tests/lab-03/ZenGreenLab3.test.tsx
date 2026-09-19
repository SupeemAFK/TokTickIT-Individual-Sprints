import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../../src/App";
import { installFetch, requester } from "./fixtures";

describe("Lab 3 Zen Green accessibility surface", () => {
  afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

  it("uses the authenticated shell, text labels, status feedback, and visible action names", async () => {
    sessionStorage.setItem("toktickit.token", "opaque-session");
    installFetch(requester);
    render(<App />);

    const page = await screen.findByText(/IT Service Desk/);
    expect(page.closest(".toktickit-page")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toHaveAttribute("id", "requester-search");
  });
});
