import { describe, it, expect } from "vitest";
import {
  computeHoursFromCredits,
  computeTotals,
} from "@/../convex/allocationsMath";

describe("allocations math", () => {
  it("converts credits to hours with MVP heuristic", () => {
    expect(computeHoursFromCredits(0)).toBe(0);
    expect(computeHoursFromCredits(15)).toBe(15);
    expect(computeHoursFromCredits(undefined)).toBe(0);
  });

  it("sums computed hours when no overrides", () => {
    const totals = computeTotals([
      { type: "teaching", hoursComputed: 10 },
      { type: "teaching", hoursComputed: 5 },
      { type: "admin", hoursComputed: 2 },
    ]);
    expect(totals.allocatedTeaching).toBe(15);
    expect(totals.allocatedAdmin).toBe(2);
    expect(totals.allocatedTotal).toBe(17);
  });

  it("uses overrides when provided", () => {
    const totals = computeTotals([
      { type: "teaching", hoursComputed: 10, hoursOverride: 8 },
      { type: "admin", hoursComputed: 3, hoursOverride: 4 },
      { type: "teaching", hoursComputed: 1 },
    ]);
    expect(totals.allocatedTeaching).toBe(9);
    expect(totals.allocatedAdmin).toBe(4);
    expect(totals.allocatedTotal).toBe(13);
  });
});
