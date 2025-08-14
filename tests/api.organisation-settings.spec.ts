import { describe, it, expect } from "vitest";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

describe("api: organisation settings upsert", () => {
  it("is protected for unauthenticated callers", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/permissions/seed-planning`, {
      method: "POST",
    });
    expect([401, 403]).toContain(res.status);
  });
});
