import { FormEvent, useEffect, useState } from "react";
import { fetchCategories, fetchRelatedSystems, fetchTickets, type Category, type DevelopmentRequester, type RelatedSystem, type RequestedPriority, type TicketListItem, type TicketListQuery, type TicketListResponse } from "./api";

type ListState = "loading" | "ready" | "error";
type Filters = TicketListQuery & { sort: NonNullable<TicketListQuery["sort"]>; direction: NonNullable<TicketListQuery["direction"]>; page: number; pageSize: 10 | 20 | 50; };
const initialFilters: Filters = { sort: "createdAt", direction: "desc", page: 1, pageSize: 10 };

function date(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)); }
function priority(value: RequestedPriority) { return value[0] + value.slice(1).toLowerCase(); }

export default function MyTickets({ requester, onCreateTicket, onOpenTicket }: { requester: DevelopmentRequester; onCreateTicket: () => void; onOpenTicket?: (ticket: TicketListItem) => void }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<TicketListResponse | null>(null);
  const [state, setState] = useState<ListState>("loading");
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [referenceError, setReferenceError] = useState("");

  async function loadReferences() {
    setReferenceError("");
    try { const [loadedCategories, loadedSystems] = await Promise.all([fetchCategories(), fetchRelatedSystems()]); setCategories(loadedCategories); setSystems(loadedSystems); }
    catch (reason) { setReferenceError(reason instanceof Error ? reason.message : "Unable to load ticket filters."); }
  }

  useEffect(() => { void loadReferences(); }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      setState("loading"); setError("");
      try { const loaded = await fetchTickets(requester.id, filters); if (active) { setResult(loaded); setState("ready"); } }
      catch (reason) { if (active) { setResult(null); setError(reason instanceof Error ? reason.message : "Unable to load your tickets."); setState("error"); } }
    }
    void load(); return () => { active = false; };
  }, [requester.id, filters]);

  function patchFilters(patch: Partial<Filters>) { setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 })); }
  function submitSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); patchFilters({ search: search.trim() || undefined }); }
  function clearFilters() { setSearch(""); setFilters(initialFilters); }
  const hasQuery = Boolean(filters.search || filters.categoryId || filters.relatedSystemId || filters.requestedPriority || filters.status);
  const items = result?.items ?? [];

  return <section className="card shadow-sm border-0" aria-labelledby="my-tickets-heading"><div className="card-body p-4 p-md-5">
    <div className="d-flex flex-wrap align-items-center gap-3 mb-4"><div className="me-auto"><h1 id="my-tickets-heading" className="h3 mb-1">My Tickets</h1><p className="text-secondary mb-0">Tickets submitted by {requester.name}.</p></div><button className="btn btn-toktickit-primary" onClick={onCreateTicket}>Create Ticket</button></div>
    <form className="row g-3 align-items-end" onSubmit={submitSearch} aria-label="Ticket filters">
      <div className="col-12 col-lg-4"><label className="form-label fw-semibold" htmlFor="ticket-search">Search</label><input id="ticket-search" className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ticket number or summary" /></div>
      <Filter id="ticket-category-filter" label="Category" value={filters.categoryId ? String(filters.categoryId) : ""} options={categories} placeholder="All categories" onChange={(value) => patchFilters({ categoryId: value ? Number(value) : undefined })} />
      <Filter id="ticket-system-filter" label="Related System" value={filters.relatedSystemId ? String(filters.relatedSystemId) : ""} options={systems} placeholder="All systems" onChange={(value) => patchFilters({ relatedSystemId: value ? Number(value) : undefined })} />
      <div className="col-6 col-lg-2"><label className="form-label fw-semibold" htmlFor="ticket-priority-filter">Priority</label><select id="ticket-priority-filter" className="form-select" value={filters.requestedPriority ?? ""} onChange={(event) => patchFilters({ requestedPriority: (event.target.value || undefined) as RequestedPriority | undefined })}><option value="">All priorities</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></div>
      <div className="col-6 col-lg-2"><label className="form-label fw-semibold" htmlFor="ticket-status-filter">Status</label><select id="ticket-status-filter" className="form-select" value={filters.status ?? ""} onChange={(event) => patchFilters({ status: (event.target.value || undefined) as "NEW" | undefined })}><option value="">All statuses</option><option value="NEW">New</option></select></div>
      <div className="col-6 col-lg-3"><label className="form-label fw-semibold" htmlFor="ticket-sort">Sort</label><select id="ticket-sort" className="form-select" value={`${filters.sort}:${filters.direction}`} onChange={(event) => { const [sort, direction] = event.target.value.split(":") as [Filters["sort"], Filters["direction"]]; patchFilters({ sort, direction }); }}><option value="createdAt:desc">Newest created</option><option value="createdAt:asc">Oldest created</option><option value="updatedAt:desc">Recently updated</option><option value="ticketNumber:asc">Ticket number</option><option value="summary:asc">Summary</option><option value="requestedPriority:desc">Priority</option></select></div>
      <div className="col-6 col-lg-2"><label className="form-label fw-semibold" htmlFor="ticket-page-size">Per page</label><select id="ticket-page-size" className="form-select" value={filters.pageSize} onChange={(event) => patchFilters({ pageSize: Number(event.target.value) as 10 | 20 | 50 })}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></div>
      <div className="col-12 col-lg-3 d-flex gap-2"><button className="btn btn-toktickit-primary" type="submit">Search</button><button className="btn btn-toktickit-outline" type="button" onClick={clearFilters} disabled={!hasQuery && !search}>Clear filters</button></div>
    </form>
    {referenceError && <div className="alert alert-warning mt-4" role="alert"><strong>Some filters are unavailable</strong><div>{referenceError}</div><button className="btn btn-outline-secondary mt-2" onClick={() => void loadReferences()}>Try again</button></div>}
    {state === "loading" && <p className="mt-4 mb-0 text-secondary" role="status">Loading your tickets...</p>}
    {state === "error" && <div className="alert alert-danger mt-4 mb-0" role="alert"><strong>Tickets unavailable</strong><div>{error}</div><button className="btn btn-outline-danger mt-3" onClick={() => patchFilters({})}>Try again</button></div>}
    {state === "ready" && items.length === 0 && <div className="alert toktickit-context mt-4 mb-0" role="status"><strong>{hasQuery ? "No matching tickets" : "No tickets yet"}</strong><div>{hasQuery ? "Try changing or clearing your search and filters." : "Create a ticket to get started."}</div></div>}
    {state === "ready" && items.length > 0 && <><Results items={items} onOpenTicket={onOpenTicket} /><Pages pagination={result!.pagination} onPageChange={(page) => patchFilters({ page })} /></>}
  </div></section>;
}

