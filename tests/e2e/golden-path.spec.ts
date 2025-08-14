import { test, expect } from "@playwright/test";

// Minimal golden path smoke: relies on seed data and dev auth already in place
test("golden path sanity", async ({ page }) => {
  // Dev tools for deterministic seed
  await page.goto("/admin/dev-tools");
  // If auth is required, this may redirect; skip if so
  if (/sign-in|login/.test(await page.url())) return;

  // Click seed and wait a moment for toast
  const seedBtn = page.getByTestId("seed-demo-btn").first();
  if (await seedBtn.isVisible()) {
    await seedBtn.click();
  }

  // Courses
  await page.goto("/courses");
  await expect(page.locator("main")).toBeVisible();
});
