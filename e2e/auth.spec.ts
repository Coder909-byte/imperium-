import { test, expect } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, sql } from "../db";
import { user } from "../db/schema";

const email = `e2e-${Date.now()}@example.com`;
const password = "Passw0rd!23";

test.afterAll(async () => {
  // Real dev DB, no test branch yet (M0) — don't leave rows behind for
  // quiz-analytics queries to trip over later.
  await db.delete(user).where(eq(user.email, email));
  await sql.end({ timeout: 5 });
});

test("signup, logout, login, session survives a hard refresh", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await page.waitForURL("**/profile");
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Tiro")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/login");

  await page.goto("/profile");
  await page.waitForURL("**/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await page.waitForURL("**/profile");
  await expect(page.getByText(email)).toBeVisible();

  await page.reload();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText("Tiro")).toBeVisible();
});
