import { useMemo } from "react";
import { usePermissions } from "./usePermissions";
import {
  createPermissionGating,
  type PermissionGatingUtil,
} from "@/lib/permission-gating";
import { type PermissionId } from "@/lib/permissions";

/**
 * Hook that provides centralized permission gating for org vs system roles
 * Consolidates permission checking logic in one place
 */
export function usePermissionGating(organisationId?: string) {
  const permissions = usePermissions(organisationId);

  const gatingUtil = useMemo<PermissionGatingUtil>(() => {
    return createPermissionGating(permissions.userRole, organisationId);
  }, [permissions.userRole, organisationId]);

  const gateElement = useMemo(() => {
    return (
      permissionId: PermissionId,
      options: {
        hideForbidden?: boolean;
        fallbackValue?: any;
        isSystemAction?: boolean;
      } = {},
    ) => gatingUtil.gateElement(permissionId, options);
  }, [gatingUtil]);

  const gateButton = useMemo(() => {
    return (
      permissionId: PermissionId,
      options: {
        isSystemAction?: boolean;
        disabledText?: string;
      } = {},
    ) => gatingUtil.gateButton(permissionId, options);
  }, [gatingUtil]);

  const gateField = useMemo(() => {
    return (
      permissionId: PermissionId,
      options: {
        isSystemAction?: boolean;
        readonly?: boolean;
      } = {},
    ) => gatingUtil.gateField(permissionId, options);
  }, [gatingUtil]);

  const hasPermission = useMemo(() => {
    return (permissionId: PermissionId, isSystemAction = false) =>
      gatingUtil.hasPermission(permissionId, isSystemAction);
  }, [gatingUtil]);

  return {
    gatingUtil,
    gateElement,
    gateButton,
    gateField,
    hasPermission,
    userRole: permissions.userRole,
    organisationId,
  };
}
