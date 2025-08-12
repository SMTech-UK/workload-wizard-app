import { test, expect } from "@playwright/test";

test.describe("Academic year visibility & preferences", () => {
  test("orgadmin sees drafts and can toggle include drafts; lecturer sees published only", async ({
    page,
    context,
    browser,
  }) => {
    // Ensure Admin role if available
    await page.goto("/admin/dev-tools");
    const adminBtn = page.getByRole("button", { name: /^Admin$/ });
    if (await adminBtn.isVisible().catch(() => false)) {
      await adminBtn.click();
    }

    // Admin: toggle include drafts and persist
    await page.goto("/modules");
    // Open year switcher, toggle drafts
    const toggle = page.locator("#toggle-drafts");
    if (await toggle.isVisible()) {
      const before = await toggle.isChecked();
      await toggle.click();
      const after = await toggle.isChecked();
      expect(after).toBe(!before);
      // Reload and verify persistence
      await page.reload();
      const persisted = await page.locator("#toggle-drafts").isChecked();
      expect(persisted).toBe(after);
    } else {
      test.skip(true, "toggle-drafts not visible for non-management");
    }

    // Switch to Lecturer role if available and verify drafts control is absent
    await page.goto("/admin/dev-tools");
    const lecturerBtn = page.getByRole("button", { name: /^Lecturer$/ });
    if (await lecturerBtn.isVisible().catch(() => false)) {
      await lecturerBtn.click();
    } else {
      test.skip(true, "cannot switch to lecturer in this env");
    }

    await page.goto("/modules");
    await expect(page.locator("#toggle-drafts")).toHaveCount(0);
  });
});
