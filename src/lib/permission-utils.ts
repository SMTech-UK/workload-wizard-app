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
      // System admins have access to all orgs
      if (this.isSystemAdmin()) {
        return true;
      }

      // Check org-specific permissions
      return this.hasOrgPermission(permissionId);
    }

    return false;
  }

  /**
   * Check if user is a system admin
   */
  isSystemAdmin(): boolean {
    return (
      this.userRole === USER_ROLES.SYSTEM_ADMIN ||
      this.userRole === USER_ROLES.SYS_ADMIN ||
      this.userRole === USER_ROLES.ADMIN
    );
  }

  /**
   * Check if user is an org admin
   */
  isOrgAdmin(): boolean {
    return this.userRole === USER_ROLES.ORG_ADMIN;
  }

  /**
   * Check if user has org-level permission
   */
  private hasOrgPermission(permissionId: PermissionId): boolean {
    // This would typically check against a permission matrix
    // For now, using role-based checks
    switch (permissionId) {
      case "users.view":
        return (
          this.userRole === USER_ROLES.ORG_ADMIN ||
          this.userRole === USER_ROLES.LECTURER
        );
      case "users.create":
      case "users.edit":
      case "users.delete":
        return this.userRole === USER_ROLES.ORG_ADMIN;
      case "permissions.manage":
      case "flags.manage":
        return this.userRole === USER_ROLES.ORG_ADMIN;
      case "audit.view":
        return this.userRole === USER_ROLES.ORG_ADMIN;
      default:
        return false;
    }
  }

  /**
   * Gate UI element based on permission
   */
  gateElement(
    permissionId: PermissionId,
    options: {
      isSystemAction?: boolean;
      hideForbidden?: boolean;
      fallbackValue?: any;
    } = {},
  ): {
    hasAccess: boolean;
    shouldHide: boolean;
    fallbackValue: any;
    scope: "system" | "org";
  } {
    const {
      isSystemAction = false,
      hideForbidden = false,
      fallbackValue = null,
    } = options;

    const hasAccess = this.hasPermission(permissionId, isSystemAction);
    const scope = isSystemAction ? "system" : "org";

    return {
      hasAccess,
      shouldHide: hideForbidden && !hasAccess,
      fallbackValue: hasAccess ? null : fallbackValue,
      scope,
    };
  }

  /**
   * Gate button state based on permission
   */
  gateButton(
    permissionId: PermissionId,
    options: {
      isSystemAction?: boolean;
      disabledText?: string;
    } = {},
  ): {
    disabled: boolean;
    disabledText?: string;
    tooltip?: string;
  } {
    const {
      isSystemAction = false,
      disabledText = "Insufficient permissions",
    } = options;

    const hasAccess = this.hasPermission(permissionId, isSystemAction);

    return {
      disabled: !hasAccess,
      disabledText: hasAccess ? undefined : disabledText,
      tooltip: hasAccess ? undefined : disabledText,
    };
  }

  /**
   * Gate action execution based on permission
   */
  gateAction(
    permissionId: PermissionId,
    options: {
      isSystemAction?: boolean;
      actionName?: string;
    } = {},
  ): {
    canPerform: boolean;
    errorMessage?: string;
    scope: "system" | "org";
  } {
    const { isSystemAction = false, actionName = "perform this action" } =
      options;

    const hasAccess = this.hasPermission(permissionId, isSystemAction);
    const scope = isSystemAction ? "system" : "org";

    return {
      canPerform: hasAccess,
      errorMessage: hasAccess
        ? undefined
        : `You don't have permission to ${actionName}`,
      scope,
    };
  }

  /**
   * Check if user can access users module
   */
  canAccessUsers(): boolean {
    return this.hasPermission("users.view");
  }

  /**
   * Check if user can manage users
   */
  canManageUsers(): boolean {
    return (
      this.hasPermission("users.create") ||
      this.hasPermission("users.edit") ||
      this.hasPermission("users.delete")
    );
  }

  /**
   * Check if user can manage permissions
   */
  canManagePermissions(): boolean {
    return this.hasPermission("permissions.manage");
  }

  /**
   * Check if user can manage feature flags
   */
  canManageFlags(): boolean {
    return this.hasPermission("flags.manage");
  }

  /**
   * Check if user can view audit logs
   */
  canViewAudit(): boolean {
    return this.hasPermission("audit.view");
  }
}

/**
 * Factory function to create permission gating utility
 */
export function createPermissionGatingUtil(
  userRole: string | undefined,
  organisationId?: string,
): PermissionGatingUtil {
  return new PermissionGatingUtil(userRole, organisationId);
}

/**
 * Convenience functions for common permission checks
 */
export function canViewUsers(
  userRole?: string,
  organisationId?: string,
): boolean {
  return createPermissionGatingUtil(userRole, organisationId).canAccessUsers();
}

export function canManageUsers(
  userRole?: string,
  organisationId?: string,
): boolean {
  return createPermissionGatingUtil(userRole, organisationId).canManageUsers();
}

export function canManagePermissions(
  userRole?: string,
  organisationId?: string,
): boolean {
  return createPermissionGatingUtil(
    userRole,
    organisationId,
  ).canManagePermissions();
}

export function canManageFlags(
  userRole?: string,
  organisationId?: string,
): boolean {
  return createPermissionGatingUtil(userRole, organisationId).canManageFlags();
}

export function canViewAudit(
  userRole?: string,
  organisationId?: string,
): boolean {
  return createPermissionGatingUtil(userRole, organisationId).canViewAudit();
}
