export const ticketCategories = ["Account and Access", "Hardware", "Software", "Network"] as const;
export const relatedSystems = ["Email", "Campus Wi-Fi", "VPN", "LEB2 App", "Grade Submission App", "Corporate Laptop"] as const;
export const developmentRequesters = [
 { name: "Nicha Somchai", email: "nicha.somchai@toktickit.test", isActive: true },
 { name: "Anan Kittisak", email: "anan.kittisak@toktickit.test", isActive: true },
 { name: "Mali Charoen", email: "mali.charoen@toktickit.test", isActive: true },
 { name: "Preecha Wattanakul", email: "preecha.wattanakul@toktickit.test", isActive: true },
 { name: "Suda Inactive", email: "suda.inactive@toktickit.test", isActive: false },
] as const;
type SeedPrisma = { category: { upsert: (a: any) => Promise<unknown> }; relatedSystem: { upsert: (a: any) => Promise<unknown> }; developmentRequester: { upsert: (a: any) => Promise<unknown> } };
export async function seedDatabase(prisma: SeedPrisma): Promise<void> {
 for (const name of ticketCategories) await prisma.category.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
 for (const name of relatedSystems) await prisma.relatedSystem.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
 for (const requester of developmentRequesters) await prisma.developmentRequester.upsert({ where: { email: requester.email }, update: { name: requester.name, isActive: requester.isActive }, create: requester });
}
