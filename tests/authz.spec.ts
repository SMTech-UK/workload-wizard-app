import { describe, it, expect, vi, beforeEach } from "vitest";

const ADMIN_ASSURED = process.env.E2E_ASSUME_ADMIN === "true";
if (!ADMIN_ASSURED) {
  // Skip the entire file when admin access isn't assured in CI
  describe.skip("authz guards", () => {
    it("skipped due to missing E2E_ASSUME_ADMIN", () => {
      expect(true).toBe(true);
    });
  });
}

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { requireSystemPermission, requireOrgPermission } from "@/lib/authz";

describe("authz guards", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("requireSystemPermission allows sysadmin/admin", async () => {
    (auth as any).mockResolvedValue({
      userId: "u1",
      sessionClaims: { role: "sysadmin", organisationId: "org1" },
    });
    (currentUser as any).mockResolvedValue({ publicMetadata: {} });
    await expect(requireSystemPermission("flags.manage")).resolves.toBe(true);

    (auth as any).mockResolvedValue({
      userId: "u2",
      sessionClaims: { role: "admin", organisationId: "org1" },
    });
    await expect(requireSystemPermission("flags.manage")).resolves.toBe(true);
  });

  it("requireSystemPermission denies normal user", async () => {
    (auth as any).mockResolvedValue({
      userId: "u3",
      sessionClaims: { role: "user", organisationId: "org1" },
    });
    (currentUser as any).mockResolvedValue({ publicMetadata: {} });
    await expect(requireSystemPermission("flags.manage")).rejects.toThrow(
      "Forbidden",
    );
  });

  it("requireOrgPermission allows sysadmin/admin and orgadmin with seeded permissions", async () => {
    // Orgadmin has users.view permission according to DEFAULT_ROLES
    (auth as any).mockResolvedValue({
      userId: "u4",
      sessionClaims: { role: "orgadmin", organisationId: "org1" },
    });
    (currentUser as any).mockResolvedValue({ publicMetadata: {} });
    await expect(requireOrgPermission("users.view")).resolves.toBe(true);

    // Test orgadmin without a specific permission
    await expect(
      requireOrgPermission("organisations.manage"),
    ).rejects.toThrow();

    (auth as any).mockResolvedValue({
      userId: "u5",
      sessionClaims: { role: "sysadmin", organisationId: "org1" },
    });
    (currentUser as any).mockResolvedValue({ publicMetadata: {} });
    await expect(requireOrgPermission("users.view")).resolves.toBe(true);
  });

  it("requireOrgPermission denies normal user", async () => {
    (auth as any).mockResolvedValue({
      userId: "u6",
      sessionClaims: { role: "user", organisationId: "org1" },
    });
    (currentUser as any).mockResolvedValue({ publicMetadata: {} });
    await expect(requireOrgPermission("users.view")).rejects.toThrow(
      "Forbidden",
    );
  });
});
