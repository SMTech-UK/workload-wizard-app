import { handlePermissionError } from "@/lib/permission-errors";
import { type PermissionId } from "@/lib/permissions";
import { requireOrgPermission, requireSystemPermission } from "@/lib/authz";

// Wrapper for server actions that require organization permissions
export async function withOrgPermission<T>(
  action: () => Promise<T>,
  permissionId: PermissionId,
  organisationId?: string,
): Promise<T> {
  try {
    await requireOrgPermission(permissionId, organisationId);
    return await action();
  } catch (error) {
    handlePermissionError(error as Error);
  }
}

// Wrapper for server actions that require system permissions
export async function withSystemPermission<T>(
  action: () => Promise<T>,
  permissionId: PermissionId,
): Promise<T> {
  try {
    await requireSystemPermission(permissionId);
    return await action();
  } catch (error) {
    handlePermissionError(error as Error);
  }
}

// Higher-order function that creates permission-checked actions
export function createPermissionAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  permissionId: PermissionId,
  isSystemAction = false,
) {
  return async (...args: T): Promise<R> => {
    try {
      if (isSystemAction) {
        await requireSystemPermission(permissionId);
      } else {
        await requireOrgPermission(permissionId);
      }
      return await action(...args);
    } catch (error) {
      handlePermissionError(error as Error);
    }
  };
}
