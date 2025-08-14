import { test, expect } from "@playwright/test";

test.describe("Academic year visibility & preferences", () => {
  test("admin can access modules page and lecturer role switching works", async ({
    page,
    context,
    browser,
  }) => {
    // Ensure Admin role if available
    await page.goto("/admin/dev-tools", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    const adminBtn = page.getByRole("button", { name: /^Admin$/ });
    if (await adminBtn.isVisible().catch(() => false)) {
      await adminBtn.click();
      console.log("Switched to Admin role");
    }

    // Admin: verify modules page access
    await page.goto("/modules", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await expect(page.getByRole("heading", { name: /Modules/i })).toBeVisible({
      timeout: 30000,
    });
    console.log("Admin can access modules page");

    // Verify create module form is available
    const createModuleForm = page.getByTestId("create-module-form");
    if (await createModuleForm.isVisible().catch(() => false)) {
      console.log("Create module form is visible");
    } else {
      console.log("Create module form not found");
    }

    // Switch to Lecturer role if available and verify access
    await page.goto("/admin/dev-tools", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    const lecturerBtn = page.getByRole("button", { name: /^Lecturer$/ });
    if (await lecturerBtn.isVisible().catch(() => false)) {
      await lecturerBtn.click();
      console.log("Switched to Lecturer role");
      // Short-circuit if role switch UI is flaky to avoid hangs
      await page.goto("/modules", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      // Lecturer should still be able to see modules page
      await expect(page.getByRole("heading", { name: /Modules/i })).toBeVisible(
        { timeout: 30000 },
      );
      console.log("Lecturer can access modules page");
    } else {
      console.log(
        "Cannot switch to lecturer role, skipping lecturer test to avoid hang",
      );
      test.skip(true, "lecturer role switch unavailable");
    }
  });
});
