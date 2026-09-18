import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../../src/App";
describe("Lab 3 Login", () => { it("shows credentials and sign in", () => { render(<App />); expect(screen.getByRole("heading", {name:/toktickit login/i})).toBeInTheDocument(); expect(screen.getByRole("button", {name:/sign in/i})).toBeInTheDocument(); }); });
