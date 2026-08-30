export function formatTicketNumber(ticketId: number, ticketDate: Date): string {
  return `TKT-${ticketDate.getUTCFullYear()}-${String(ticketId).padStart(6, "0")}`;
}
