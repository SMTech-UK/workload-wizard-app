import type { PlaywrightTestConfig } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local if present so tests can read credentials like CLERK_TEST_USER_EMAIL
const envLocalPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

const config: PlaywrightTestConfig = {
  testDir: "./tests/e2e",
  timeout: 60_000,
  // Run the auth setup first; tests can opt into storageState
  projects: [
    { name: "setup", testMatch: /auth\.setup\.test\.ts/ },
    {
      name: "smoke",
      dependencies: ["setup"],
      testMatch: /.*\.(smoke|smoke-e2e)\.spec\.ts/,
      use: { storageState: "tests/e2e/.auth/admin.json" },
    },
    {
      name: "integration",
      dependencies: ["setup"],
      testMatch: /.*\.(api|convex|integration)\.spec\.ts/,
      use: { storageState: "tests/e2e/.auth/admin.json" },
    },
    {
      name: "e2e",
      dependencies: ["setup"],
      testMatch: /.*\.spec\.ts/,
      use: { storageState: "tests/e2e/.auth/admin.json" },
    },
    {
      name: "performance",
      dependencies: ["setup"],
      testMatch: /.*performance\.spec\.ts/,
      use: {
        storageState: "tests/e2e/.auth/admin.json",
        // CI-specific optimizations for performance tests
        contextOptions: {
          // Ensure consistent performance testing environment
          locale: "en-GB",
          timezoneId: "UTC",
        },
      },
      // Performance test specific settings
      timeout: process.env.CI ? 120000 : 60000, // 2 minutes in CI, 1 minute locally
    },
    {
      name: "visual-regression",
      dependencies: ["setup"],
      testMatch: /.*visual-regression\.spec\.ts/,
      use: {
        storageState: "tests/e2e/.auth/admin.json",
        // Disable animations and transitions for consistent screenshots
        contextOptions: {
          // Set timezone to UTC for consistent date/time rendering
          locale: "en-GB",
          timezoneId: "UTC",
        },
      },
    },
  ],
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  // Enable visual comparison testing with stricter settings for stability
  expect: {
    toHaveScreenshot: {
      // Lower threshold for more precise visual comparison (0.05 = 5% tolerance)
      threshold: 0.05,
      // Maximum number of pixels that can differ
      maxDiffPixels: 50,
    },
  },
  // Configure screenshot output - separate from HTML reporter
  outputDir: "test-results/",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
  ],
  // Retry failed tests once
  retries: process.env.CI ? 1 : 0,
  // Workers configuration
  workers: process.env.CI ? 1 : 4,
  // Global timeout for all tests
  globalTimeout: 600000, // 10 minutes
};

export default config;
