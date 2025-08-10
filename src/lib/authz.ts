import { auth, currentUser } from "@clerk/nextjs/server";
import { hasPermission, type PermissionId } from "./permissions";
import { redirect } from "next/navigation";

export type SessionUser = {
  userId: string;
  organisationId: string;
  role: string;
};

function extractFromUnknown<T>(value: unknown, key: string): T | undefined {
  if (
    value &&
    typeof value === "object" &&
    key in (value as Record<string, unknown>)
  ) {
    return (value as Record<string, unknown>)[key] as T;
  }
  return undefined;
}

export async function getSessionUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthenticated");
  const user = await currentUser();

  const organisationId =
    extractFromUnknown<string>(
      session.sessionClaims as unknown,
      "organisationId",
    ) ||
    extractFromUnknown<string>(
      user?.publicMetadata as unknown,
      "organisationId",
    );

  const role =
    extractFromUnknown<string>(session.sessionClaims as unknown, "role") ||
    extractFromUnknown<string>(user?.publicMetadata as unknown, "role") ||
    "user";

  if (!organisationId) throw new Error("Missing organisationId");
  return { userId: session.userId, organisationId, role };
}

export async function getOrganisationIdFromSession(): Promise<string> {
  return (await getSessionUser()).organisationId;
}

export async function requireSystemPermission(permissionId: PermissionId) {
  const { role } = await getSessionUser();
  if (!hasPermission(role, permissionId, undefined, true)) {
    const error = new Error("Forbidden");
    (error as any).statusCode = 403;
    throw error;
  }
  return true as const;
}

export async function requireOrgPermission(
  permissionId: PermissionId,
  organisationId?: string,
) {
  const { role, organisationId: userOrgId } = await getSessionUser();
  const targetOrgId = organisationId || userOrgId;

  if (!hasPermission(role, permissionId, targetOrgId, false)) {
    const error = new Error("Forbidden");
    (error as any).statusCode = 403;
    throw error;
  }
  return true as const;
}

// Helper to check if user has permission without throwing
export async function checkPermission(
  permissionId: PermissionId,
  organisationId?: string,
  isSystemAction = false,
): Promise<boolean> {
  try {
    const { role, organisationId: userOrgId } = await getSessionUser();
    const targetOrgId = organisationId || userOrgId;
    return hasPermission(role, permissionId, targetOrgId, isSystemAction);
  } catch {
    return false;
  }
}

// Enhanced permission checking with automatic redirects
export async function requirePermissionWithRedirect(
  permissionId: PermissionId,
  options: {
    organisationId?: string;
    isSystemAction?: boolean;
    redirectTo?: string;
  } = {},
) {
  const {
    organisationId,
    isSystemAction = false,
    redirectTo = "/unauthorised",
  } = options;

  try {
    if (isSystemAction) {
      return await requireSystemPermission(permissionId);
    } else {
      return await requireOrgPermission(permissionId, organisationId);
    }
  } catch (error) {
    // If it's a 403 error, redirect to unauthorized page
    if ((error as any).statusCode === 403) {
      redirect(redirectTo);
    }
    // Re-throw other errors
    throw error;
  }
}

// Client-side permission checking utility
export function createClientPermissionChecker(
  userRole: string | undefined,
  organisationId?: string,
) {
  return {
    hasPermission: (permissionId: PermissionId, isSystemAction = false) =>
      hasPermission(userRole, permissionId, organisationId, isSystemAction),

    requirePermission: (permissionId: PermissionId, isSystemAction = false) => {
      if (
        !hasPermission(userRole, permissionId, organisationId, isSystemAction)
      ) {
        throw new Error("Insufficient permissions");
      }
      return true;
    },
  };
}
