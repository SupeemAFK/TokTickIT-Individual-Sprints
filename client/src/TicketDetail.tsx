import { useEffect, useState } from "react";
import { fetchTicket, type DevelopmentRequester, type TicketDetail as TicketDetailData } from "./api";

type State = "loading" | "ready" | "error";
const date = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));

export default function TicketDetail({ ticketId, requester, onBack }: { ticketId: number; requester: DevelopmentRequester; onBack: () => void }) {
  const [state, setState] = useState<State>("loading");
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [error, setError] = useState("");
  async function load() { setState("loading"); setError(""); try { setTicket(await fetchTicket(ticketId, requester.id)); setState("ready"); } catch (reason) { setTicket(null); setError(reason instanceof Error ? reason.message : "Unable to load this ticket."); setState("error"); } }
  useEffect(() => { void load(); }, [ticketId, requester.id]);
  return <section className="card shadow-sm border-0" aria-labelledby="ticket-detail-heading"><div className="card-body p-4 p-md-5"><button className="btn btn-toktickit-outline mb-4" onClick={onBack}>Back to My Tickets</button><h1 id="ticket-detail-heading" className="h3 mb-4">Ticket Detail</h1>{state === "loading" && <p role="status">Loading ticket...</p>}{state === "error" && <div className="alert alert-danger" role="alert"><strong>Ticket unavailable</strong><div>{error}</div><button className="btn btn-outline-danger mt-3" onClick={() => void load()}>Try again</button></div>}{state === "ready" && ticket && <div className="row g-3"><Field label="Ticket Number" value={ticket.ticketNumber} /><Field label="Ticket Date" value={date(ticket.createdAt)} /><Field label="Requester" value={ticket.requester.name} /><Field label="Category" value={ticket.category.name} /><Field label="Related System" value={ticket.relatedSystem.name} /><Field label="Summary" value={ticket.summary} /><Field label="Requested Priority" value={ticket.requestedPriority} /><Field label="Current Status" value={ticket.currentStatus} /><Field label="Description" value={ticket.description} wide /></div>}</div></section>;
}

function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <div className={wide ? "col-12" : "col-md-6"}><div className="form-label fw-semibold">{label}</div><div className="form-control toktickit-readonly">{value}</div></div>; }
