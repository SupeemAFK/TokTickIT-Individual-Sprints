import { vi } from "vitest";

export const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true } as const;
export const staff = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true } as const;
export const administrator = { id: 2, name: "Admin One", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true } as const;
export const category = { id: 1, name: "Network" };
export const system = { id: 2, name: "VPN" };
export const summary = { id: 12, ticketNumber: "TKT-2026-000012", summary: "VPN cannot connect", requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "NEW", owner: null, category, relatedSystem: system, createdAt: "2026-09-19T08:00:00.000Z", updatedAt: "2026-09-19T08:00:00.000Z" };
export type Lab3User = typeof requester | typeof staff | typeof administrator;
export const detail = { ...summary, description: "VPN fails after sign in.", requester, attachments: [{ id: 4, originalFilename: "screenshot.png", mimeType: "image/png", byteSize: 20, createdAt: "2026-09-19T08:03:00.000Z", removedAt: null, removalReason: null }], publicComments: [], internalNotes: [] };

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => new Blob(["file"]) } as Response;
}

export function installFetch(currentUser: Lab3User, firstLogin = false) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/api/auth/login")) return response({ user: currentUser, mustChangePassword: firstLogin, session: { token: "opaque-session", expiresAt: "2026-09-20T00:00:00.000Z" } });
    if (url.endsWith("/api/auth/me")) return response({ user: currentUser, mustChangePassword: firstLogin });
    if (url.endsWith("/api/auth/logout")) return response(null, 204);
    if (url.endsWith("/api/categories")) return response([category]);
    if (url.endsWith("/api/related-systems")) return response([system]);
    if (url.includes("/api/tickets?") || url.endsWith("/api/tickets")) return response({ items: [summary], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 } });
    if (url.endsWith("/api/tickets/12")) return response({ ticket: detail });
    if (url.endsWith("/api/staff/users")) return response([staff, administrator]);
    if (url.includes("/api/staff/tickets?") || url.endsWith("/api/staff/tickets")) return response({ items: [{ ...summary, requester: { id: requester.id, name: requester.name } }], pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }, counts: { totalItems: 1, unassigned: 1, byStatus: { NEW: 1 }, byItPriority: { LOW: 0, MEDIUM: 1, HIGH: 0 } } });
    if (url.endsWith("/api/staff/tickets/12")) return response({ ticket: detail });
    if (url.includes("/api/admin/users")) return response({ items: [requester, staff, administrator] });
    if (url.endsWith("/api/auth/change-password")) return response({ user: currentUser, mustChangePassword: false });
    return response({});
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
