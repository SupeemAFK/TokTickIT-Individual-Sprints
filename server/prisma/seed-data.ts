import { createHash, randomBytes, scryptSync } from "node:crypto";

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
  { ticketNumber: "TKT-2026-000901", requesterEmail: "nicha.somchai@toktickit.test", ownerEmail: "arun.support@toktickit.test", categoryName: "Network", relatedSystemName: "VPN", summary: "VPN cannot connect", description: "The VPN connection fails after sign-in.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "IN_PROGRESS", publicComment: "Staff confirmed the VPN gateway is reachable and is checking the client profile.", internalNote: "Compare the affected device profile with the current VPN policy." },
  { ticketNumber: "TKT-2026-000902", requesterEmail: "anan.kittisak@toktickit.test", ownerEmail: null, categoryName: "Account and Access", relatedSystemName: "Email", summary: "Email access is unavailable", description: "The account cannot open the staff mailbox.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW" },
  { ticketNumber: "TKT-2026-000903", requesterEmail: "mali.charoen@toktickit.test", ownerEmail: "bua.support@toktickit.test", categoryName: "Hardware", relatedSystemName: "Corporate Laptop", summary: "Laptop will not boot", description: "The assigned laptop stops at a blank screen.", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "RESOLVED", publicComment: "The requester confirmed that the laptop starts normally after the repair.", internalNote: "Hardware diagnostics completed; no sensitive user data was copied." },
  { ticketNumber: "TKT-2026-000904", requesterEmail: "preecha.wattanakul@toktickit.test", ownerEmail: "chai.support@toktickit.test", categoryName: "Network", relatedSystemName: "Campus Wi-Fi", summary: "Wi-Fi drops in the training room", description: "The wireless connection disconnects several times during a session.", requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "OPEN", publicComment: "IT Staff will inspect the access point after the next scheduled session.", internalNote: "Check access-point channel utilization and recent non-sensitive alerts." },
  { ticketNumber: "TKT-2026-000905", requesterEmail: "nicha.somchai@toktickit.test", ownerEmail: "arun.support@toktickit.test", categoryName: "Software", relatedSystemName: "Corporate Laptop", summary: "Required software update is pending", description: "The approved productivity update remains queued on the laptop.", requestedPriority: "LOW", itPriority: "MEDIUM", currentStatus: "WAITING_FOR_REQUESTER", publicComment: "Please leave the laptop connected to power so the update can complete.", internalNote: "Deployment job is staged; wait for the requester’s maintenance window." },
  { ticketNumber: "TKT-2026-000906", requesterEmail: "anan.kittisak@toktickit.test", ownerEmail: null, categoryName: "Software", relatedSystemName: "Grade Submission App", summary: "Grade submission times out", description: "Saving a grade submission times out before confirmation appears.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "OPEN" },
  { ticketNumber: "TKT-2026-000907", requesterEmail: "mali.charoen@toktickit.test", ownerEmail: "bua.support@toktickit.test", categoryName: "Account and Access", relatedSystemName: "Email", summary: "Multi-factor sign-in reset needed", description: "The requester needs the approved local sign-in recovery process.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "CLOSED", publicComment: "The sign-in reset is complete and the requester confirmed access.", internalNote: "Recovery completed using the documented local support procedure." },
  { ticketNumber: "TKT-2026-000908", requesterEmail: "preecha.wattanakul@toktickit.test", ownerEmail: null, categoryName: "Hardware", relatedSystemName: "Corporate Laptop", summary: "Printer driver is incompatible", description: "The approved printer driver cannot be installed on the laptop.", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "CANCELLED", publicComment: "The request was cancelled after the printer was replaced." },
  { ticketNumber: "TKT-2026-000909", requesterEmail: "nicha.somchai@toktickit.test", ownerEmail: "chai.support@toktickit.test", categoryName: "Network", relatedSystemName: "VPN", summary: "VPN connection is intermittent", description: "The VPN reconnects repeatedly during remote work.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "REOPENED", publicComment: "The issue returned after the first fix, so IT Staff reopened the ticket.", internalNote: "Compare connection timestamps with the gateway event window." },
  { ticketNumber: "TKT-2026-000910", requesterEmail: "anan.kittisak@toktickit.test", ownerEmail: "arun.support@toktickit.test", categoryName: "Account and Access", relatedSystemName: "Email", summary: "Mailbox quota warning persists", description: "The mailbox continues to show a quota warning after cleanup.", requestedPriority: "MEDIUM", itPriority: "HIGH", currentStatus: "RESOLVED", publicComment: "The quota warning cleared after the mailbox cleanup.", internalNote: "No message content was inspected; only quota metadata was reviewed." },
  { ticketNumber: "TKT-2026-000911", requesterEmail: "mali.charoen@toktickit.test", ownerEmail: null, categoryName: "Network", relatedSystemName: "Campus Wi-Fi", summary: "New device cannot join Wi-Fi", description: "A newly issued device cannot complete the campus Wi-Fi sign-in.", requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: "NEW" },
  { ticketNumber: "TKT-2026-000912", requesterEmail: "preecha.wattanakul@toktickit.test", ownerEmail: "bua.support@toktickit.test", categoryName: "Software", relatedSystemName: "LEB2 App", summary: "LEB2 screen takes too long to load", description: "The LEB2 app screen remains loading for several minutes.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "IN_PROGRESS", publicComment: "IT Staff is collecting timing information from the affected workflow.", internalNote: "Reproduce with a test account only; do not record personal data." },
  { ticketNumber: "TKT-2026-000913", requesterEmail: "mali.charoen@toktickit.test", ownerEmail: "chai.support@toktickit.test", categoryName: "Software", relatedSystemName: "LEB2 App", summary: "Submission confirmation is delayed", description: "The confirmation message appeared after the submitted work had already completed.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "RESOLVED" },
  { ticketNumber: "TKT-2026-000914", requesterEmail: "nicha.somchai@toktickit.test", ownerEmail: "arun.support@toktickit.test", categoryName: "Hardware", relatedSystemName: "Corporate Laptop", summary: "Dock display did not wake", description: "The external display did not wake after the laptop returned from sleep.", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "CLOSED" },
] as const;

const workflowActions = [
  { idempotencyKey: "seed:lab4:TKT-2026-000901:diagnostic", ticketNumber: "TKT-2026-000901", daysAgo: 2, description: "Compared the VPN client profile with the approved configuration.", result: "The profile mismatch was reproduced and isolated.", status: "IN_PROGRESS", followUpRequired: true, followUpNote: "Apply the corrected profile and confirm the next sign-in.", attachmentNotes: "Reference the VPN profile checklist in the service desk folder.", assignedToEmail: "chai.support@toktickit.test", performedByEmail: "bua.support@toktickit.test" },
  { idempotencyKey: "seed:lab4:TKT-2026-000901:connectivity", ticketNumber: "TKT-2026-000901", daysAgo: 3, description: "Checked reachability to the VPN gateway from the support network.", result: "The gateway is reachable; no outage was found.", status: "COMPLETED", followUpRequired: false, followUpNote: null, attachmentNotes: null, assignedToEmail: null, performedByEmail: "chai.support@toktickit.test" },
  { idempotencyKey: "seed:lab4:TKT-2026-000903:repair", ticketNumber: "TKT-2026-000903", daysAgo: 5, description: "Ran the approved hardware diagnostics and reseated the laptop memory module.", result: "The laptop completed startup checks successfully.", status: "COMPLETED", followUpRequired: false, followUpNote: null, attachmentNotes: null, assignedToEmail: "bua.support@toktickit.test", performedByEmail: "chai.support@toktickit.test" },
  { idempotencyKey: "seed:lab4:TKT-2026-000904:wireless-check", ticketNumber: "TKT-2026-000904", daysAgo: 1, description: "Reviewed wireless signal and access-point channel utilization.", result: "Signal is stable at the desk; monitor the next training session.", status: "OPEN", followUpRequired: false, followUpNote: null, attachmentNotes: null, assignedToEmail: null, performedByEmail: "chai.support@toktickit.test" },
  { idempotencyKey: "seed:lab4:TKT-2026-000905:update-follow-up", ticketNumber: "TKT-2026-000905", daysAgo: 1, description: "Prepared the approved software update for the requester’s maintenance window.", result: "The update is staged and waiting for the laptop to remain on power.", status: "COMPLETED", followUpRequired: true, followUpNote: "Confirm the update completes after the requester restarts the laptop.", attachmentNotes: null, assignedToEmail: "arun.support@toktickit.test", performedByEmail: "bua.support@toktickit.test" },
  { idempotencyKey: "seed:lab4:TKT-2026-000907:account-reset", ticketNumber: "TKT-2026-000907", daysAgo: 8, description: "Completed the documented sign-in recovery steps with the requester.", result: "The requester confirmed mailbox access was restored.", status: "CANCELLED", followUpRequired: false, followUpNote: null, attachmentNotes: null, assignedToEmail: null, performedByEmail: "arun.support@toktickit.test" },
  { idempotencyKey: "seed:lab4:TKT-2026-000912:latency-triage", ticketNumber: "TKT-2026-000912", daysAgo: 1, description: "Captured response timings for the affected LEB2 workflow using a test account.", result: "The delay is reproducible and is being narrowed to the report query.", status: "OPEN", followUpRequired: false, followUpNote: null, attachmentNotes: null, assignedToEmail: "arun.support@toktickit.test", performedByEmail: "chai.support@toktickit.test" },
  { idempotencyKey: "seed:lab4:TKT-2026-000912:query-review", ticketNumber: "TKT-2026-000912", daysAgo: 1, description: "Reviewed the query plan and application timing for the slow screen.", result: "A follow-up comparison against the baseline is in progress.", status: "IN_PROGRESS", followUpRequired: false, followUpNote: null, attachmentNotes: null, assignedToEmail: "bua.support@toktickit.test", performedByEmail: "chai.support@toktickit.test" },
  { idempotencyKey: "seed:lab4:TKT-2026-000913:confirmation-fix", ticketNumber: "TKT-2026-000913", daysAgo: 1, description: "Adjusted the confirmation polling interval and verified the submission response.", result: "The confirmation now appears immediately after the submission completes.", status: "COMPLETED", followUpRequired: false, followUpNote: null, attachmentNotes: null, assignedToEmail: "chai.support@toktickit.test", performedByEmail: "bua.support@toktickit.test" },
] as const;

const passwordHash = (password = "Lab3Pass123") => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};

export async function seedDatabase(prisma: any): Promise<void> {
  const seededAt = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
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

  if (!prisma.ticket?.findUnique || !prisma.ticket.create || !prisma.ticket.update || !prisma.category.findUnique || !prisma.relatedSystem.findUnique) return;
  for (const ticket of workflowTickets) {
    const requester = await prisma.developmentRequester.findUnique({ where: { email: ticket.requesterEmail } });
    const category = await prisma.category.findUnique({ where: { name: ticket.categoryName } });
    const relatedSystem = await prisma.relatedSystem.findUnique({ where: { name: ticket.relatedSystemName } });
    const owner = ticket.ownerEmail ? await prisma.user.findUnique({ where: { email: ticket.ownerEmail } }) : null;
    if (!requester || !category || !relatedSystem) continue;
    const resolvedAt = ticket.currentStatus === "RESOLVED"
      ? new Date(seededAt.getTime() - dayMs)
      : ticket.currentStatus === "CLOSED"
        ? new Date(seededAt.getTime() - 2 * dayMs)
        : null;
    const ticketFields = {
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      ownerUserId: owner?.id ?? null,
      summary: ticket.summary,
      description: ticket.description,
      requestedPriority: ticket.requestedPriority,
      itPriority: ticket.itPriority,
      currentStatus: ticket.currentStatus,
    };
    const existing = await prisma.ticket.findUnique({ where: { ticketNumber: ticket.ticketNumber } });
    let saved;
    if (existing) {
      const changes = Object.fromEntries(Object.entries(ticketFields).filter(([field, value]) => existing[field] !== value));
      saved = Object.keys(changes).length
        ? await prisma.ticket.update({ where: { id: existing.id }, data: changes })
        : existing;
    } else {
      saved = await prisma.ticket.create({
        data: { ticketNumber: ticket.ticketNumber, ...ticketFields, resolvedAt },
      });
    }
    if (prisma.publicComment && owner && prisma.publicComment.findFirst && prisma.publicComment.create) {
      const content = "publicComment" in ticket ? ticket.publicComment : "Seeded public update.";
      const comment = await prisma.publicComment.findFirst({ where: { ticketId: saved.id, authorId: owner.id, content } });
      if (!comment) await prisma.publicComment.create({ data: { ticketId: saved.id, authorId: owner.id, content } });
    }
    if (prisma.internalNote && owner && prisma.internalNote.findFirst && prisma.internalNote.create) {
      const content = "internalNote" in ticket ? ticket.internalNote : "Seeded internal note.";
      const note = await prisma.internalNote.findFirst({ where: { ticketId: saved.id, authorId: owner.id, content } });
      if (!note) await prisma.internalNote.create({ data: { ticketId: saved.id, authorId: owner.id, content } });
    }
  }

  if (!prisma.actionTaken?.upsert || !prisma.ticket.findUnique || !prisma.user.findUnique) return;
  for (const action of workflowActions) {
    const ticket = await prisma.ticket.findUnique({ where: { ticketNumber: action.ticketNumber } });
    const performedBy = await prisma.user.findUnique({ where: { email: action.performedByEmail } });
    const assignedTo = action.assignedToEmail ? await prisma.user.findUnique({ where: { email: action.assignedToEmail } }) : null;
    if (!ticket || !performedBy || (action.assignedToEmail && !assignedTo)) continue;

    const actionAt = new Date(seededAt.getTime() - action.daysAgo * dayMs);
    const createFields = {
      actionAt,
      description: action.description,
      result: action.result,
      followUpRequired: action.followUpRequired,
      followUpNote: action.followUpNote,
      attachmentNotes: action.attachmentNotes,
      assignedToUserId: assignedTo?.id ?? null,
      performedByUserId: performedBy.id,
    };
    const idempotencyPayloadHash = createHash("sha256").update(JSON.stringify({
      ...createFields,
      actionAt: actionAt.toISOString(),
    })).digest("hex");

    await prisma.actionTaken.upsert({
      where: { idempotencyKey: action.idempotencyKey },
      update: {},
      create: {
        ticketId: ticket.id,
        ...createFields,
        status: action.status,
        idempotencyKey: action.idempotencyKey,
        idempotencyPayloadHash,
      },
    });
  }
}
