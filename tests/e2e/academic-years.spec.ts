import { test, expect } from "./fixtures";

test("admin can create and publish academic year", async ({ page }) => {
  const yearName = `AY-${Date.now()}`;

  // Navigate to academic years page
  await page.goto("/admin/academic-years");
  // If auth required, the setup may have skipped; tolerate redirect by early return
  if (/sign-in|login/.test(page.url())) test.skip(true, "auth required");

  // Create a new academic year
  await page.getByLabel("Name").fill(yearName);
  await page.getByLabel("Start date").fill("2029-08-01");
  await page.getByRole("button", { name: /^Create$/ }).click();

  // Find the new row
  const row = page.locator("li", { hasText: yearName }).first();
  await expect(row).toBeVisible();

  // Publish it
  const publishBtn = row.getByRole("button", { name: "Publish" });
  await publishBtn.click();

  // Verify status updated
  await expect(row).toContainText("published");

  // Set as default
  const setDefaultBtn = row.getByRole("button", { name: "Set default" });
  await setDefaultBtn.click();
  await expect(row).toContainText("default");
});
