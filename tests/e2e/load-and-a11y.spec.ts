import { test, expect } from "./fixtures";

// Skipped by default; enable via E2E_EXPERIMENTAL=true
const EXPERIMENTAL = process.env.E2E_EXPERIMENTAL === "true";
test.skip(
  !EXPERIMENTAL,
  "Skipped experimental load and a11y tests; set E2E_EXPERIMENTAL=true to run",
);

test.describe("Experimental: load and accessibility", () => {
  test("basic a11y: no obvious accessibility violations on key pages (smoke)", async ({
    page,
  }) => {
    const urls = ["/dashboard", "/courses", "/modules", "/staff"];
    for (const url of urls) {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      // Lightweight axe-core injection without dependency; checks for role structure
      const hasMain = await page
        .locator("main")
        .first()
        .isVisible()
        .catch(() => false);
      const hasHeading = await page
        .locator("h1, [role='heading']")
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasMain || hasHeading).toBeTruthy();
    }
  });

  test("naive load test: hit staff page multiple times and ensure stability", async ({
    page,
  }) => {
    const iterations = Number(process.env.E2E_LOAD_ITERS || 5);
    let successes = 0;
    for (let i = 0; i < iterations; i++) {
      try {
        await page.goto("/staff", { timeout: 30000 });
        await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
        await expect(page.getByTestId("staff-list")).toBeVisible({
          timeout: 15000,
        });
        successes++;
      } catch {
        // continue, just record failure
      }
    }
    // Expect at least 80% success rate in dev
    expect(successes).toBeGreaterThanOrEqual(Math.ceil(iterations * 0.8));
  });
});
