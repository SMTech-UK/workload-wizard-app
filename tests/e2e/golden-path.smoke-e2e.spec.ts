import { test, expect } from "./fixtures";

test("smoke: dashboard loads", async ({ page }) => {
  await page.goto("/dashboard");
  if (/sign-in|login/.test(page.url())) test.skip(true, "auth required");
  await expect(page.getByText("Coming Soon")).toBeVisible();
});
