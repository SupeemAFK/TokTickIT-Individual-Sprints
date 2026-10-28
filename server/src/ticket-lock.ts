export async function lockTicket(tx: any, ticketId: number) {
  const rows = await tx.$queryRawUnsafe('SELECT "id", "currentStatus" FROM "Ticket" WHERE "id" = $1 FOR UPDATE', ticketId);
  return rows[0] ?? null;
}
