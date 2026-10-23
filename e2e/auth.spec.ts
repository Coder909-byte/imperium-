import { test, expect } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, sql } from "../db";
import { user } from "../db/schema";
import { assertIsolatedTestDatabase } from "../lib/testDatabase";

assertIsolatedTestDatabase(process.env.DATABASE_URL);

const email = `e2e-${Date.now()}@example.com`;
const password = "Passw0rd!23";

test.afterAll(async () => {
  // The loopback/database guard above prevents shared-DB cleanup.
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
  await expect(page.getByText("No completed quizzes yet. Gallia is ready when you are.")).toBeVisible();

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
  await expect(page.getByText("No completed quizzes yet. Gallia is ready when you are.")).toBeVisible();
});
