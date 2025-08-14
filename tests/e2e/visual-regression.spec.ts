import { test, expect } from "./fixtures";
import * as path from "path";

const ADMIN_ASSURED = process.env.E2E_ASSUME_ADMIN === "true";
test.skip(
  !ADMIN_ASSURED,
  "Skipping visual regression tests without admin assurance (set E2E_ASSUME_ADMIN=true)",
);

test.describe("Visual Regression Testing", () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });

    // Disable animations and transitions using external CSS file
    const cssPath = path.join(__dirname, "visual-regression.css");
    await page.addStyleTag({ path: cssPath });

    // Set timezone to UTC for consistent date/time rendering
    await page.addInitScript(() => {
      // Override Date.now() to return a fixed timestamp
      const fixedTime = new Date("2024-01-15T12:00:00.000Z").getTime();
      (Date as any).now = () => fixedTime;

      // Override Math.random() to return consistent values
      let randomCounter = 0;
      const randomValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
      (Math as any).random = () => {
        const value = randomValues[randomCounter % randomValues.length];
        randomCounter++;
        return value;
      };
    });

    // Ensure we're in light mode for consistent testing
    await page.goto("/");
    const themeToggle = page.getByTestId("theme-toggle");
    if (await themeToggle.isVisible().catch(() => false)) {
      const currentTheme = await themeToggle.getAttribute("data-theme");
      if (currentTheme === "dark") {
        await themeToggle.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test("dashboard layout visual consistency", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for page to load completely - look for "Coming Soon" heading (dashboard placeholder)
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");

    // Wait for any remaining animations to complete
    await page.waitForTimeout(1000);

    // Take screenshot of the full dashboard
    await expect(page).toHaveScreenshot("dashboard-layout.png", {
      fullPage: true,
      timeout: 20000,
    });

    // Take screenshot of just the main content area
    const mainContent = page.locator("main");
    if (await mainContent.isVisible().catch(() => false)) {
      await expect(mainContent).toHaveScreenshot("dashboard-main-content.png", {
        timeout: 20000,
      });
    }
  });

  test("sidebar navigation visual consistency", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for sidebar to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot of the sidebar
    const sidebar = page.locator("nav");
    if (await sidebar.isVisible().catch(() => false)) {
      await expect(sidebar).toHaveScreenshot("sidebar-navigation.png", {
        timeout: 20000,
      });
    }
  });

  test("courses page visual consistency", async ({ page }) => {
    await page.goto("/courses");

    // Wait for page to load completely
    await expect(page.getByRole("heading", { name: /Courses/i })).toBeVisible({
      timeout: 10000,
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot of the full courses page
    await expect(page).toHaveScreenshot("courses-page.png", {
      fullPage: true,
      timeout: 20000,
    });

    // Take screenshot of the courses list
    const coursesList = page.locator("main");
    if (await coursesList.isVisible().catch(() => false)) {
      await expect(coursesList).toHaveScreenshot("courses-list.png", {
        timeout: 20000,
      });
    }
  });

  test("modules page visual consistency", async ({ page }) => {
    await page.goto("/modules");

    // Wait for page to load completely
    await expect(page.getByRole("heading", { name: /Modules/i })).toBeVisible({
      timeout: 10000,
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot of the full modules page
    await expect(page).toHaveScreenshot("modules-page.png", {
      fullPage: true,
      timeout: 20000,
    });
  });

  test("staff capacity page visual consistency", async ({ page }) => {
    await page.goto("/staff");

    // Wait for page to load completely
    await expect(page.getByTestId("staff-list")).toBeVisible({
      timeout: 10000,
    });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot of the full staff page
    await expect(page).toHaveScreenshot("staff-capacity-page.png", {
      fullPage: true,
      timeout: 20000,
    });

    // Take screenshot of the staff list
    const staffList = page.getByTestId("staff-list");
    if (await staffList.isVisible().catch(() => false)) {
      await expect(staffList).toHaveScreenshot("staff-list.png", {
        timeout: 20000,
      });
    }
  });

  test("academic years page visual consistency", async ({ page }) => {
    await page.goto("/admin/academic-years");

    // Wait for page to load completely
    await expect(
      page.getByRole("heading", { name: /Academic Years/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Take screenshot of the full academic years page
    await expect(page).toHaveScreenshot("academic-years-page.png", {
      fullPage: true,
      timeout: 20000,
    });
  });

  test("form components visual consistency", async ({ page }) => {
    await page.goto("/courses");

    // Wait for page to load
    await expect(page.getByRole("heading", { name: /Courses/i })).toBeVisible({
      timeout: 10000,
    });

    // Look for form elements to test component consistency
    const codeInput = page.getByLabel("Code");
    if (await codeInput.isVisible().catch(() => false)) {
      // Take screenshot of form inputs
      const formSection = page.locator("main").first();
      await expect(formSection).toHaveScreenshot("form-components.png", {
        timeout: 20000,
      });
    } else {
      console.log("⚠️ Form inputs not found, skipping form visual test");
    }
  });

  test("table components visual consistency", async ({ page }) => {
    await page.goto("/staff");

    // Wait for page to load
    await expect(page.getByTestId("staff-list")).toBeVisible({
      timeout: 10000,
    });
    await page.waitForTimeout(1000);

    // Take screenshot of table structure
    const tableSection = page.locator("main");
    if (await tableSection.isVisible().catch(() => false)) {
      await expect(tableSection).toHaveScreenshot("table-components.png", {
        timeout: 20000,
      });
    }
  });

  test("button components visual consistency", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for page to load - look for "Coming Soon" heading (dashboard placeholder)
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for buttons to test component consistency
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Take screenshot of button area
      const buttonArea = page.locator("main");
      if (await buttonArea.isVisible().catch(() => false)) {
        await expect(buttonArea).toHaveScreenshot("button-components.png", {
          timeout: 20000,
        });
      }
    } else {
      console.log("⚠️ No buttons found, skipping button visual test");
    }
  });

  test("card components visual consistency", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for page to load - look for "Coming Soon" heading (dashboard placeholder)
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Look for card components
    const cards = page.locator("[data-testid*='card'], .card, [class*='card']");
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Take screenshot of cards
      const cardArea = page.locator("main");
      if (await cardArea.isVisible().catch(() => false)) {
        await expect(cardArea).toHaveScreenshot("card-components.png", {
          timeout: 20000,
        });
      }
    } else {
      console.log("⚠️ No cards found, skipping card visual test");
    }
  });

  test("responsive design visual consistency", async ({ page }) => {
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("dashboard-tablet.png", {
      fullPage: true,
      timeout: 20000,
    });

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot("dashboard-mobile.png", {
      fullPage: true,
      timeout: 20000,
    });
  });

  test("light theme visual consistency", async ({ page }) => {
    await page.goto("/dashboard");

    // Wait for page to load - look for "Coming Soon" heading (dashboard placeholder)
    await expect(
      page.getByRole("heading", { name: /Coming Soon/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Ensure we're in light mode and take screenshot
    const themeToggle = page.getByTestId("theme-toggle");
    if (await themeToggle.isVisible().catch(() => false)) {
      const currentTheme = await themeToggle.getAttribute("data-theme");
      if (currentTheme === "dark") {
        await themeToggle.click();
        await page.waitForTimeout(1000);
      }

      // Take screenshot in light mode
      await expect(page).toHaveScreenshot("dashboard-light-theme.png", {
        fullPage: true,
        timeout: 20000,
      });
    } else {
      // Take screenshot anyway if no theme toggle
      await expect(page).toHaveScreenshot("dashboard-light-theme.png", {
        fullPage: true,
        timeout: 20000,
      });
    }
  });
});
