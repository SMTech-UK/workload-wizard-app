import { test, expect } from "./fixtures";

test.describe("Authentication Debug", () => {
  test("check login form elements", async ({ page }) => {
    await page.goto("/sign-in");

    // Wait for page to load and take a screenshot first
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/login-page-debug.png" });

    // Log the page content to see what's actually there
    const pageContent = await page.content();
    console.log("Page HTML:", pageContent.substring(0, 1000));

    // Check what headings are actually on the page
    const headings = page.locator("h1, h2, h3, h4, h5, h6");
    const headingCount = await headings.count();
    console.log(`Found ${headingCount} headings on the page`);

    for (let i = 0; i < headingCount; i++) {
      const headingText = await headings.nth(i).textContent();
      console.log(`Heading ${i + 1}: ${headingText}`);
    }

    // Try to find any form elements
    const inputs = page.locator("input");
    const inputCount = await inputs.count();
    console.log(`Found ${inputCount} input elements on the page`);

    // Check if we can find the form by looking for any input with email/username label
    const emailInput = page.getByLabel(/email|username/i);
    const passwordInput = page.getByLabel(/password/i);

    if (await emailInput.isVisible().catch(() => false)) {
      console.log("✅ Email/username input found");
    } else {
      console.log("❌ Email/username input not found");
    }

    if (await passwordInput.isVisible().catch(() => false)) {
      console.log("✅ Password input found");
    } else {
      console.log("❌ Password input not found");
    }

    // Check current URL
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
  });

  test("check form submission without navigation", async ({ page }) => {
    await page.goto("/sign-in");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Take screenshot
    await page.screenshot({ path: "test-results/before-signin-debug.png" });

    // Try to find any form elements more flexibly
    const emailInput = page.getByLabel(/email|username/i);
    const passwordInput = page.getByLabel(/password/i);
    const signInButton = page.getByRole("button", { name: /sign.?in/i });

    // Check if elements are visible
    const emailVisible = await emailInput.isVisible().catch(() => false);
    const passwordVisible = await passwordInput.isVisible().catch(() => false);
    const buttonVisible = await signInButton.isVisible().catch(() => false);

    console.log(`Email input visible: ${emailVisible}`);
    console.log(`Password input visible: ${passwordVisible}`);
    console.log(`Sign in button visible: ${buttonVisible}`);

    if (emailVisible && passwordVisible && buttonVisible) {
      // Fill form with test credentials
      await emailInput.fill("test@example.com");
      await passwordInput.fill("testpassword");

      console.log("✅ Form can be filled");

      // Click sign in button
      await signInButton.click();

      // Wait a bit to see what happens
      await page.waitForTimeout(3000);

      // Check if there's an error message
      const errorElement = page.locator(
        "[class*='text-red-600'], [class*='error'], .error",
      );
      if (await errorElement.isVisible().catch(() => false)) {
        const errorText = await errorElement.textContent();
        console.log(`Error message: ${errorText}`);
      }

      // Check current URL
      const currentUrl = page.url();
      console.log(`URL after sign in attempt: ${currentUrl}`);

      // Take screenshot
      await page.screenshot({ path: "test-results/after-signin-debug.png" });
    } else {
      console.log("❌ Form elements not found, cannot test submission");
    }
  });
});
