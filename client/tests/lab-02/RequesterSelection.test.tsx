import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api";
import App from "../../src/App";

const requesters = [
  { id: 1, name: "Anan Kittisak", email: "anan.kittisak@toktickit.test" },
  { id: 2, name: "Mali Charoen", email: "mali.charoen@toktickit.test" },
];

describe("Requester selection", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
  });

  afterEach(() => vi.restoreAllMocks());

  it("shows a loading state and active requester choices with the testing-only explanation", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue(requesters);
    render(<App />);
    expect(screen.getByText(/loading requesters/i)).toBeInTheDocument();
    expect(await screen.findByRole("option", { name: /anan kittisak/i })).toBeInTheDocument();
    expect(screen.getByText(/not a sign-in method/i)).toBeInTheDocument();
  });

  it("shows a retryable safe error when loading requesters fails", async () => {
    const fetchRequesters = vi.spyOn(api, "fetchDevelopmentRequesters")
      .mockRejectedValueOnce(new Error("Development Requester request failed with HTTP 500."))
      .mockResolvedValueOnce(requesters);
    render(<App />);
    expect(await screen.findByText("Requesters unavailable")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByRole("option", { name: /mali charoen/i })).toBeInTheDocument();
    expect(fetchRequesters).toHaveBeenCalledTimes(2);
  });

  it("shows an empty state when there are no active requesters", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByText("No active requesters available")).toBeInTheDocument();
  });

  it("stores, displays, and changes context while reloading requester data", async () => {
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue(requesters);
    const fetchCategories = vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
    render(<App />);
    await chooseRequester("1");
    expect(await screen.findByText("Requester context active for", { exact: false })).toBeInTheDocument();
    expect(sessionStorage.getItem("toktickit.requesterId")).toBe("1");
    expect(fetchCategories).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: /change requester/i }));
    await chooseRequester("2");
    expect((await screen.findAllByText(/mali charoen/i)).length).toBeGreaterThan(0);
    expect(sessionStorage.getItem("toktickit.requesterId")).toBe("2");
    expect(fetchCategories).toHaveBeenCalledTimes(2);
  });
});

async function chooseRequester(id: string) {
  await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Development Requester" }), id);
  await userEvent.click(screen.getByRole("button", { name: /continue/i }));
}
