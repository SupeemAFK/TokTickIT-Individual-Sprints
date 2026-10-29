import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const ACTIVE_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export type DashboardRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
export type DashboardFilters = { status?: string; statusGroup?: "active"; owner?: string; itPriority?: string };
type TimeWindow = { from: string; to: string };
type TicketSummary = {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  requestedPriority: string;
  itPriority: string;
  updatedAt?: string;
  resolvedAt?: string;
  category?: { name: string } | null;
  relatedSystem?: { name: string } | null;
  owner?: { id: number; name: string } | null;
};
type ActionSummary = { id: number; ticketId: number; actionAt: string; description: string; status: string; ticket: TicketSummary };
type RequesterData = {
  asOf: string;
  resolvedLast30DaysWindow: TimeWindow;
  metrics: { totalTickets: number; activeTickets: number; waitingForRequester: number; resolvedLast30Days: number };
  attentionTickets: TicketSummary[];
  recentlyResolvedTickets: TicketSummary[];
  recentTickets: TicketSummary[];
};
type StaffData = {
  asOf: string;
  resolvedLast7DaysWindow: TimeWindow;
  metrics: {
    activeTickets: number;
    unassignedActiveTickets: number;
    myActiveTickets: number;
    activeByStatus: Record<string, number>;
    activeByItPriority: Record<string, number>;
    waitingForRequester: number;
    resolvedLast7Days: number;
    myActiveActions: number;
  };
  myActions: ActionSummary[];
  recentTickets: TicketSummary[];
};
type DashboardData = RequesterData | StaffData;
type PageResult = { items: TicketSummary[]; nextCursor: string | null };

class DashboardApiError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, token: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error("Unable to reach the service. Check your connection and retry.");
  }
  const body = await response.json().catch(() => null) as { error?: string; code?: string } | T | null;
  if (!response.ok) {
    const detail = body && typeof body === "object" && "error" in body ? body.error : undefined;
    const code = body && typeof body === "object" && "code" in body ? body.code : undefined;
    throw new DashboardApiError(detail || `Request failed with HTTP ${response.status}.`, code || "SERVER_ERROR", response.status);
  }
  return body as T;
}

function errorText(reason: unknown) {
  if (reason instanceof DashboardApiError && reason.code === "FORBIDDEN") return "You do not have permission to view this dashboard.";
  return reason instanceof Error ? reason.message : "Unable to load the dashboard. Please retry.";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "—";
}

