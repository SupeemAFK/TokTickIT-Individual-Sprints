import { expect, test } from "playwright/test";
test("authentication shell exposes login", async ({page}) => { await page.goto("/"); await expect(page.getByRole("heading",{name:"TokTickIT Login"})).toBeVisible(); });
