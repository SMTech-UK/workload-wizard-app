import { describe, it, expect } from "vitest";
import { computeHoursFromCredits } from "@/../convex/allocationsMath";

// Lightweight sanity: allocations math is deterministic regardless of org/year scoping
// The proper scoping is enforced in Convex functions, which are E2E tested elsewhere.

describe("convex: allocations math deterministic", () => {
  it("credits to hours behaves consistently", () => {
    expect(computeHoursFromCredits(10)).toBe(10);
    expect(computeHoursFromCredits(20)).toBe(20);
    expect(computeHoursFromCredits(undefined as any)).toBe(0);
  });
});
