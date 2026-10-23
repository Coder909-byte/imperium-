import { expect, test } from "@playwright/test";

// All POSTs below are intercepted; this suite never creates shared DB data.
test("landing has honest availability, public CTAs and no scene runtime", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "IMPERIUM", exact: true })).toBeVisible();
  await expect(page.getByText("Gallia’s quiz is available", { exact: false })).toBeVisible();
  await expect(page.getByText("Available flagship", { exact: true })).toBeVisible();
  await expect(page.locator("canvas, audio")).toHaveCount(0);
  expect(requests.some((url) => /assets\/gallia|kokoro|onnx|howler|pixi/i.test(url))).toBe(false);
  expect(requests.some((url) => /fonts\.googleapis|fonts\.gstatic/.test(url))).toBe(false);
  await page.getByRole("link", { name: "Explore the Atlas", exact: false }).first().click();
  await expect(page).toHaveURL(/\/atlas$/);
  await expect(page.getByRole("button", { name: "Open Gallia scene preview — 52 BC", exact: true })).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: "Experience Gallia", exact: false }).first().click();
  await expect(page).toHaveURL(/\/scene\/gallia$/);
  await expect(page.getByRole("heading", { name: "The hill", exact: true })).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`shell fits ${width}px with readable keyboard and reduced-motion controls`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    for (const path of ["/", "/login", "/signup"]) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#main-content$/);
      const styles = await page.locator(".shell-button").first().evaluate((el) => ({ transition: getComputedStyle(el).transitionDuration, outline: getComputedStyle(el).outlineStyle }));
      expect(styles.transition).toBe("0s");
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    }
  });
}

test("native validation prevents empty email and short signup password requests", async ({ page }) => {
  let posts = 0;
  await page.route("**/api/auth/**", async (route) => { posts++; await route.abort(); });
  await page.goto("/signup");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  expect(await page.locator("#email").evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  await page.getByLabel("Email", { exact: true }).fill("reader@example.com");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  expect(await page.locator("#password").evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true);
  expect(posts).toBe(0);
});

for (const mode of ["login", "signup"] as const) {
  test(`${mode} keeps Better Auth payload, pending and recoverable server error`, async ({ page }) => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let body: Record<string, unknown> = {};
    await page.route(`**/api/auth/${mode === "login" ? "sign-in" : "sign-up"}/email`, async (route) => {
      body = route.request().postDataJSON() as Record<string, unknown>;
      await pending;
      await route.fulfill({ status: 400, json: { code: "TEST_REJECTION", message: "Check your email and password, then try again." } });
    });
    await page.goto(`/${mode}`);
    await page.getByLabel("Email", { exact: true }).fill("reader@example.com");
    await page.getByLabel("Password", { exact: true }).fill("Passw0rd!23");
    await page.getByRole("button", { name: mode === "login" ? "Log in" : "Sign up", exact: true }).click();
    await expect(page.getByRole("button", { name: mode === "login" ? "Logging in…" : "Creating account…" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    expect(body.email).toBe("reader@example.com");
    expect(body.password).toBe("Passw0rd!23");
    if (mode === "signup") expect(body.name).toBe("reader");
    release?.();
    await expect(page.locator("#auth-error")).toHaveText("Check your email and password, then try again.");
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue("reader@example.com");
    await expect(page.getByRole("button", { name: mode === "login" ? "Log in" : "Sign up", exact: true })).toBeEnabled();
  });
}

test("Google retains provider and profile callback, with a visible failure state", async ({ page }) => {
  let body: Record<string, unknown> = {};
  await page.route("**/api/auth/sign-in/social", async (route) => {
    body = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 503, json: { code: "TEST_REJECTION", message: "Google sign-in could not start. Try again." } });
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.locator("#auth-error")).toHaveText("Google sign-in could not start. Try again.");
  expect(body.provider).toBe("google");
  expect(body.callbackURL).toBe("/profile");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
});

test("successful email auth still navigates to profile; unauthenticated profile redirects", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login$/);
  await page.route("**/api/auth/sign-in/email", (route) => route.fulfill({ json: { token: "synthetic-token", user: { id: "synthetic", email: "reader@example.com", name: "reader" } } }));
  let reachedProfile = false;
  await page.route("**/profile**", async (route) => {
    reachedProfile = true;
    await route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><html><body><h1>Mock profile destination</h1></body></html>" });
  });
  await page.getByLabel("Email", { exact: true }).fill("reader@example.com");
  await page.getByLabel("Password", { exact: true }).fill("Passw0rd!23");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect.poll(() => reachedProfile).toBe(true);
  await expect(page).toHaveURL(/\/profile$/);
});

test("profile preview has an honest empty state and logout recovers from an error", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/auth/sign-out", async (route) => {
    attempts++;
    if (attempts === 1) await route.fulfill({ status: 503, json: { code: "TEST_REJECTION", message: "Temporary failure" } });
    else await route.fulfill({ json: { success: true } });
  });
  await page.goto("/dev/shell");
  await expect(page.getByText("reader@example.com")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your journeys will have a home here." })).toBeVisible();
  await expect(page.getByText("Saved progress, quiz history and achievements are not available yet.", { exact: false })).toBeVisible();
  await expect(page.getByText("Tiro", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByText("Could not log out. Check your connection and try again.")).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
