import { useCallback } from "react";
import { usePermissions } from "./usePermissions";
import { useToast } from "./use-toast";
import {
  createPermissionManager,
  type PermissionId,
  type UIGateOptions,
  type UIGateResult,
} from "@/lib/permissions";

export function usePermissionManager(organisationId?: string) {
  const permissions = usePermissions(organisationId);
  const { toast } = useToast();

  // Create toast handler for permission manager
  const toastHandler = useCallback(
    (message: string, variant: "error" | "warning" | "info") => {
      switch (variant) {
        case "error":
          toast.error("Access Denied", message);
          break;
        case "warning":
          toast.warning("Permission Warning", message);
          break;
        case "info":
          toast.info("Permission Info", message);
          break;
      }
    },
    [toast],
  );

  // Create permission manager instance
  const manager = createPermissionManager(
    permissions.userRole,
    organisationId,
    toastHandler,
  );

  // Enhanced gating functions with automatic toast and redirect handling
  const gateElement = useCallback(
    (permissionId: PermissionId, options: UIGateOptions = {}): UIGateResult => {
      return manager.gateElement(permissionId, options);
    },
    [manager],
  );

  const gateButton = useCallback(
    (permissionId: PermissionId, options: UIGateOptions = {}) => {
      return manager.gateButton(permissionId, options);
    },
    [manager],
  );

  const gateAction = useCallback(
    (permissionId: PermissionId, options: UIGateOptions = {}) => {
      return manager.gateAction(permissionId, options);
    },
    [manager],
  );

  const gateField = useCallback(
    (permissionId: PermissionId, options: UIGateOptions = {}) => {
      return manager.gateField(permissionId, options);
    },
    [manager],
  );

  const gateRow = useCallback(
    (permissionId: PermissionId, options: UIGateOptions = {}) => {
      return manager.gateRow(permissionId, options);
    },
    [manager],
  );

  // Action execution with permission checking
  const executeWithPermission = useCallback(
    (
      permissionId: PermissionId,
      action: () => void | Promise<void>,
      actionName: string,
      options: UIGateOptions = {},
    ) => {
      if (manager.canPerformAction(permissionId, actionName, options)) {
        return action();
      }
      return false;
    },
    [manager],
  );

  // Check if user can perform action (for conditional rendering)
  const canPerform = useCallback(
    (permissionId: PermissionId, options: UIGateOptions = {}): boolean => {
      return manager.gateElement(permissionId, options).hasAccess;
    },
    [manager],
  );

  // Check if user should see element (for conditional rendering)
  const shouldShow = useCallback(
    (permissionId: PermissionId, options: UIGateOptions = {}): boolean => {
      const result = manager.gateElement(permissionId, options);
      return result.hasAccess && !result.shouldHide;
    },
    [manager],
  );

  // Get permission context for debugging
  const getContext = useCallback(
    (permissionId: PermissionId) => {
      return manager.getContext(permissionId);
    },
    [manager],
  );

  return {
    // Core permission manager
    manager,

    // Enhanced gating functions
    gateElement,
    gateButton,
    gateAction,
    gateField,
    gateRow,

    // Action execution
    executeWithPermission,

    // Conditional rendering helpers
    canPerform,
    shouldShow,

    // Context and debugging
    getContext,

    // Direct access to manager methods
    canPerformAction: manager.canPerformAction.bind(manager),
    hasAnyAdminAccess: manager.hasAnyAdminAccess.bind(manager),
    isSystemAdmin: manager.isSystemAdmin.bind(manager),
    isOrgAdmin: manager.isOrgAdmin.bind(manager),

    // Current user info
    userRole: permissions.userRole,
    organisationId,
  };
}
