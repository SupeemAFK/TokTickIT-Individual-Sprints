import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

describe("Lab 3 first-login password change", () => {
  beforeEach(() => { sessionStorage.setItem("toktickit.token", "initial-session"); vi.spyOn(global, "fetch").mockImplementation(async (input) => { const url=String(input); if (url.endsWith("/api/auth/me")) return new Response(JSON.stringify({user:{id:4,name:"New User",email:"new@test",role:"REQUESTER",isActive:true,mustChangePassword:true}}), {status:200}); return new Response(null, {status:204}); }); });
  afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });
  it("renders the password form instead of logging out", async () => { render(<App />); expect(await screen.findByRole("heading", {name:/change your initial password/i})).toBeInTheDocument(); const user=userEvent.setup(); await user.type(screen.getAllByRole("textbox")[0], "NewSecure123"); await user.type(screen.getAllByRole("textbox")[1], "NewSecure123"); expect(screen.getByRole("button", {name:/save password/i})).toBeInTheDocument(); });
});
