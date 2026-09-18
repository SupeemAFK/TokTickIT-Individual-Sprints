import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";

afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

it("renders the authenticated staff queue and ticket workflow detail", async () => {
  sessionStorage.setItem("toktickit.token", "staff-token");
  const detail = { id: 42, ticketNumber: "TKT-2026-000042", summary: "VPN issue", description: "VPN fails.", currentStatus: "NEW", requestedPriority: "HIGH", itPriority: "HIGH", requester: { name: "Anan" }, publicComments: [], internalNotes: [] };
  vi.spyOn(global, "fetch").mockImplementation(async (input) => { const url = String(input); if (url.endsWith("/api/auth/me")) return new Response(JSON.stringify({ user: { id: 2, name: "Arun", email: "arun@test", role: "IT_STAFF", isActive: true, mustChangePassword: false } }), { status: 200 }); if (url.includes("/api/staff/tickets?")) return new Response(JSON.stringify({ items: [detail] }), { status: 200 }); if (url.endsWith("/api/staff/tickets/42")) return new Response(JSON.stringify(detail), { status: 200 }); return new Response(JSON.stringify({}), { status: 200 }); });
  const user = userEvent.setup(); render(<App />);
  await user.click(await screen.findByRole("button", { name: "Ticket Queue" }));
  await user.click(await screen.findByRole("button", { name: "TKT-2026-000042" }));
  expect(await screen.findByRole("button", { name: "Claim ticket" })).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Add internal note")).toBeInTheDocument();
});

it("renders administrator user creation controls", async () => {
  sessionStorage.setItem("toktickit.token", "admin-token");
  vi.spyOn(global, "fetch").mockImplementation(async (input) => { const url = String(input); if (url.endsWith("/api/auth/me")) return new Response(JSON.stringify({ user: { id: 3, name: "Aom", email: "admin@test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false } }), { status: 200 }); if (url.endsWith("/api/admin/users")) return new Response(JSON.stringify([]), { status: 200 }); return new Response(JSON.stringify({}), { status: 200 }); });
  const user = userEvent.setup(); render(<App />);
  await user.click(await screen.findByRole("button", { name: "User Management" }));
  expect(await screen.findByRole("heading", { name: "User Management" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Create user" })).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Initial password")).toBeInTheDocument();
});
