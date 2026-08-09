import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

describe("App", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", async () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
    expect(await screen.findByText("Account and Access")).toBeInTheDocument();
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

  it("loads and displays categories from the API", async () => {
    render(<App />);

    expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
    expect(await screen.findByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(api.fetchCategories).toHaveBeenCalledOnce();
  });

  it("shows a category error message when the API fails", async () => {
    vi.mocked(api.fetchCategories).mockRejectedValueOnce(
      new Error("Category request failed with HTTP 500."),
    );

    render(<App />);

    expect(await screen.findByText("Categories unavailable")).toBeInTheDocument();
    expect(screen.getByText(/category request failed/i)).toBeInTheDocument();
  });
});
