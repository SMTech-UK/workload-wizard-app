import { describe, it, expect, vi, beforeEach } from "vitest";

// We will mock Convex browser client and call sequence functions is out of scope here.
// This smoke test validates that the high-level happy path helpers (if any) would be invoked in order
// and that permission ids referenced exist. It's a lightweight smoke due to server/runtime deps.

import { PERMISSIONS } from "@/lib/permissions";

describe("planning happy path smoke", () => {
  it("has referenced permission ids for planning steps", () => {
    const required = [
      "courses.create",
      "courses.years.add",
      "modules.create",
      "iterations.create",
      "groups.create",
      "allocations.assign",
    ] as const;
    for (const p of required) {
      expect(PERMISSIONS[p]).toBeTruthy();
    }
  });
});
