import { test, expect } from "@playwright/test";

test("modules CRUD basic", async ({ page }) => {
  const code = `E2E-M${Date.now()}`;
  const name = `Module ${Date.now()}`;

  await page.goto("/modules");
  if (/sign-in|login/.test(page.url())) test.skip(true, "auth required");

  await page.getByLabel("Code").fill(code);
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: /^Create$/ }).click();
  await expect(page.locator(`ul >> text=${code}`).first()).toBeVisible();
});
