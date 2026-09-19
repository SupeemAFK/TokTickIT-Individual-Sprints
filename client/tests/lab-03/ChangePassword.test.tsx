import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import { installFetch, requester } from "./fixtures";

describe("Lab 3 Change Password", () => {
  afterEach(() => { sessionStorage.clear(); vi.unstubAllGlobals(); });

  it("shows password rules, labels, and blocks invalid first-login passwords", async () => {
    const user = userEvent.setup();
    installFetch(requester, true);
    render(<App />);

    await user.type(screen.getByLabelText("Email"), requester.email);
    await user.type(screen.getByLabelText("Password"), "Lab3Pass123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Change your initial password" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("New password"), "weak");
    await user.type(screen.getByLabelText("Confirm password"), "different");
    await user.click(screen.getByRole("button", { name: "Save password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/12 characters|match/i);
    expect(screen.getByText("At least one upper-case letter")).toBeInTheDocument();
  });
});
