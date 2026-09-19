import { expect, test, type Page, type Route } from "playwright/test";

const administrator = { id: 2, name: "Admin One", email: "admin@example.test", role: "ADMINISTRATOR", isActive: true };
const requester = { id: 8, name: "Ada Requester", email: "ada@example.test", role: "REQUESTER", isActive: true };
const staff = { id: 4, name: "IT Staff One", email: "staff@example.test", role: "IT_STAFF", isActive: true };

async function installUserAdminMock(page: Page, currentUser = administrator) {
  let users = [requester, staff, administrator];
  const json = (route: Route, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (url.pathname === "/api/auth/me") return json(route, { user: currentUser, mustChangePassword: false });
    if (url.pathname === "/api/categories" || url.pathname === "/api/related-systems") return json(route, []);
    if (url.pathname === "/api/tickets" && method === "GET") return json(route, { items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } });
    if (url.pathname === "/api/admin/users" && method === "GET") {
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const role = url.searchParams.get("role");
      const items = users.filter((user) => (!search || `${user.name} ${user.email}`.toLowerCase().includes(search)) && (!role || user.role === role));
      return json(route, { items });
    }
    if (url.pathname === "/api/admin/users" && method === "POST") {
      const body = request.postDataJSON() as Record<string, unknown>;
      const user = { id: 20, name: String(body.name), email: String(body.email).toLowerCase(), role: String(body.role), isActive: Boolean(body.isActive) } as typeof requester;
      users = [...users, user];
      return json(route, user, 201);
    }
    const updateMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
    if (updateMatch && method === "PATCH") {
      const body = request.postDataJSON() as Record<string, unknown>;
      const id = Number(updateMatch[1]);
      users = users.map((user) => user.id === id ? { ...user, ...body } : user);
      return json(route, users.find((user) => user.id === id));
    }
    if (/^\/api\/admin\/users\/\d+\/initial-password$/.test(url.pathname) && method === "POST") return route.fulfill({ status: 204, body: "" });
    return json(route, {});
  });
}

async function openUserManagement(page: Page) {
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-admin-session"));
  await page.reload();
  await page.getByRole("button", { name: "User Management" }).click();
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
}

test("Administrator can search, filter, create, edit, deactivate, and reset users responsively", async ({ page }) => {
  await installUserAdminMock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openUserManagement(page);
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText("Ada Requester").first()).toBeVisible();

  await page.getByLabel("Search name or email").fill("ada");
  await page.locator("#user-role-filter").selectOption("REQUESTER");
  await expect(page.locator("#user-name-8")).toHaveValue("Ada Requester");

  await page.getByLabel("Search name or email").fill("");
  await page.locator("#user-role-filter").selectOption("");
  await page.locator("#new-user-name").fill("New Support");
  await page.locator("#new-user-email").fill("new.support@example.test");
  await page.locator("#new-user-role").selectOption("IT_STAFF");
  await page.locator("#new-user-password").fill("InitialStaff123");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("status").filter({ hasText: "User created with a required first-login password change." })).toBeVisible();
  await expect(page.getByLabel("Name for new.support@example.test")).toHaveValue("New Support");

  await page.getByLabel("Name for ada@example.test").fill("Ada Updated");
  await page.getByRole("button", { name: "Save changes" }).first().click();
  await expect(page.getByLabel("Name for ada@example.test")).toHaveValue("Ada Updated");

  await page.setViewportSize({ width: 768, height: 1024 });
  const tabletRoleSelect = page.locator("#new-user-role");
  await expect(tabletRoleSelect).toBeVisible();
  expect(await tabletRoleSelect.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.getByRole("button", { name: "Deactivate" }).first().click();
  await expect(page.getByRole("button", { name: "Reactivate" }).first()).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept("ResetStaff123"));
  await page.getByRole("button", { name: "Reset password" }).first().click();
  await expect(page.getByRole("status")).toContainText("Initial password reset");
  await expect(page.locator("body")).not.toContainText("ResetStaff123");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".user-card").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(page.getByRole("heading", { name: "Create user" })).toBeVisible();
});

test("Requester does not receive User Management navigation", async ({ page }) => {
  await installUserAdminMock(page, requester);
  await page.goto("/");
  await page.evaluate(() => sessionStorage.setItem("toktickit.token", "e2e-requester-session"));
  await page.reload();
  await expect(page.locator("header")).toBeVisible();
  await expect(page.getByText("Ada Requester · REQUESTER")).toBeVisible();
  await expect(page.getByRole("button", { name: "User Management" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "User Management" })).not.toBeVisible();
});
