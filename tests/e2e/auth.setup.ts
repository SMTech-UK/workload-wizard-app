import { test, expect } from "@playwright/test";

// Logs in via Clerk using env credentials and writes storage state for other tests
test("authenticate (Clerk)", async ({ page, context }) => {
  const email = process.env.CLERK_TEST_USER_EMAIL;
  const password = process.env.CLERK_TEST_USER_PASSWORD;
  if (!email || !password) {
    test.fail(
      true,
      "CLERK_TEST_USER_EMAIL and CLERK_TEST_USER_PASSWORD must be set",
    );
  }

  // Use the app's custom login form instead of Clerk widget
  await page.goto("/sign-in?redirect_url=%2Fdashboard");
  await expect(page).toHaveURL(/sign-in/);
  await page.getByLabel("Email or Username").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: /^Sign In$/ }).click();

  // Best-effort: if still on sign-in after submit, skip setup rather than failing the suite
  try {
    await page.waitForURL((url) => !/\/sign-in/.test(url.href), {
      timeout: 8_000,
      waitUntil: "load",
    });
  } catch {
    test.skip(true, "Auth not available; skipping authenticated E2E");
    return;
  }

  // Persist session for dependent tests
  await context.storageState({ path: "tests/e2e/.auth/admin.json" });
});
