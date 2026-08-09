import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows Online when the backend health check succeeds", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      service: "TokTickIT API",
    });

    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText("Online")).toBeInTheDocument();
    expect(screen.getByText(/TokTickIT API is running/i)).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("Unable to reach the backend. Check that the API server is running."),
    );

    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText("Offline")).toBeInTheDocument();
    expect(screen.getByText(/check that the API server is running/i)).toBeInTheDocument();
  });
});
