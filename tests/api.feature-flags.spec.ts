import { describe, it, expect } from "vitest";

// Simple API integration tests for feature flags toggle route
// Assumes dev server is running and auth middleware permits test user via storage/cookies in e2e

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

describe("api: feature flags", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/flags/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "pink-mode", enabled: true }),
    });
    // In CI this may return 401; accept 401 or 403 depending on middleware
    expect([401, 403]).toContain(res.status);
  });
});
