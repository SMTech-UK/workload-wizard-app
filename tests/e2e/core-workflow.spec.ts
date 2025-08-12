import { test, expect } from "@playwright/test";

// Core workflow: academic year → course → module → iteration → group → allocation
test.describe.configure({ mode: "serial" });

test("core workflow e2e", async ({ page }) => {
  const courseCode = `E2E${Date.now()}`;
  const courseName = `E2E Course ${Date.now()}`;
  const moduleCode = `E2E-MOD${Date.now()}`;
  const moduleName = `E2E Module ${Date.now()}`;
  // 0) Seed deterministic demo data (if dev tools accessible); skip test if auth redirects
  await page.goto("/admin/dev-tools");
  // With storageState from auth.setup, we expect to be authenticated
  await expect(page).toHaveURL(/admin\/dev-tools/);

  const seedBtn = page.getByRole("button", { name: /Seed demo/i });
  if (await seedBtn.isVisible()) {
    await seedBtn.click();
  }
  // Ensure we have permissions in demo org
  const adminBtn = page.getByRole("button", { name: /^Admin$/ });
  if (await adminBtn.isVisible()) {
    await adminBtn.click();
  }

  // 1) Create Academic Year
  await page.goto("/admin/academic-years");
  await page.getByLabel("Name").fill("2027/28");
  await page.getByLabel("Start date").fill("2027-08-01");
  // End date auto-fills; ensure Create enabled then create
  await page.getByRole("button", { name: /^Create$/ }).click();

  // Expect the new year to appear in the list (avoid matching toast text)
  await expect(page.locator("ul >> text=2027/28").first()).toBeVisible();

  // 2) Create Course (unique) or click it if already exists
  await page.goto("/courses");
  const targetCourseLink = page.getByRole("link", {
    name: new RegExp(`${courseCode} — ${courseName}`),
  });
  if (!(await targetCourseLink.isVisible().catch(() => false))) {
    await page.getByLabel("Code").fill(courseCode);
    await page.getByLabel("Name").fill(courseName);
    // Create button may be disabled if code clashes; with unique code it will enable
    await page.getByRole("button", { name: /^Create$/ }).click();
    await expect(
      page.getByText(new RegExp(`${courseCode} — ${courseName}`)),
    ).toBeVisible();
  }
  await page
    .getByRole("link", { name: new RegExp(`${courseCode} — ${courseName}`) })
    .click();

  // 3) Add Year 1 for the new course
  const addYearBtn = page.getByTestId("add-year-btn");
  await page.locator("#yearNumber").fill("1");
  await expect(addYearBtn).toBeEnabled();
  await addYearBtn.click();
  await expect(page.getByText("Year added")).toBeVisible();

  // 4) Create Module
  await page.goto("/modules");
  await page.getByLabel("Code").fill(moduleCode);
  await page.getByLabel("Name").fill(moduleName);
  await page.getByLabel(/Credits/).fill("20");
  await page.getByRole("button", { name: /^Create$/ }).click();
  await expect(page.locator(`ul >> text=${moduleCode}`).first()).toBeVisible();

  // 5) Attach Module to Course Year 1
  await page.goto("/courses");
  await page
    .getByRole("link", { name: new RegExp(`${courseCode} — ${courseName}`) })
    .click();
  await expect(page.getByText("Y1")).toBeVisible();

  // Attach flow: open module select and choose our module
  // Use testids to avoid flakiness
  await expect(page.getByText("Attach Module")).toBeVisible();
  const attachTrigger = page.getByTestId("attach-module-trigger");
  if (await attachTrigger.isVisible().catch(() => false)) {
    await attachTrigger.click();
    await page
      .getByRole("option", {
        name: new RegExp(`${moduleCode} — ${moduleName}`),
      })
      .click();
    await page.getByTestId("attach-module-btn").click();
    await expect(page.getByText(/Module attached/)).toBeVisible();
  }

  // 6) Create Iteration for selected AY (uses default selected year in UI)
  const createIterBtn = page.getByRole("button", { name: /Create iteration/ });
  if (await createIterBtn.isVisible()) {
    await createIterBtn.click();
    await expect(page.getByText(/Iteration created/)).toBeVisible();
  }

  // 7) Create a Group under the iteration
  page.once("dialog", async (dialog) => {
    await dialog.accept("Group E2E");
  });
  await page.getByTestId("add-group-btn").click();
  await expect(page.getByText(/Group created/)).toBeVisible();

  // 8) Verify assignment UI is reachable (no-op to avoid relying on seeded staff)
  await page.getByRole("button", { name: /Assign lecturer/ }).click();
  await expect(page.getByText(/Assign Lecturer/)).toBeVisible();
});
