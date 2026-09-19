type Row = Record<string, any>;

function table(initial: Row[] = []) {
  const rows = [...initial];
  let nextId = rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
  return {
    rows,
    upsert: async ({ where, update, create }: any) => {
      const key = Object.keys(where)[0];
      const found = rows.find((row) => row[key] === where[key]);
      if (found) Object.assign(found, update);
      else rows.push({ id: nextId++, ...create });
      return found ?? rows[rows.length - 1];
    },
    findUnique: async ({ where }: any) => {
      const key = Object.keys(where)[0];
      return rows.find((row) => row[key] === where[key]) ?? null;
    },
    findFirst: async ({ where }: any) => rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value)) ?? null,
    findMany: async () => rows,
    create: async ({ data }: any) => {
      const row = { id: nextId++, ...data };
      rows.push(row);
      return row;
    },
    update: async ({ where, data }: any) => {
      const row = rows.find((candidate) => candidate.id === where.id);
      if (!row) throw new Error("row not found");
      Object.assign(row, data);
      return row;
    },
    count: async () => rows.length,
  };
}

export function makeSeedPrisma() {
  const state = {
    categories: table(),
    relatedSystems: table(),
    requesters: table([{ id: 999, name: "Legacy User", email: "legacy@example.test", isActive: true }]),
    users: table(),
    tickets: table([{ id: 700, ticketNumber: "TKT-LEGACY", requesterId: 999, categoryId: 1, relatedSystemId: 1, ownerUserId: null, summary: "Legacy ticket", description: "Preserve me", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "NEW" }]),
    comments: table(),
    notes: table(),
  };
  const prisma: any = {
    category: { upsert: state.categories.upsert, findUnique: state.categories.findUnique },
    relatedSystem: { upsert: state.relatedSystems.upsert, findUnique: state.relatedSystems.findUnique },
    developmentRequester: { upsert: state.requesters.upsert, findUnique: state.requesters.findUnique, findMany: state.requesters.findMany, update: state.requesters.update },
    user: { upsert: state.users.upsert, findUnique: state.users.findUnique, findFirst: state.users.findFirst, findMany: state.users.findMany, create: state.users.create, update: state.users.update },
    ticket: { upsert: state.tickets.upsert },
    publicComment: { findFirst: state.comments.findFirst, create: state.comments.create },
    internalNote: { findFirst: state.notes.findFirst, create: state.notes.create },
  };
  return { prisma, state };
}
