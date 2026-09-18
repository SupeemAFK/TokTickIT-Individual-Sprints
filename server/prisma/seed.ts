import { getPrisma } from "../src/prisma.js";
import { developmentRequesters, relatedSystems, seedDatabase, ticketCategories } from "./seed-data.js";
async function main() { await seedDatabase(getPrisma()); console.log("Seeded " + ticketCategories.length + " categories, " + relatedSystems.length + " related systems, " + developmentRequesters.length + " Development Requesters, local Lab 3 accounts, and workflow fixtures."); }
main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await getPrisma().$disconnect(); });
