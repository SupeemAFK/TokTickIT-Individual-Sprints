import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { installFetch, staff } from "./fixtures";

describe("Lab 3 IT Staff Ticket Detail", () => {
  afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

  it("renders operational controls, attachment continuity, Public Comments, and Internal Notes", async () => {
    sessionStorage.setItem("toktickit.token", "opaque-session");
    installFetch(staff);
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: "Ticket Queue" }));
    await userEvent.click((await screen.findAllByRole("button", { name: "Open TKT-2026-000012" }))[0]);

    expect(await screen.findByRole("heading", { name: "Staff Ticket Detail" })).toBeInTheDocument();
    expect(screen.getByLabelText("Workflow status")).toBeInTheDocument();
    expect(screen.getByLabelText("IT priority")).toBeInTheDocument();
    expect(screen.getByLabelText("Owner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download attachment" })).toBeInTheDocument();
    expect(screen.getByLabelText("Staff public comment")).toBeInTheDocument();
    expect(screen.getByLabelText("Internal note")).toBeInTheDocument();
  });
});
