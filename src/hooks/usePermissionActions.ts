import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "./usePermissions";
import { useToast } from "./use-toast";
import { type PermissionId } from "@/lib/permissions";

interface UsePermissionActionsOptions {
  organisationId?: string;
  redirectOnDenied?: boolean;
  showToastOnDenied?: boolean;
}

export function usePermissionActions(
  options: UsePermissionActionsOptions = {},
) {
  const {
    organisationId,
    redirectOnDenied = true,
    showToastOnDenied = true,
  } = options;

  const permissions = usePermissions(organisationId);
  const router = useRouter();
  const { toast } = useToast();

  const executeWithPermission = useCallback(
    async <T>(
      permissionId: PermissionId,
      action: () => Promise<T> | T,
      options: {
        isSystemAction?: boolean;
        actionName?: string;
        onDenied?: () => void;
        onError?: (error: Error) => void;
      } = {},
    ): Promise<T | null> => {
      const {
        isSystemAction = false,
        actionName = "this action",
        onDenied,
        onError,
      } = options;

      try {
        // Check permission first
        const actionState = permissions.gateActionState(permissionId, {
          isSystemAction,
          actionName,
        });

        if (!actionState.canPerform) {
          // Handle permission denied
          if (showToastOnDenied) {
            toast({
              title: "Access Denied",
              description:
                actionState.errorMessage ||
                `You don't have permission to perform ${actionName}`,
              variant: "destructive",
            });
          }

          if (onDenied) {
            onDenied();
          }

          // Redirect to unauthorized page if enabled
          if (redirectOnDenied) {
            router.push("/unauthorised");
          }

          return null;
        }

        // Execute action if permission granted
        return await action();
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error(String(error));

        if (onError) {
          onError(errorObj);
        } else {
          // Default error handling
          toast({
            title: "Error",
            description: errorObj.message || "An unexpected error occurred",
            variant: "destructive",
          });
        }

        return null;
      }
    },
    [
      permissions,
      router,
      toast,
      organisationId,
      redirectOnDenied,
      showToastOnDenied,
    ],
  );

  const checkPermission = useCallback(
    (permissionId: PermissionId, isSystemAction = false): boolean => {
      return permissions.hasPermission(permissionId, isSystemAction);
    },
    [permissions],
  );

  const getActionState = useCallback(
    (
      permissionId: PermissionId,
      options: {
        isSystemAction?: boolean;
        actionName?: string;
      } = {},
    ) => {
      return permissions.gateActionState(permissionId, options);
    },
    [permissions],
  );

  return {
    executeWithPermission,
    checkPermission,
    getActionState,
    permissions,
  };
}

// Convenience functions for common actions
export function useUserActions(options: UsePermissionActionsOptions = {}) {
  const { executeWithPermission, checkPermission, getActionState } =
    usePermissionActions(options);

  return {
    createUser: (action: () => Promise<any> | any, actionOptions = {}) =>
      executeWithPermission("users.create", action, {
        actionName: "create users",
        ...actionOptions,
      }),

    editUser: (action: () => Promise<any> | any, actionOptions = {}) =>
      executeWithPermission("users.edit", action, {
        actionName: "edit users",
        ...actionOptions,
      }),

    deleteUser: (action: () => Promise<any> | any, actionOptions = {}) =>
      executeWithPermission("users.delete", action, {
        actionName: "delete users",
        ...actionOptions,
      }),

    viewUsers: () => checkPermission("users.view"),
    canCreateUsers: () => checkPermission("users.create"),
    canEditUsers: () => checkPermission("users.edit"),
    canDeleteUsers: () => checkPermission("users.delete"),

    getUserActionState: (action: "create" | "edit" | "delete") => {
      const permissionMap = {
        create: "users.create",
        edit: "users.edit",
        delete: "users.delete",
      } as const;

      return getActionState(permissionMap[action], {
        actionName: `${action} users`,
      });
    },
  };
}

export function useAdminActions(options: UsePermissionActionsOptions = {}) {
  const { executeWithPermission, checkPermission, getActionState } =
    usePermissionActions(options);

  return {
    managePermissions: (action: () => Promise<any> | any, actionOptions = {}) =>
      executeWithPermission("permissions.manage", action, {
        actionName: "manage permissions",
        ...actionOptions,
      }),

    manageFlags: (action: () => Promise<any> | any, actionOptions = {}) =>
      executeWithPermission("flags.manage", action, {
        actionName: "manage feature flags",
        ...actionOptions,
      }),

    canManagePermissions: () => checkPermission("permissions.manage"),
    canManageFlags: () => checkPermission("flags.manage"),

    getAdminActionState: (action: "permissions" | "flags") => {
      const permissionMap = {
        permissions: "permissions.manage",
        flags: "flags.manage",
      } as const;

      return getActionState(permissionMap[action], {
        actionName: `manage ${action}`,
      });
    },
  };
}
