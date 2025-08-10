import { describe, it, expect } from "vitest";
import { hasPermission } from "@/lib/permissions";

describe("permissions: orgadmin granular (no bypass)", () => {
  it("orgadmin must have seeded perms for org-scoped permissions", () => {
    // With granular model, orgadmin shouldn't bypass delete unless seeded
    expect(hasPermission("orgadmin", "users.delete", "org1")).toBe(false);
    expect(hasPermission("orgadmin", "users.view", "org1")).toBe(true);
  });

  it("orgadmin does not get system-scoped permissions without system role", () => {
    expect(
      hasPermission("orgadmin", "organisations.manage", undefined, true),
    ).toBe(false);
  });

  it("lecturer only has granular ones explicitly allowed", () => {
    expect(hasPermission("lecturer", "users.view", "org1")).toBe(true);
    expect(hasPermission("lecturer", "users.create", "org1")).toBe(false);
  });
});
