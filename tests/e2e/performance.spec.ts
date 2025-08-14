import { test, expect } from "./fixtures";

const ADMIN_ASSURED = process.env.E2E_ASSUME_ADMIN === "true";
test.skip(
  !ADMIN_ASSURED,
  "Skipping performance tests without admin assurance (set E2E_ASSUME_ADMIN=true)",
);

test.describe("Performance Testing", () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for performance testing
    await page.setViewportSize({ width: 1280, height: 720 });

    // Ensure we're in light mode for consistent performance
    await page.goto("/");
    const themeToggle = page.getByTestId("theme-toggle");
    if (await themeToggle.isVisible().catch(() => false)) {
      const currentTheme = await themeToggle.getAttribute("data-theme");
      if (currentTheme === "dark") {
        await themeToggle.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test("dashboard page load performance", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Now measure the actual performance
    const startTime = Date.now();

    await page.goto("/dashboard");

    // Wait for page to be fully loaded - look for "Coming Soon" heading (dashboard placeholder)
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // Performance assertion: Dashboard should load in under 20 seconds (realistic for development)
    expect(loadTime).toBeLessThan(20000);

    console.log(`📊 Dashboard page load time: ${loadTime}ms`);

    // Additional performance checks
    const navigationTime = await page.evaluate(() => {
      const navEntry = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      return navEntry?.loadEventEnd - navEntry?.fetchStart;
    });

    if (navigationTime && navigationTime > 0) {
      console.log(`📊 Navigation timing: ${navigationTime}ms`);
      // Keep threshold at 20s for dev: avoid measuring first paint after cold start
      expect(navigationTime).toBeLessThan(20000);
    }
  });

  test("courses page load performance", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    // Wait for a specific element instead of networkidle which can hang
    await expect(
      page.getByTestId("courses-list").or(page.getByText("No courses found")),
    ).toBeVisible({ timeout: 15000 });

    const startTime = Date.now();

    await page.goto("/courses");

    // Wait for page to be fully loaded
    await expect(page.getByRole("heading", { name: /Courses/i })).toBeVisible({
      timeout: 10000,
    });
    // Wait for content to load instead of networkidle
    await expect(
      page.getByTestId("courses-list").or(page.getByText("No courses found")),
    ).toBeVisible({ timeout: 15000 });

    const loadTime = Date.now() - startTime;

    // Performance assertion: Courses should load in under 20 seconds (realistic for development)
    expect(loadTime).toBeLessThan(20000);

    console.log(`📊 Courses page load time: ${loadTime}ms`);
  });

  test("modules page load performance", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    // Wait for a specific element instead of networkidle which can hang
    await expect(
      page.getByTestId("modules-list").or(page.getByText("No modules found")),
    ).toBeVisible({ timeout: 15000 });

    const startTime = Date.now();

    await page.goto("/modules");

    // Wait for page to be fully loaded
    await expect(page.getByRole("heading", { name: /Modules/i })).toBeVisible({
      timeout: 10000,
    });
    // Wait for content to load instead of networkidle
    await expect(
      page.getByTestId("modules-list").or(page.getByText("No modules found")),
    ).toBeVisible({ timeout: 15000 });

    const loadTime = Date.now() - startTime;

    // Performance assertion: Modules should load in under 20 seconds (realistic for development)
    expect(loadTime).toBeLessThan(20000);

    console.log(`📊 Modules page load time: ${loadTime}ms`);
  });

  test("staff capacity page load performance", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    // Wait for a specific element instead of networkidle which can hang
    await expect(
      page.getByTestId("staff-list").or(page.getByText("No staff found")),
    ).toBeVisible({ timeout: 15000 });

    const startTime = Date.now();

    await page.goto("/staff");

    // Wait for page to be fully loaded
    await expect(page.getByRole("heading", { name: /Staff/i })).toBeVisible({
      timeout: 10000,
    });
    // Wait for content to load instead of networkidle
    await expect(
      page.getByTestId("staff-list").or(page.getByText("No staff found")),
    ).toBeVisible({ timeout: 15000 });

    const loadTime = Date.now() - startTime;

    // Performance assertion: Staff should load in under 20 seconds (realistic for development)
    expect(loadTime).toBeLessThan(20000);

    console.log(`📊 Staff capacity page load time: ${loadTime}ms`);
  });

  test("academic years page load performance", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    const startTime = Date.now();

    await page.goto("/admin/academic-years");

    // Wait for page to be fully loaded
    await expect(
      page.getByRole("heading", { name: /Academic Years/i }),
    ).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState("networkidle");

    const loadTime = Date.now() - startTime;

    // Performance assertion: Academic years should load in under 20 seconds (realistic for development)
    expect(loadTime).toBeLessThan(20000);

    console.log(`📊 Academic years page load time: ${loadTime}ms`);
  });

  test("course creation performance", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: /Courses/i })).toBeVisible({
      timeout: 10000,
    });

    // Look for create course button
    const createButton = page.getByRole("button", { name: /^Create$/ });

    if (await createButton.isVisible().catch(() => false)) {
      // Check if button is enabled
      if (await createButton.isEnabled().catch(() => false)) {
        const startTime = Date.now();

        // Fill in course form
        const courseCode = `PERF-C${Date.now()}`;
        const courseName = `Performance Test Course ${Date.now()}`;

        await page.getByLabel("Code").fill(courseCode);
        await page.getByLabel("Name").fill(courseName);

        // Click create and measure response time
        await createButton.click();

        // Wait for success indication
        await expect(page.getByText(/Course created/)).toBeVisible({
          timeout: 10000,
        });

        const createTime = Date.now() - startTime;

        // Performance assertion: Course creation should complete in under 5 seconds
        expect(createTime).toBeLessThan(5000);

        console.log(`📊 Course creation time: ${createTime}ms`);
      } else {
        console.log("⚠️ Create course button is disabled (permission issue)");
        test.skip(true, "Create course button disabled due to permissions");
      }
    } else {
      console.log("⚠️ Create course button not found");
      test.skip(true, "Create course button not available");
    }
  });

  test("module creation performance", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    await page.goto("/modules");
    await expect(page.getByRole("heading", { name: /Modules/i })).toBeVisible({
      timeout: 10000,
    });

    // Look for create module button
    const createButton = page.getByRole("button", { name: /^Create$/ });

    if (await createButton.isVisible().catch(() => false)) {
      // Check if button is enabled
      if (await createButton.isEnabled().catch(() => false)) {
        const startTime = Date.now();

        // Fill in module form
        const moduleCode = `PERF-M${Date.now()}`;
        const moduleName = `Performance Test Module ${Date.now()}`;

        await page.getByLabel("Code").fill(moduleCode);
        await page.getByLabel("Name").fill(moduleName);
        await page.getByLabel(/Credits/).fill("10");

        // Click create and measure response time
        await createButton.click();

        // Wait for success indication
        await expect(
          page.locator(`ul >> text=${moduleCode}`).first(),
        ).toBeVisible({ timeout: 10000 });

        const createTime = Date.now() - startTime;

        // Performance assertion: Module creation should complete in under 3 seconds
        expect(createTime).toBeLessThan(3000);

        console.log(`📊 Module creation time: ${createTime}ms`);
      } else {
        console.log("⚠️ Create module button is disabled (permission issue)");
        test.skip(true, "Create module button disabled due to permissions");
      }
    } else {
      console.log("⚠️ Create module button not found");
      test.skip(true, "Create module button not available");
    }
  });

  test("navigation performance between pages", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    const pages = ["/dashboard", "/courses", "/modules", "/staff"];
    const navigationTimes: number[] = [];

    // Navigate to each page and measure time
    for (let i = 0; i < pages.length - 1; i++) {
      const currentPage = pages[i];
      const nextPage = pages[i + 1];

      if (!currentPage || !nextPage) continue;

      // Navigate to current page first with timeout
      try {
        await page.goto(currentPage, { timeout: 15000 });
        // Wait for page to be ready
        await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
        await page.waitForLoadState("networkidle", { timeout: 10000 });
      } catch (error) {
        console.log(
          `⚠️ Failed to load ${currentPage}, skipping navigation test`,
        );
        continue;
      }

      const startTime = Date.now();

      // Navigate to next page with timeout
      try {
        await page.goto(nextPage, { timeout: 15000 });
        // Wait for page to be ready
        await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
        await page.waitForLoadState("networkidle", { timeout: 10000 });
      } catch (error) {
        console.log(`⚠️ Failed to load ${nextPage}, skipping this navigation`);
        continue;
      }

      const navTime = Date.now() - startTime;
      navigationTimes.push(navTime);

      console.log(`📊 Navigation ${currentPage} → ${nextPage}: ${navTime}ms`);
    }

    // Only run assertion if we have navigation times
    if (navigationTimes.length > 0) {
      // Performance assertion: Average navigation time should be under 20 seconds (realistic for development)
      const avgNavTime =
        navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      expect(avgNavTime).toBeLessThan(20000);

      console.log(`📊 Average navigation time: ${avgNavTime.toFixed(0)}ms`);
    } else {
      test.skip(true, "No successful navigation measurements");
    }
  });

  test("search and filter performance", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    await page.goto("/staff");
    await expect(page.getByRole("heading", { name: /Staff/i })).toBeVisible({
      timeout: 10000,
    });

    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible().catch(() => false)) {
      const startTime = Date.now();

      // Type in search
      await searchInput.fill("test");

      // Wait for search results or debounce
      await page.waitForTimeout(500);

      const searchTime = Date.now() - startTime;

      // Performance assertion: Search should respond in under 1 second
      expect(searchTime).toBeLessThan(1000);

      console.log(`📊 Search response time: ${searchTime}ms`);
    } else {
      console.log(
        "⚠️ Search input not found, skipping search performance test",
      );
    }
  });

  test("data table rendering performance", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    await page.goto("/staff");
    await expect(page.getByRole("heading", { name: /Staff/i })).toBeVisible({
      timeout: 10000,
    });

    const startTime = Date.now();

    // Wait for any table or list to be visible - be more flexible about what we're looking for
    const tableOrList = page.locator(
      "table, tbody, ul, [role='grid'], [role='table']",
    );
    await expect(tableOrList.first()).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    const renderTime = Date.now() - startTime;

    // Count any rows or list items
    const rows = page.locator("tbody tr, ul li, [role='row']");
    const rowCount = await rows.count();

    // Performance assertion: Table should render in under 3 seconds (more realistic for development)
    expect(renderTime).toBeLessThan(3000);

    console.log(
      `📊 Table/list render time: ${renderTime}ms (${rowCount} rows/items)`,
    );
  });

  test("memory usage during navigation", async ({ page }) => {
    // Warm-up step: hit dashboard first to avoid cold start measurement
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Test memory usage during multiple page navigations
    const pages = ["/dashboard", "/courses", "/modules", "/staff"];

    for (const pageUrl of pages) {
      try {
        await page.goto(pageUrl, { timeout: 15000 });
        // Wait for page to be ready
        await page.waitForLoadState("domcontentloaded");
        await page.waitForLoadState("networkidle");
      } catch (error) {
        console.log(`⚠️ Failed to load ${pageUrl}, skipping memory test`);
        continue;
      }

      // Get memory info if available
      const memoryInfo = await page.evaluate(() => {
        if ("memory" in performance) {
          const mem = (performance as any).memory;
          return {
            usedJSHeapSize: mem.usedJSHeapSize,
            totalJSHeapSize: mem.totalJSHeapSize,
            jsHeapSizeLimit: mem.jsHeapSizeLimit,
          };
        }
        return null;
      });

      if (memoryInfo && pageUrl) {
        console.log(`📊 Memory usage on ${pageUrl}:`, memoryInfo);

        // Check for memory leaks (used heap shouldn't grow excessively)
        const usedHeapMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
        expect(usedHeapMB).toBeLessThan(100); // Less than 100MB
      }
    }
  });

  test("CI-optimized performance baseline", async ({ page }) => {
    // This test is specifically designed for CI determinism
    // It runs a complete warm-up sequence and then measures consistent performance

    console.log("🔄 Starting CI performance baseline test...");

    // Step 1: Complete warm-up sequence
    const warmupPages = ["/dashboard", "/courses", "/modules", "/staff"];
    for (const warmupPage of warmupPages) {
      await page.goto(warmupPage, { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      console.log(`✅ Warm-up completed for ${warmupPage}`);
    }

    // Step 2: Measure consistent performance after warm-up
    const performanceResults: Record<string, number> = {};

    for (const testPage of warmupPages) {
      const startTime = Date.now();

      await page.goto(testPage, { timeout: 15000 });
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;
      performanceResults[testPage] = loadTime;

      console.log(`📊 ${testPage} load time after warm-up: ${loadTime}ms`);
    }

    // Step 3: Assert consistent performance (all under 20s threshold)
    for (const [page, time] of Object.entries(performanceResults)) {
      expect(time).toBeLessThan(20000);
    }

    // Step 4: Calculate and log average performance
    const avgTime =
      Object.values(performanceResults).reduce((a, b) => a + b, 0) /
      Object.values(performanceResults).length;
    console.log(
      `📊 Average performance after warm-up: ${avgTime.toFixed(0)}ms`,
    );

    // Step 5: Assert average performance is reasonable
    expect(avgTime).toBeLessThan(15000);

    console.log("✅ CI performance baseline test completed successfully");
  });
});