export default function Dashboard({ token, role, userId, onOpenTickets, onOpenTicket }: {
  token: string;
  role: DashboardRole;
  userId: number;
  onOpenTickets: (filters: DashboardFilters) => void;
  onOpenTicket: (ticketId: number) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [resolvedWindow, setResolvedWindow] = useState<TimeWindow | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const path = role === "REQUESTER" ? "/api/requester/dashboard" : "/api/staff/dashboard";
    void request<DashboardData>(path, token).then((result) => {
      if (active) setData(result);
    }).catch((reason: unknown) => {
      if (active) setError(errorText(reason));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [role, token, retry]);

  if (resolvedWindow) {
    return <ResolvedTickets token={token} role={role} window={resolvedWindow} onBack={() => setResolvedWindow(null)} onOpenTicket={onOpenTicket} />;
  }

  const requester = role === "REQUESTER";
  const requesterData = requester ? data as RequesterData | null : null;
  const staffData = requester ? null : data as StaffData | null;

  return <section aria-labelledby="dashboard-heading">
    <h1 id="dashboard-heading" className="h3">{requester ? "Requester Dashboard" : "Staff Dashboard"}</h1>
    <p className="text-secondary">{requester ? "A summary of your tickets and any replies needed." : "Current service desk workload and work assigned to you."}</p>
    {loading && <p role="status" aria-live="polite">Loading dashboard…</p>}
    {error && <div className="alert alert-danger" role="alert">{error}<button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>}

    {requesterData && !loading && !error && <RequesterDashboard data={requesterData} onOpenTickets={onOpenTickets} onOpenTicket={onOpenTicket} onShowResolved={() => setResolvedWindow(requesterData.resolvedLast30DaysWindow)} />}
    {staffData && !loading && !error && <StaffDashboard data={staffData} userId={userId} onOpenTickets={onOpenTickets} onOpenTicket={onOpenTicket} onShowResolved={() => setResolvedWindow(staffData.resolvedLast7DaysWindow)} />}
  </section>;
}

function MetricButton({ label, value, action, onClick }: { label: string; value: number; action: string; onClick: () => void }) {
  return <button type="button" className="card dashboard-metric h-100 w-100 text-start" aria-label={`${label}: ${value}. ${action}`} onClick={onClick}>
    <span className="card-body"><span className="text-secondary small">{label}</span><span className="d-block fs-2 fw-semibold">{value}</span><span className="small toktickit-text">{action}</span></span>
  </button>;
}

function TicketList({ heading, id, emptyMessage, tickets, onOpenTicket, showResolvedDate = false }: {
  heading: string;
  id: string;
  emptyMessage: string;
  tickets: TicketSummary[];
  onOpenTicket: (ticketId: number) => void;
  showResolvedDate?: boolean;
}) {
  return <section className="card h-100" aria-labelledby={id}>
    <div className="card-body"><h2 id={id} className="h5">{heading}</h2>
      {!tickets.length && <p className="text-secondary mb-0">{emptyMessage}</p>}
      {!!tickets.length && <ul className="list-group list-group-flush">{tickets.map((ticket) => <li className="list-group-item px-0 d-flex flex-wrap align-items-center gap-2" key={ticket.id}>
        <div className="me-auto"><strong>{ticket.ticketNumber}</strong><div>{ticket.summary}</div><small className="text-secondary">{ticket.currentStatus}{showResolvedDate && ticket.resolvedAt ? ` · resolved ${formatDate(ticket.resolvedAt)}` : ticket.updatedAt ? ` · updated ${formatDate(ticket.updatedAt)}` : ""}</small></div>
        <button type="button" className="btn btn-sm btn-toktickit-outline" aria-label={`Open ticket ${ticket.ticketNumber}`} onClick={() => onOpenTicket(ticket.id)}>Open</button>
      </li>)}</ul>}
    </div>
  </section>;
}

function RequesterDashboard({ data, onOpenTickets, onOpenTicket, onShowResolved }: {
  data: RequesterData;
  onOpenTickets: (filters: DashboardFilters) => void;
  onOpenTicket: (ticketId: number) => void;
  onShowResolved: () => void;
}) {
  return <>
    <div className="row g-3 mb-4">
      <div className="col-12 col-sm-6 col-xl-3"><MetricButton label="Total tickets" value={data.metrics.totalTickets} action="View My Tickets" onClick={() => onOpenTickets({})} /></div>
      <div className="col-12 col-sm-6 col-xl-3"><MetricButton label="Active tickets" value={data.metrics.activeTickets} action="View active tickets" onClick={() => onOpenTickets({ statusGroup: "active" })} /></div>
      <div className="col-12 col-sm-6 col-xl-3"><MetricButton label="Waiting for your reply" value={data.metrics.waitingForRequester} action="View tickets waiting for you" onClick={() => onOpenTickets({ status: "WAITING_FOR_REQUESTER" })} /></div>
      <div className="col-12 col-sm-6 col-xl-3"><MetricButton label="Resolved in the last 30 days" value={data.metrics.resolvedLast30Days} action="View matching tickets" onClick={onShowResolved} /></div>
    </div>
    <div className="row g-3">
      <div className="col-12"><TicketList id="requester-attention-heading" heading="Tickets waiting for your reply" emptyMessage="No tickets need a reply right now." tickets={data.attentionTickets ?? []} onOpenTicket={onOpenTicket} /></div>
      <div className="col-12 col-xl-6"><TicketList id="requester-recent-heading" heading="Recently updated tickets" emptyMessage="No recently updated tickets." tickets={data.recentTickets} onOpenTicket={onOpenTicket} /></div>
      <div className="col-12 col-xl-6"><TicketList id="requester-resolved-heading" heading="Recently resolved tickets" emptyMessage="No tickets were resolved in this period." tickets={data.recentlyResolvedTickets} onOpenTicket={onOpenTicket} showResolvedDate /></div>
    </div>
  </>;
}

function StaffDashboard({ data, userId, onOpenTickets, onOpenTicket, onShowResolved }: {
  data: StaffData;
  userId: number;
  onOpenTickets: (filters: DashboardFilters) => void;
  onOpenTicket: (ticketId: number) => void;
  onShowResolved: () => void;
}) {
  return <>
    <div className="row g-3 mb-4">
      <div className="col-12 col-sm-6 col-xl-4"><MetricButton label="Active tickets" value={data.metrics.activeTickets} action="View active queue" onClick={() => onOpenTickets({ statusGroup: "active" })} /></div>
      <div className="col-12 col-sm-6 col-xl-4"><MetricButton label="Unassigned active tickets" value={data.metrics.unassignedActiveTickets} action="View unassigned active tickets" onClick={() => onOpenTickets({ statusGroup: "active", owner: "unassigned" })} /></div>
      <div className="col-12 col-sm-6 col-xl-4"><MetricButton label="Active tickets owned by me" value={data.metrics.myActiveTickets} action="View my active tickets" onClick={() => onOpenTickets({ statusGroup: "active", owner: String(userId) })} /></div>
      <div className="col-12 col-sm-6 col-xl-4"><MetricButton label="Waiting for requester" value={data.metrics.waitingForRequester} action="View waiting tickets" onClick={() => onOpenTickets({ status: "WAITING_FOR_REQUESTER" })} /></div>
      <div className="col-12 col-sm-6 col-xl-4"><MetricButton label="Resolved in the last 7 days" value={data.metrics.resolvedLast7Days} action="View matching tickets" onClick={onShowResolved} /></div>
      <div className="col-12 col-sm-6 col-xl-4"><a className="card dashboard-metric h-100 text-decoration-none" href="#staff-my-actions"><span className="card-body"><span className="text-secondary small">My active actions</span><span className="d-block fs-2 fw-semibold text-body">{data.metrics.myActiveActions}</span><span className="small toktickit-text">Jump to My Actions</span></span></a></div>
    </div>
    <section className="card mb-3" aria-labelledby="staff-status-heading"><div className="card-body"><h2 id="staff-status-heading" className="h5">Active tickets by status</h2><div className="row g-2">{ACTIVE_STATUSES.map((status) => <div className="col-6 col-md-4 col-xl" key={status}><MetricButton label={status.replaceAll("_", " ")} value={data.metrics.activeByStatus[status] ?? 0} action="Filter queue by status" onClick={() => onOpenTickets({ status })} /></div>)}</div></div></section>
    <section className="card mb-4" aria-labelledby="staff-priority-heading"><div className="card-body"><h2 id="staff-priority-heading" className="h5">Active tickets by IT priority</h2><div className="row g-2">{PRIORITIES.map((priority) => <div className="col-12 col-sm-4" key={priority}><MetricButton label={`${priority} priority`} value={data.metrics.activeByItPriority[priority] ?? 0} action="Filter active queue by IT priority" onClick={() => onOpenTickets({ statusGroup: "active", itPriority: priority })} /></div>)}</div></div></section>
    <div className="row g-3">
      <div className="col-12 col-xl-6"><section id="staff-my-actions" className="card h-100" aria-labelledby="staff-actions-heading"><div className="card-body"><h2 id="staff-actions-heading" className="h5">My Actions</h2>
        {!data.myActions.length && <p className="text-secondary mb-0">No active Actions Taken are assigned to you.</p>}
        {!!data.myActions.length && <ul className="list-group list-group-flush">{data.myActions.map((action) => <li className="list-group-item px-0" key={action.id}><div className="d-flex flex-wrap gap-2 align-items-start"><div className="me-auto"><strong>{action.status.replaceAll("_", " ")}</strong> · {formatDate(action.actionAt)}<div>{action.description}</div><small className="text-secondary">{action.ticket.ticketNumber} · {action.ticket.summary}</small></div><button type="button" className="btn btn-sm btn-toktickit-outline" aria-label={`Open ticket ${action.ticket.ticketNumber} for action ${action.id}`} onClick={() => onOpenTicket(action.ticketId)}>Open Ticket</button></div></li>)}</ul>}
      </div></section></div>
      <div className="col-12 col-xl-6"><TicketList id="staff-recent-heading" heading="Recently updated tickets" emptyMessage="No recently updated tickets." tickets={data.recentTickets} onOpenTicket={onOpenTicket} /></div>
    </div>
  </>;
}

function ResolvedTickets({ token, role, window, onBack, onOpenTicket }: {
  token: string;
  role: DashboardRole;
  window: TimeWindow;
  onBack: () => void;
  onOpenTicket: (ticketId: number) => void;
}) {
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const cursor = cursorStack[cursorStack.length - 1];
  const [result, setResult] = useState<PageResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setResult(null);
    const params = new URLSearchParams({ from: window.from, to: window.to });
    if (cursor) params.set("cursor", cursor);
    const endpoint = role === "REQUESTER" ? "/api/requester/dashboard/resolved-tickets" : "/api/staff/dashboard/resolved-tickets";
    void request<PageResult>(`${endpoint}?${params.toString()}`, token).then((page) => {
      if (active) setResult(page);
    }).catch((reason: unknown) => {
      if (active) setError(errorText(reason));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [cursor, role, token, window.from, window.to, retry]);

  return <section aria-labelledby="resolved-tickets-heading">
    <button type="button" className="btn btn-toktickit-outline mb-3" onClick={onBack}>Back to Dashboard</button>
    <h1 id="resolved-tickets-heading" className="h3">Resolved Tickets</h1>
    <p className="text-secondary">Matching the dashboard’s server-calculated window: {formatDate(window.from)} to {formatDate(window.to)}.</p>
    {loading && <p role="status" aria-live="polite">Loading resolved tickets…</p>}
    {error && <div className="alert alert-danger" role="alert">{error}<button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => setRetry((value) => value + 1)}>Retry</button></div>}
    {!loading && !error && !result?.items.length && <p className="text-secondary">No resolved tickets match this period.</p>}
    {!!result?.items.length && <ul className="list-group">{result.items.map((ticket) => <li className="list-group-item d-flex flex-wrap align-items-center gap-2" key={ticket.id}><div className="me-auto"><strong>{ticket.ticketNumber}</strong><div>{ticket.summary}</div><small className="text-secondary">{ticket.currentStatus} · resolved {formatDate(ticket.resolvedAt)}</small></div><button type="button" className="btn btn-toktickit-outline" aria-label={`Open ticket ${ticket.ticketNumber}`} onClick={() => onOpenTicket(ticket.id)}>Open Ticket</button></li>)}</ul>}
    <nav className="d-flex justify-content-between align-items-center gap-2 mt-3" aria-label="Resolved Ticket pages">
      <button type="button" className="btn btn-toktickit-outline" disabled={loading || cursorStack.length <= 1} onClick={() => setCursorStack((stack) => stack.slice(0, -1))}>Previous</button>
      <span aria-live="polite">Page {cursorStack.length}</span>
      <button type="button" className="btn btn-toktickit-outline" disabled={loading || !result?.nextCursor} onClick={() => result?.nextCursor && setCursorStack((stack) => [...stack, result.nextCursor])}>Next</button>
    </nav>
  </section>;
}