function Filter({ id, label, value, options, placeholder, onChange }: { id: string; label: string; value: string; options: { id: number; name: string }[]; placeholder: string; onChange: (value: string) => void }) { return <div className="col-6 col-lg-3"><label className="form-label fw-semibold" htmlFor={id}>{label}</label><select id={id} className="form-select" value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></div>; }

function Results({ items, onOpenTicket }: { items: TicketListItem[]; onOpenTicket?: (ticket: TicketListItem) => void }) { return <div className="mt-4"><table className="table align-middle d-none d-md-table"><thead><tr><th>Number</th><th>Summary</th><th>Category</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>{items.map((ticket) => <tr key={ticket.id} className={onOpenTicket ? "ticket-row" : undefined} onClick={() => onOpenTicket?.(ticket)}><td><strong>{ticket.ticketNumber}</strong></td><td>{ticket.summary}</td><td>{ticket.category.name}</td><td><span className={`badge text-bg-${ticket.requestedPriority === "HIGH" ? "danger" : ticket.requestedPriority === "MEDIUM" ? "warning" : "success"}`}>{priority(ticket.requestedPriority)}</span></td><td><span className="badge text-bg-secondary">New</span></td><td>{date(ticket.updatedAt)}</td></tr>)}</tbody></table><div className="d-md-none">{items.map((ticket) => <button key={ticket.id} className="card w-100 text-start mb-3 ticket-card" onClick={() => onOpenTicket?.(ticket)}><div className="card-body"><strong>{ticket.ticketNumber}</strong><div className="mt-1">{ticket.summary}</div><div className="small text-secondary mt-2">{ticket.category.name} · Updated {date(ticket.updatedAt)}</div><div className="mt-2"><span className="badge text-bg-secondary me-2">New</span><span className="badge text-bg-success">{priority(ticket.requestedPriority)}</span></div></div></button>)}</div></div>; }

function Pages({ pagination, onPageChange }: { pagination: TicketListResponse["pagination"]; onPageChange: (page: number) => void }) { if (pagination.totalPages <= 1) return null; return <nav className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3" aria-label="Ticket pages"><span className="text-secondary small">{pagination.totalItems} tickets</span><div className="btn-group"><button className="btn btn-toktickit-outline" onClick={() => onPageChange(pagination.page - 1)} disabled={pagination.page === 1}>Previous</button><span className="btn btn-light disabled">Page {pagination.page} of {pagination.totalPages}</span><button className="btn btn-toktickit-outline" onClick={() => onPageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>Next</button></div></nav>; }
