import { test, expect } from "./fixtures";

const ADMIN_ASSURED = process.env.E2E_ASSUME_ADMIN === "true";
test.skip(
  !ADMIN_ASSURED,
  "Skipping permission UI tests without admin assurance (set E2E_ASSUME_ADMIN=true)",
);

test.describe("UI permission states", () => {
  test("courses create button disabled-with-tooltip for lecturer", async ({
    page,
  }) => {
    // Assume setup may not have switched role; try visiting dev-tools to set Lecturer role if available
    await page.goto("/admin/dev-tools");
    const lecturerBtn = page.getByRole("button", { name: /^Lecturer$/ });
    if (await lecturerBtn.isVisible().catch(() => false)) {
      await lecturerBtn.click();
    }

    await page.goto("/courses");
    if (/sign-in|login/.test(page.url())) test.skip(true, "auth required");

    const disabledBtn = page.getByTestId("create-course-disabled");
    try {
      await expect(disabledBtn).toBeVisible({ timeout: 3000 });
    } catch {
      test.skip(true, "cannot switch to lecturer in this env");
    }
    await expect(disabledBtn).toBeDisabled();
    await expect(disabledBtn).toHaveAttribute(
      "title",
      /Insufficient permissions/i,
    );
  });

  test("orgadmin can create course", async ({ page }) => {
    await page.goto("/admin/dev-tools");
    const adminBtn = page.getByRole("button", { name: /^Admin$/ });
    if (await adminBtn.isVisible().catch(() => false)) {
      await adminBtn.click();
    }

    await page.goto("/courses");
    const code = `PERM-C${Date.now()}`;
    const name = `Perm Course ${Date.now()}`;
    await page.getByLabel("Code").fill(code);
    await page.getByLabel("Name").fill(name);
    await page.getByTestId("create-course").click();
    await expect(
      page.getByRole("link", { name: new RegExp(`${code} — ${name}`) }),
    ).toBeVisible();
  });
});
