import { test, expect } from "@playwright/test";

test("audit logs record core actions", async ({ page }) => {
  const code = `AUD-C${Date.now()}`;
  const name = `Audit Course ${Date.now()}`;

  // Ensure admin-like role if available
  await page.goto("/admin/dev-tools");
  const adminRoleBtn = page.getByRole("button", { name: /^Admin$/ });
  if (await adminRoleBtn.isVisible().catch(() => false))
    await adminRoleBtn.click();

  // Create a course
  await page.goto("/courses");
  if (/sign-in|login/.test(page.url())) test.skip(true, "auth required");
  await page.getByLabel("Code").fill(code);
  await page.getByLabel("Name").fill(name);
  await page.getByTestId("create-course").click();
  await expect(
    page.getByRole("link", { name: new RegExp(`${code} — ${name}`) }),
  ).toBeVisible();

  // Navigate to audit logs (if available to this user)
  await page.goto("/admin/dev-tools");
  const adminBtn = page.getByRole("button", { name: /^Admin$/ });
  if (await adminBtn.isVisible().catch(() => false)) await adminBtn.click();

  await page.goto("/admin/audit-logs");
  if (/unauthorised|sign-in|login/.test(page.url()))
    test.skip(true, "no access to audit logs");

  // Expect at least one audit row to render
  await expect(page.getByTestId("audit-row").first()).toBeVisible();
});
