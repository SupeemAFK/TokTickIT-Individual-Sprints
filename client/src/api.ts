const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category { id: number; name: string; }
export interface RelatedSystem { id: number; name: string; }
export interface DevelopmentRequester { id: number; name: string; email: string; }
export interface SystemStatus { online: boolean; service: string; }
export type RequestedPriority = "LOW" | "MEDIUM" | "HIGH";

export interface CreateTicketInput {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  requestedPriority: RequestedPriority;
  description: string;
  currentStatus: "NEW";
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends Ticket {
  requester: DevelopmentRequester;
  category: Category;
  relatedSystem: RelatedSystem;
}

export interface Attachment { id: number; originalFilename: string; mimeType: string; byteSize: number; createdAt: string; removedAt: string | null; removalReason: string | null; }

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: "NEW";
  requestedPriority: RequestedPriority;
  category: Category;
  relatedSystem: RelatedSystem;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListQuery {
  search?: string;
  categoryId?: number;
  relatedSystemId?: number;
  requestedPriority?: RequestedPriority;
  status?: "NEW";
  sort?: "createdAt" | "updatedAt" | "ticketNumber" | "summary" | "requestedPriority";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: 10 | 20 | 50;
}

export interface TicketListResponse {
  items: TicketListItem[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number; };
}

async function requestJson<T>(path: string, options?: RequestInit, label = "Request"): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error("Unable to reach the backend. Check that the API server is running.");
  }

  const data = await response.json().catch(() => null) as { error?: string } | T | null;
  if (!response.ok) {
    const error = data && typeof data === "object" && "error" in data ? data.error : undefined;
    throw new Error(error || `${label} failed with HTTP ${response.status}.`);
  }

  return data as T;
}

export async function checkSystem(): Promise<SystemStatus> {
  const data = await requestJson<{ status?: string; service?: string }>("/api/health", undefined, "Backend health check");
  if (data.status !== "ok") throw new Error("Backend health check returned an unexpected response.");
  return { online: true, service: data.service ?? "TokTickIT API" };
}

export async function fetchCategories(): Promise<Category[]> {
  const data = await requestJson<Category[]>("/api/categories", undefined, "Category request");
  if (!Array.isArray(data)) throw new Error("Category request returned an unexpected response.");
  return data;
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const data = await requestJson<RelatedSystem[]>("/api/related-systems", undefined, "Related System request");
  if (!Array.isArray(data)) throw new Error("Related System request returned an unexpected response.");
  return data;
}

export async function fetchDevelopmentRequesters(): Promise<DevelopmentRequester[]> {
  const data = await requestJson<DevelopmentRequester[]>("/api/development-requesters", undefined, "Development Requester request");
  if (!Array.isArray(data)) throw new Error("Development Requester request returned an unexpected response.");
  return data;
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  return requestJson<Ticket>("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, "Create Ticket request");
}

export async function fetchAttachments(ticketId: number, requesterId: number): Promise<Attachment[]> {
  const data = await requestJson<Attachment[]>("/api/tickets/" + ticketId + "/attachments?requesterId=" + requesterId, undefined, "Attachment request");
  if (!Array.isArray(data)) throw new Error("Attachment request returned an unexpected response.");
  return data;
}

export async function fetchTicket(ticketId: number, requesterId: number): Promise<TicketDetail> {
  return requestJson<TicketDetail>("/api/tickets/" + ticketId + "?requesterId=" + requesterId, undefined, "Ticket detail request");
}

export async function fetchTickets(requesterId: number, query: TicketListQuery = {}): Promise<TicketListResponse> {
  const params = new URLSearchParams({ requesterId: String(requesterId) });
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }

  const data = await requestJson<TicketListResponse>("/api/tickets?" + params.toString(), undefined, "Ticket list request");
  if (!Array.isArray(data.items) || !data.pagination) throw new Error("Ticket list request returned an unexpected response.");
  return data;
}
