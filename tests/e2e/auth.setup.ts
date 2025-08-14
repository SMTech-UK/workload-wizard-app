import { chromium } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// This script sets up authentication for E2E tests
// Run this manually when you need to refresh authentication tokens

async function setupAuth() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const email = process.env.CLERK_TEST_USER_EMAIL;
  const password = process.env.CLERK_TEST_USER_PASSWORD;

  if (!email || !password) {
    console.error(
      "CLERK_TEST_USER_EMAIL and CLERK_TEST_USER_PASSWORD must be set",
    );
    process.exit(1);
  }

  try {
    // Use the app's custom login form instead of Clerk widget
    await page.goto("http://localhost:3000/sign-in?redirect_url=%2Fdashboard");

    // Wait for sign-in page to load
    await page.waitForSelector('input[type="email"], input[type="text"]', {
      timeout: 10000,
    });

    await page.getByLabel("Email or Username").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /^Sign In$/ }).click();

    // Wait for successful login
    try {
      await page.waitForURL((url) => !/\/sign-in/.test(url.href), {
        timeout: 8000,
        waitUntil: "load",
      });

      console.log("✅ Authentication successful");

      // Persist session for dependent tests
      await context.storageState({ path: "tests/e2e/.auth/admin.json" });
      console.log(
        "✅ Authentication state saved to tests/e2e/.auth/admin.json",
      );
    } catch (error) {
      console.error("❌ Authentication failed or timed out");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupAuth().catch(console.error);
}

export { setupAuth };
