import {
  test as base,
  expect as pwExpect,
  request as pwRequest,
} from "@playwright/test";

// Worker-scoped auto fixture to reset and seed demo data before tests run.
// Requires authenticated storage state produced by tests/e2e/auth.setup.ts
export const test = base.extend<{ seedDemoData: void }>({
  seedDemoData: [
    async ({}, use) => {
      const assumeAdmin = process.env.E2E_ASSUME_ADMIN === "true";
      const baseURL =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      if (!assumeAdmin) {
        await use();
        return;
      }
      try {
        const ctx = await pwRequest.newContext({
          baseURL,
          storageState: "tests/e2e/.auth/admin.json",
          timeout: 60000, // Increase timeout to 60 seconds
        });
        // Force Admin role for deterministic admin-gated tests
        await ctx.post("/api/admin/dev-tools/switch-role", {
          data: { role: "Admin" },
          timeout: 60000, // Increase timeout to 60 seconds
        });
        // Reset then seed demo data; ignore failures to keep tests running in non-dev envs
        await ctx.post("/api/admin/dev-tools/reset", { timeout: 60000 });
        await ctx.post("/api/admin/dev-tools/seed", { timeout: 60000 });
        await ctx.dispose();
      } catch (err) {
        // Best-effort: log and continue

        console.warn("seedDemoData fixture failed:", err);
      }
      await use();
    },
    { scope: "test", auto: true },
  ],
});

export const expect = pwExpect;
