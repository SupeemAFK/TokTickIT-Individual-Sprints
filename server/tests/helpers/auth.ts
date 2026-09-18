import { scryptSync } from "node:crypto";
import request from "supertest";
import type { Express } from "express";

const password = "Lab3Pass123";
const salt = "00112233445566778899aabbccddeeff";
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
export const requesterUser = { id: 1, name: "Anan Kittisak", email: "requester@test", role: "REQUESTER", isActive: true, mustChangePassword: false, legacyRequesterId: 1 };
export const staffUser = { id: 2, name: "Arun Support", email: "staff@test", role: "IT_STAFF", isActive: true, mustChangePassword: false, legacyRequesterId: null };
export const adminUser = { id: 3, name: "Aom Administrator", email: "admin@test", role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, legacyRequesterId: null };
export function configureUserAuth(findUnique: any, user: typeof requesterUser | typeof staffUser | typeof adminUser = requesterUser) {
  findUnique.mockImplementation(async ({ where }: any) => {
    if (where?.id === user.id || where?.email === user.email) return { ...user, passwordHash };
    return null;
  });
}
export function configureRequesterAuth(findUnique: any) { configureUserAuth(findUnique, requesterUser); }
export async function loginAs(app: Express, user: typeof requesterUser | typeof staffUser | typeof adminUser): Promise<string> {
  const response = await request(app).post("/api/auth/login").send({ email: user.email, password });
  if (response.status !== 200) throw new Error(`Test login failed: ${response.status}`);
  return response.body.token as string;
}
export async function loginRequester(app: Express): Promise<string> {
  return loginAs(app, requesterUser);
}
