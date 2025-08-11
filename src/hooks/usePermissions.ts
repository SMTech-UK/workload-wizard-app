import { useUser } from "@clerk/nextjs";
import { useMemo } from "react";
import {
  hasPermission,
  canViewUsers,
  canCreateUsers,
  canEditUsers,
  canDeleteUsers,
  canManagePermissions,
  canManageFlags,
  gateUIState,
  gateButtonState,
  gateActionState,
  type PermissionId,
} from "@/lib/permissions";

export function usePermissions(organisationId?: string) {
  const { user } = useUser();

  // Derive an effective role from publicMetadata.role or roles[] (prefer strongest)
  const userRole = useMemo(() => {
    const single = user?.publicMetadata?.role as string | undefined;
    const many = (user?.publicMetadata?.roles as string[] | undefined) || [];
    if (single && typeof single === "string" && single.length > 0)
      return single;
    // Prioritise high-privilege roles if present (include dev/developer aliases)
    const priority = [
      "systemadmin",
      "sysadmin",
      "admin",
      "developer",
      "dev",
      "orgadmin",
      "lecturer",
      "user",
    ];
    const found = priority.find((r) => many.includes(r));
    return found || undefined;
  }, [user?.publicMetadata?.role, user?.publicMetadata?.roles]);

  const permissions = useMemo(
    () => ({
      // Generic permission checker
      hasPermission: (permissionId: PermissionId, isSystemAction = false) =>
        hasPermission(userRole, permissionId, organisationId, isSystemAction),

      // Specific permission checks
      canViewUsers: () => canViewUsers(userRole, organisationId),
      canCreateUsers: () => canCreateUsers(userRole, organisationId),
      canEditUsers: () => canEditUsers(userRole, organisationId),
      canDeleteUsers: () => canDeleteUsers(userRole, organisationId),
      canManagePermissions: () =>
        canManagePermissions(userRole, organisationId),
      canManageFlags: () => canManageFlags(userRole, organisationId),

      // Role checks
      isSystemAdmin: () =>
        userRole === "systemadmin" ||
        userRole === "sysadmin" ||
        userRole === "admin",
      isOrgAdmin: () => userRole === "orgadmin",
      isLecturer: () => userRole === "lecturer",

      // Centralized gating utilities
      gateUIState: (
        permissionId: PermissionId,
        options?: {
          isSystemAction?: boolean;
          fallbackValue?: any;
          hideForbidden?: boolean;
        },
      ) => gateUIState(userRole, permissionId, { organisationId, ...options }),

      gateButtonState: (
        permissionId: PermissionId,
        options?: {
          isSystemAction?: boolean;
          disabledText?: string;
        },
      ) =>
        gateButtonState(userRole, permissionId, { organisationId, ...options }),

      gateActionState: (
        permissionId: PermissionId,
        options?: {
          isSystemAction?: boolean;
          actionName?: string;
        },
      ) =>
        gateActionState(userRole, permissionId, { organisationId, ...options }),

      // Current user info
      userRole,
      organisationId,
    }),
    [userRole, organisationId],
  );

  return permissions;
}
