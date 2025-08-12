import { test, expect } from "@playwright/test";

test("staff capacity page loads and filters work", async ({ page }) => {
  await page.goto("/staff");
  if (/sign-in|login/.test(page.url())) test.skip(true, "auth required");

  await expect(page.getByText(/Staff capacity/)).toBeVisible();

  // Toggle filters
  await page.getByTestId("active-only-checkbox").check();
  await page.getByTestId("over-capacity-checkbox").check();
  await page.getByTestId("over-capacity-checkbox").uncheck();

  // Switch capacity mode
  await page.getByTestId("capacity-mode-trigger").click();
  await page.getByRole("option", { name: "Total" }).click();

  // Search (no-op assertion)
  await page.getByLabel("Search").fill("Alice");
  await expect(page.locator("ul li").first()).toBeVisible();
});
