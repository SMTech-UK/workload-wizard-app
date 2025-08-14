import { test, expect } from "./fixtures";

test.describe("Basic Smoke Test", () => {
  test("basic test infrastructure works", async ({ page }) => {
    // This test just verifies the test infrastructure is working
    expect(true).toBe(true);
    expect(page).toBeDefined();
  });

  test("can access test utilities", async () => {
    // Test that we can use test utilities
    const testValue = "test";
    expect(testValue).toBe("test");
  });
});
