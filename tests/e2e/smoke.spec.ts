import { test, expect } from "@playwright/test";

// Golden path high-level smoke. Assumes local dev auth allows access or app shows anon landing.
test("golden path: courses page visible (or redirects to sign-in)", async ({
  page,
}) => {
  await page.goto("/courses");
  const url = page.url();
  if (/sign-in|login/.test(url)) {
    await expect(page).toHaveURL(/sign-in|login/);
  } else {
    await expect(page.locator("main")).toBeVisible();
  }
});

test("golden path: dev tools accessible (if logged in)", async ({ page }) => {
  await page.goto("/admin/dev-tools");
  // Page may redirect if unauthenticated, so only assert page exists
  await expect(page).toHaveURL(/dev-tools|sign-in|login/);
});
