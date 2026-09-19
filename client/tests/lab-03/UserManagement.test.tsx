import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { administrator, installFetch } from "./fixtures";

describe("Lab 3 Administrator User Management", () => {
  afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

  it("supports search, role filtering, edit fields, activation, and mobile cards", async () => {
    sessionStorage.setItem("toktickit.token", "opaque-session");
    installFetch(administrator);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "User Management" }));
    expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search name or email")).toBeInTheDocument();
    expect(document.getElementById("user-role-filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Name for ada@example.test")).toBeInTheDocument();
    expect(screen.getByLabelText("Email for Ada Requester")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Deactivate" }).length).toBeGreaterThan(0);
    expect(document.getElementById("mobile-user-name-8")).toBeInTheDocument();
  });

  it("keeps user creation validation visible", async () => {
    await userEvent.setup();
    sessionStorage.setItem("toktickit.token", "opaque-session");
    installFetch(administrator);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "User Management" }));
    expect(screen.getByLabelText("Initial password")).toHaveAttribute("minLength", "12");
    expect(screen.getByText(/12\+ characters/i)).toBeInTheDocument();
  });
});
