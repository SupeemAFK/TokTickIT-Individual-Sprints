import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as api from "../../src/api";
import App from "../../src/App";

describe("App", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(api, "fetchDevelopmentRequesters").mockResolvedValue([{ id: 1, name: "Anan Kittisak", email: "anan.kittisak@toktickit.test" }]);
  });
  afterEach(() => vi.restoreAllMocks());
  it("renders the TokTickIT heading and requester selection", async () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /continue/i })).toBeInTheDocument();
  });
})
