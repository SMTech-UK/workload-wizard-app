import {
  type PermissionId,
  PERMISSION_SCOPES,
  USER_ROLES,
} from "./permissions";

/**
 * Centralized gating utility for org vs system roles
 * Provides consistent permission checking across the application
 */
export class PermissionGatingUtil {
  constructor(
    private userRole: string | undefined,
    private organisationId?: string,
  ) {}

  /**
   * Check if user has permission for a specific action
   */
  hasPermission(permissionId: PermissionId, isSystemAction = false): boolean {
    if (!this.userRole) return false;

    // System-level permissions (no org context needed)
    if (isSystemAction) {
      return this.isSystemAdmin();
    }

    // Organization-level permissions
    if (this.organisationId) {
      // System admins have access to everything
      if (this.isSystemAdmin()) return true;

      // Org admins have access to org-level permissions
      if (this.isOrgAdmin()) return true;

      // Regular users have limited access
      return this.userRole === "lecturer";
    }

    return false;
  }

  /**
   * Gate UI element based on permission
   */
  gateElement(
    permissionId: PermissionId,
    options: {
      hideForbidden?: boolean;
      fallbackValue?: any;
      isSystemAction?: boolean;
    } = {},
  ): { visible: boolean; value: any; disabled: boolean } {
    const {
      hideForbidden = false,
      fallbackValue = null,
      isSystemAction = false,
    } = options;
    const hasAccess = this.hasPermission(permissionId, isSystemAction);

    return {
      visible: hasAccess || !hideForbidden,
      value: hasAccess ? undefined : fallbackValue,
      disabled: !hasAccess,
    };
  }

  /**
   * Gate button state
   */
  gateButton(
    permissionId: PermissionId,
    options: {
      isSystemAction?: boolean;
      disabledText?: string;
    } = {},
  ): { disabled: boolean; disabledText?: string } {
    const { isSystemAction = false, disabledText } = options;
    const hasAccess = this.hasPermission(permissionId, isSystemAction);

    return {
      disabled: !hasAccess,
      ...(hasAccess
        ? {}
        : { disabledText: disabledText || "Insufficient permissions" }),
    } as { disabled: boolean; disabledText?: string };
  }

  /**
   * Gate form field
   */
  gateField(
    permissionId: PermissionId,
    options: {
      isSystemAction?: boolean;
      readonly?: boolean;
    } = {},
  ): { readonly: boolean; disabled: boolean } {
    const { isSystemAction = false, readonly = false } = options;
    const hasAccess = this.hasPermission(permissionId, isSystemAction);

    return {
      readonly: readonly || !hasAccess,
      disabled: !hasAccess,
    };
  }

  /**
   * Check if user is system admin
   */
  private isSystemAdmin(): boolean {
    return (
      this.userRole === USER_ROLES.SYSTEM_ADMIN ||
      this.userRole === USER_ROLES.SYS_ADMIN
    );
  }

  /**
   * Check if user is org admin
   */
  private isOrgAdmin(): boolean {
    return (
      this.userRole === USER_ROLES.ADMIN ||
      this.userRole === USER_ROLES.ORG_ADMIN
    );
  }

  /**
   * Get permission scope context
   */
  getScopeContext(permissionId: PermissionId): {
    scope: string;
    isSystemAction: boolean;
    requiresOrgContext: boolean;
  } {
    // This would need to be implemented based on your permission definitions
    // For now, returning a basic structure
    return {
      scope: PERMISSION_SCOPES.ORG,
      isSystemAction: false,
      requiresOrgContext: true,
    };
  }
}

/**
 * Factory function to create permission gating utility
 */
export function createPermissionGating(
  userRole: string | undefined,
  organisationId?: string,
): PermissionGatingUtil {
  return new PermissionGatingUtil(userRole, organisationId);
}
