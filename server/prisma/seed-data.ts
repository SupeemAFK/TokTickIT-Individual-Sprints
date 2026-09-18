import { randomBytes, scryptSync } from "node:crypto";
export const ticketCategories = ["Account and Access", "Hardware", "Software", "Network"] as const;
export const relatedSystems = ["Email", "Campus Wi-Fi", "VPN", "LEB2 App", "Grade Submission App", "Corporate Laptop"] as const;
export const developmentRequesters = [
 { name: "Nicha Somchai", email: "nicha.somchai@toktickit.test", isActive: true }, { name: "Anan Kittisak", email: "anan.kittisak@toktickit.test", isActive: true }, { name: "Mali Charoen", email: "mali.charoen@toktickit.test", isActive: true }, { name: "Preecha Wattanakul", email: "preecha.wattanakul@toktickit.test", isActive: true }, { name: "Suda Inactive", email: "suda.inactive@toktickit.test", isActive: false },
] as const;
const users = [
 ...developmentRequesters.map((u) => ({ ...u, role: "REQUESTER" })),
 { name:"Arun Support",email:"arun.support@toktickit.test",role:"IT_STAFF",isActive:true }, { name:"Bua Support",email:"bua.support@toktickit.test",role:"IT_STAFF",isActive:true }, { name:"Chai Support",email:"chai.support@toktickit.test",role:"IT_STAFF",isActive:true }, { name:"Dormant Support",email:"dormant.support@toktickit.test",role:"IT_STAFF",isActive:false }, { name:"Aom Administrator",email:"admin@toktickit.test",role:"ADMINISTRATOR",isActive:true },
];
const passwordHash = () => { const salt=randomBytes(16).toString("hex"); return `${salt}:${scryptSync("Lab3Pass123",salt,64).toString("hex")}`; };
export async function seedDatabase(prisma: any): Promise<void> {
 for (const name of ticketCategories) await prisma.category.upsert({where:{name},update:{isActive:true},create:{name,isActive:true}});
 for (const name of relatedSystems) await prisma.relatedSystem.upsert({where:{name},update:{isActive:true},create:{name,isActive:true}});
 for (const requester of developmentRequesters) await prisma.developmentRequester.upsert({where:{email:requester.email},update:{name:requester.name,isActive:requester.isActive},create:requester});
 if (prisma.user && prisma.developmentRequester.findUnique) for (const user of users) { const legacy=await prisma.developmentRequester.findUnique({where:{email:user.email}}); await prisma.user.upsert({where:{email:user.email},update:{name:user.name,role:user.role,isActive:user.isActive,legacyRequesterId:legacy?.id},create:{...user,passwordHash:passwordHash(),mustChangePassword:true,legacyRequesterId:legacy?.id}});
  if (prisma.ticket && prisma.category.findFirst && prisma.relatedSystem.findFirst && user.role === "REQUESTER" && legacy?.id) {
    const category = await prisma.category.findFirst({where:{name:"Network"}}); const system = await prisma.relatedSystem.findFirst({where:{name:"Campus Wi-Fi"}});
    if (category && system && user.isActive) { const sample = await prisma.ticket.upsert({where:{ticketNumber:`SEED-${legacy.id}`},update:{summary:"Seeded connectivity request",currentStatus:"OPEN"},create:{ticketNumber:`SEED-${legacy.id}`,requesterId:legacy.id,categoryId:category.id,relatedSystemId:system.id,summary:"Seeded connectivity request",description:"Sample Lab 3 ticket for requester, staff, and administrator workflow verification.",requestedPriority:"HIGH",itPriority:"HIGH",currentStatus:"OPEN"},}); if (prisma.publicComment && prisma.internalNote) { const comment = await prisma.publicComment.findFirst({where:{ticketId:sample.id}}); if (!comment) { const staff = await prisma.user.findFirst({where:{role:"IT_STAFF",isActive:true}}); if (staff) await prisma.publicComment.create({data:{ticketId:sample.id,authorId:staff.id,content:"Seeded public update for workflow verification."}}); } const note = await prisma.internalNote.findFirst({where:{ticketId:sample.id}}); if (!note) { const staff = await prisma.user.findFirst({where:{role:"IT_STAFF",isActive:true}}); if (staff) await prisma.internalNote.create({data:{ticketId:sample.id,authorId:staff.id,content:"Seeded internal note for staff workflow verification."}}); } } }
  }
  if (prisma.user && prisma.developmentRequester.findMany && prisma.user.findUnique) { for (const legacy of await prisma.developmentRequester.findMany()) { const existing = await prisma.user.findUnique({where:{legacyRequesterId:legacy.id}}); if (!existing) await prisma.user.create({data:{name:legacy.name,email:legacy.email,role:"REQUESTER",isActive:legacy.isActive,passwordHash:passwordHash(),mustChangePassword:true,legacyRequesterId:legacy.id}}); } }
 }
}
