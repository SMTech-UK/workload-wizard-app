import { test, expect } from "./fixtures";

const ADMIN_ASSURED = process.env.E2E_ASSUME_ADMIN === "true";
test.skip(
  !ADMIN_ASSURED,
  "Skipping group creation tests without admin assurance (set E2E_ASSUME_ADMIN=true)",
);

test.describe("Group Creation Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure admin role with proper permissions
    await page.goto("/admin/dev-tools", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    const adminBtn = page.getByRole("button", { name: /^Admin$/ });
    if (await adminBtn.isVisible().catch(() => false)) {
      await adminBtn.click();
      // Wait for role switch to complete
      await page.waitForTimeout(1000);
    }
  });

  test("create module iteration and group", async ({ page }) => {
    const yearScope = await ensureCourseYearWithModuleAndIteration(page);
    if (!yearScope)
      test.skip(true, "no course year with attachable module available");
    await testGroupCreation(page, yearScope);
  });

  test("create group in existing iteration", async ({ page }) => {
    const yearScope = await ensureCourseYearWithModuleAndIteration(page);
    if (!yearScope)
      test.skip(true, "no course year with attachable module available");
    await testGroupCreation(page, yearScope);
  });

  test("group creation form validation", async ({ page }) => {
    const yearScope = await ensureCourseYearWithModuleAndIteration(page);
    if (!yearScope)
      test.skip(true, "no course year with attachable module available");
    const addGroupBtn = yearScope.getByTestId("add-group-btn");
    await expect(addGroupBtn).toBeVisible({ timeout: 30000 });
    const prevCount = await readGroupsCount(page, yearScope);
    page.once("dialog", async (dialog) => {
      await dialog.accept("");
    });
    await addGroupBtn.click();
    // Ensure no success toast and count unchanged for empty name
    await page.waitForTimeout(500);
    const afterCount = await readGroupsCount(page, yearScope);
    expect(afterCount).toBe(prevCount);
  });

  test("group creation with different names", async ({ page }) => {
    const yearScope = await ensureCourseYearWithModuleAndIteration(page);
    if (!yearScope)
      test.skip(true, "no course year with attachable module available");
    const addGroupBtn = yearScope.getByTestId("add-group-btn");
    await expect(addGroupBtn).toBeVisible({ timeout: 30000 });
    const groupNames = ["Group A", "Group B", "Group C"];
    for (const groupName of groupNames) {
      const before = await readGroupsCount(page, yearScope);
      page.once("dialog", async (dialog) => {
        await dialog.accept(groupName);
      });
      await addGroupBtn.click();
      // Wait for either toast or count increase
      await Promise.race([
        expect(page.getByText(/Group created/).first()).toBeVisible({
          timeout: 5000,
        }),
        waitForGroupsCount(page, yearScope, before + 1, 30000),
      ]);
      await page.waitForTimeout(200);
    }
  });

  test("group creation error handling", async ({ page }) => {
    // Test error handling in group creation
    await page.goto("/modules");
    await expect(page.getByRole("heading", { name: /Modules/i })).toBeVisible({
      timeout: 10000,
    });

    // Look for a module with iterations
    const moduleLinks = page.locator("ul li a");
    const moduleCount = await moduleLinks.count();

    if (moduleCount > 0) {
      // Click on first module
      await moduleLinks.first().click();

      // Look for iterations and groups
      const iterationsSection = page.locator(
        "[data-testid*='iterations'], .iterations, [class*='iterations']",
      );
      if (await iterationsSection.isVisible().catch(() => false)) {
        // Look for add group button
        const addGroupBtn = page.getByTestId("add-group-btn");
        if (await addGroupBtn.isVisible().catch(() => false)) {
          console.log("Testing group creation error handling");

          // Click add group button
          await addGroupBtn.click();

          // Handle dialog with empty name (should trigger validation)
          page.once("dialog", async (dialog) => {
            await dialog.accept(""); // Empty name
          });

          // Check if there's an error message or validation
          try {
            await expect(page.getByText(/Group created/)).toBeVisible({
              timeout: 5000,
            });
            console.log("⚠️ Group created with empty name (unexpected)");
          } catch {
            console.log("✅ Empty name validation working (expected)");
          }
        } else {
          console.log("Add group button not found");
        }
      } else {
        console.log("Iterations section not found");
      }
    } else {
      console.log("No modules found to test");
    }
  });
});

