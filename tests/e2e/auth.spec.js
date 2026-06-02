import { test, expect } from "@playwright/test";

// Public smoke test — no credentials required. Verifies the app boots, the
// unauthenticated user is redirected to the sign-in page, and the login form
// renders and validates. Catches the most common "white screen" regressions.
test.describe("sign-in page", () => {
  test("redirects root to /signin and shows the login form", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/signin/);

    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("rejects empty submission (HTML5 required)", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Required email field blocks submission, so we stay on /signin.
    await expect(page).toHaveURL(/\/signin/);
  });
});

// Authenticated happy-path: log in as staff and submit an incident report.
// Runs only when E2E_EMAIL / E2E_PASSWORD are provided (e.g. a seeded test
// account), so it never fails in environments without credentials.
const hasCreds = process.env.E2E_EMAIL && process.env.E2E_PASSWORD;
test.describe("staff incident flow", () => {
  test.skip(!hasCreds, "Set E2E_EMAIL and E2E_PASSWORD to run this flow");

  test("staff can sign in and submit an incident report", async ({ page }) => {
    await page.goto("/signin");
    await page.locator('input[type="email"]').fill(process.env.E2E_EMAIL);
    await page.locator('input[type="password"]').fill(process.env.E2E_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Land on a dashboard after login.
    await expect(page).toHaveURL(/\/dashboard/);

    // TODO: navigate to the incident report form, fill the required fields,
    // submit, and assert the new reference ID appears in the live feed.
    // Left as a scaffold because it depends on the seeded scheme/test account.
  });
});
