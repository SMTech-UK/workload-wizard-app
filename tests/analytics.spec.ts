import { describe, it, expect } from "vitest";
import { analytics } from "@/lib/analytics";

describe("analytics service", () => {
  it("should be initialized", () => {
    expect(analytics).toBeDefined();
    expect(typeof analytics.track).toBe("function");
  });
});
