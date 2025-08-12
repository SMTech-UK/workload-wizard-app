import type { PlaywrightTestConfig } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
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
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "e2e",
      dependencies: ["setup"],
      testMatch: /.*\.spec\.ts/,
      use: {
        storageState: "tests/e2e/.auth/admin.json",
      },
    },
  ],
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  reporter: [["list"]],
};

export default config;