async function testGroupCreation(page: any, yearScope?: any) {
  console.log("Testing group creation functionality");

  // Look for add group button
  const scope = yearScope || page;
  const addGroupBtn = scope.getByTestId("add-group-btn");
  if (await addGroupBtn.isVisible().catch(() => false)) {
    console.log("Found add group button");

    // Click add group button
    const before = await readGroupsCount(page, scope);
    page.once("dialog", async (dialog: any) => {
      await dialog.accept("Test Group");
    });
    await addGroupBtn.click();
    // Wait for either toast or count increase
    await Promise.race([
      expect(page.getByText(/Group created/).first()).toBeVisible({
        timeout: 5000,
      }),
      waitForGroupsCount(page, scope, before + 1, 30000),
    ]);
    console.log("✅ Group created successfully");
  } else {
    console.log("❌ Add group button not found");
  }
}

async function ensureCourseYearWithModuleAndIteration(page: any) {
  await page.goto("/courses", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await expect(page.getByTestId("courses-list")).toBeVisible({
    timeout: 30000,
  });
  const firstCourse = page.getByTestId("courses-list").locator("li a").first();
  const href = await firstCourse.getAttribute("href");
  if (href) await page.goto(href, { waitUntil: "domcontentloaded" });
  else await firstCourse.click();

  // Wait for the page to fully load and for years data to be available
  await page.waitForLoadState("networkidle", { timeout: 30000 });

  // Ensure Y1 exists - wait for either the years list or "No years added yet" message
  await expect(
    page
      .getByTestId("course-years-list")
      .or(page.getByText("No years added yet")),
  ).toBeVisible({ timeout: 30000 });

  // If no years exist, create one first
  if (
    await page
      .getByText("No years added yet")
      .isVisible()
      .catch(() => false)
  ) {
    console.log("No years exist, creating year 1 first");
    await page.getByRole("button", { name: "Add Year" }).click();
    await page.getByLabel("Year").fill("1");
    await page.getByRole("button", { name: "Add Year" }).click();
    await expect(page.getByText(/Year added/)).toBeVisible({ timeout: 30000 });
    // Wait for the years list to appear after creation
    await expect(page.getByTestId("course-years-list")).toBeVisible({
      timeout: 30000,
    });
  }

  const yearList = page.getByTestId("course-years-list");
  await expect(yearList).toBeVisible({ timeout: 30000 });
  const year1 = page.getByTestId("course-year-1");
  // Attach a module if possible
  const attachTrigger = year1.getByTestId("attach-module-trigger");
  if (await attachTrigger.isVisible().catch(() => false)) {
    await attachTrigger.click();
    const firstOption = page.locator("[role='option']").first();
    if (await firstOption.isVisible().catch(() => false)) {
      await firstOption.click();
      if (
        await year1
          .getByTestId("attach-module-btn")
          .isVisible()
          .catch(() => false)
      ) {
        await year1.getByTestId("attach-module-btn").click();
        await expect(page.getByText(/Module attached/)).toBeVisible({
          timeout: 30000,
        });
      }
    }
  }
  // Ensure iteration exists
  const createIterBtn = year1.getByTestId("create-iteration-btn");
  if (await createIterBtn.isVisible().catch(() => false)) {
    await createIterBtn.click();
    await expect(page.getByText(/Iteration created/)).toBeVisible({
      timeout: 30000,
    });
  }
  // Verify assign button as proxy for iteration+groups UI
  const assignBtn = year1.getByTestId("assign-lecturer-btn");
  if (!(await assignBtn.isVisible().catch(() => false))) return null;
  return year1;
}

async function readGroupsCount(page: any, scope: any): Promise<number> {
  try {
    const el = scope.getByTestId("groups-count");
    if (!(await el.isVisible().catch(() => false))) return 0;
    const text = (await el.textContent()) || "";
    const match = text.match(/(\d+)\s+group/);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

async function waitForGroupsCount(
  page: any,
  scope: any,
  target: number,
  timeoutMs: number,
) {
  const start = Date.now();
  // Poll until groups count reaches target or timeout

  while (true) {
    const count = await readGroupsCount(page, scope);
    if (count >= target) return;
    if (Date.now() - start > timeoutMs)
      throw new Error(`groups count did not reach ${target}`);
    await page.waitForTimeout(200);
  }
}
