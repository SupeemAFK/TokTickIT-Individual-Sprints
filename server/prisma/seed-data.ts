import { randomBytes, scryptSync } from "node:crypto";

export const ticketCategories = ["Account and Access", "Hardware", "Software", "Network"] as const;
export const relatedSystems = ["Email", "Campus Wi-Fi", "VPN", "LEB2 App", "Grade Submission App", "Corporate Laptop"] as const;
export const developmentRequesters = [
  { name: "Nicha Somchai", email: "nicha.somchai@toktickit.test", isActive: true },
  { name: "Anan Kittisak", email: "anan.kittisak@toktickit.test", isActive: true },
  { name: "Mali Charoen", email: "mali.charoen@toktickit.test", isActive: true },
  { name: "Preecha Wattanakul", email: "preecha.wattanakul@toktickit.test", isActive: true },
  { name: "Suda Inactive", email: "suda.inactive@toktickit.test", isActive: false },
] as const;

const users = [
  ...developmentRequesters.map((user) => ({ ...user, role: "REQUESTER" })),
  { name: "Arun Support", email: "arun.support@toktickit.test", role: "IT_STAFF", isActive: true },
  { name: "Bua Support", email: "bua.support@toktickit.test", role: "IT_STAFF", isActive: true },
  { name: "Chai Support", email: "chai.support@toktickit.test", role: "IT_STAFF", isActive: true },
  { name: "Dormant Support", email: "dormant.support@toktickit.test", role: "IT_STAFF", isActive: false },
  { name: "Aom Administrator", email: "admin@toktickit.test", role: "ADMINISTRATOR", isActive: true },
] as const;

const workflowTickets = [
  { ticketNumber: "TKT-2026-000901", requesterEmail: "nicha.somchai@toktickit.test", ownerEmail: "arun.support@toktickit.test", categoryName: "Network", relatedSystemName: "VPN", summary: "VPN cannot connect", description: "The VPN connection fails after sign-in.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "IN_PROGRESS" },
  { ticketNumber: "TKT-2026-000902", requesterEmail: "anan.kittisak@toktickit.test", ownerEmail: null, categoryName: "Account and Access", relatedSystemName: "Email", summary: "Email access is unavailable", description: "The account cannot open the staff mailbox.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW" },
  { ticketNumber: "TKT-2026-000903", requesterEmail: "mali.charoen@toktickit.test", ownerEmail: "bua.support@toktickit.test", categoryName: "Hardware", relatedSystemName: "Corporate Laptop", summary: "Laptop will not boot", description: "The assigned laptop stops at a blank screen.", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "RESOLVED" },
] as const;

const passwordHash = (password = "Lab3Pass123") => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};

export async function seedDatabase(prisma: any): Promise<void> {
  for (const name of ticketCategories) await prisma.category.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
  for (const name of relatedSystems) await prisma.relatedSystem.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
  for (const requester of developmentRequesters) {
    await prisma.developmentRequester.upsert({ where: { email: requester.email }, update: { name: requester.name, isActive: requester.isActive }, create: requester });
  }

  if (!prisma.user || !prisma.developmentRequester.findUnique) return;

  for (const user of users) {
    const legacy = await prisma.developmentRequester.findUnique({ where: { email: user.email } });
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, isActive: user.isActive, legacyRequesterId: legacy?.id },
      create: { ...user, passwordHash: passwordHash(), mustChangePassword: true, legacyRequesterId: legacy?.id },
    });
  }

  // Backfill every legacy requester exactly once. Seeded users above are already linked,
  // while older Lab 2 rows receive a unique development-only hash and a forced change.
  if (prisma.developmentRequester.findMany && prisma.user.findFirst && prisma.user.create) {
    const legacyRows = await prisma.developmentRequester.findMany({ orderBy: { id: "asc" } });
    for (const requester of legacyRows) {
      const linked = await prisma.user.findFirst({ where: { legacyRequesterId: requester.id } });
      if (linked) continue;
      const byEmail = await prisma.user.findUnique({ where: { email: requester.email } });
      if (byEmail) {
        if (byEmail.role === "REQUESTER" && !byEmail.legacyRequesterId) {
          await prisma.user.update({ where: { id: byEmail.id }, data: { legacyRequesterId: requester.id } });
        }
        continue;
      }
      await prisma.user.create({ data: { name: requester.name, email: requester.email, role: "REQUESTER", isActive: requester.isActive, passwordHash: passwordHash(), mustChangePassword: true, legacyRequesterId: requester.id } });
    }
  }

  if (!prisma.ticket || !prisma.category.findUnique || !prisma.relatedSystem.findUnique) return;
  for (const ticket of workflowTickets) {
    const requester = await prisma.developmentRequester.findUnique({ where: { email: ticket.requesterEmail } });
    const category = await prisma.category.findUnique({ where: { name: ticket.categoryName } });
    const relatedSystem = await prisma.relatedSystem.findUnique({ where: { name: ticket.relatedSystemName } });
    const owner = ticket.ownerEmail ? await prisma.user.findUnique({ where: { email: ticket.ownerEmail } }) : null;
    if (!requester || !category || !relatedSystem) continue;
    const saved = await prisma.ticket.upsert({
      where: { ticketNumber: ticket.ticketNumber },
      update: { requesterId: requester.id, categoryId: category.id, relatedSystemId: relatedSystem.id, ownerUserId: owner?.id ?? null, summary: ticket.summary, description: ticket.description, requestedPriority: ticket.requestedPriority, itPriority: ticket.itPriority, currentStatus: ticket.currentStatus },
      create: { ticketNumber: ticket.ticketNumber, requesterId: requester.id, categoryId: category.id, relatedSystemId: relatedSystem.id, ownerUserId: owner?.id ?? null, summary: ticket.summary, description: ticket.description, requestedPriority: ticket.requestedPriority, itPriority: ticket.itPriority, currentStatus: ticket.currentStatus },
    });
    if (prisma.publicComment && owner && prisma.publicComment.findFirst && prisma.publicComment.create) {
      const comment = await prisma.publicComment.findFirst({ where: { ticketId: saved.id, authorId: owner.id, content: "Seeded public update." } });
      if (!comment) await prisma.publicComment.create({ data: { ticketId: saved.id, authorId: owner.id, content: "Seeded public update." } });
    }
    if (prisma.internalNote && owner && prisma.internalNote.findFirst && prisma.internalNote.create) {
      const note = await prisma.internalNote.findFirst({ where: { ticketId: saved.id, authorId: owner.id, content: "Seeded internal note." } });
      if (!note) await prisma.internalNote.create({ data: { ticketId: saved.id, authorId: owner.id, content: "Seeded internal note." } });
    }
  }
}
