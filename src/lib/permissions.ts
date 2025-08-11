export type PermissionId = `${string}.${string}`;

// Centralized permission constants for consistent usage
export const PERMISSION_GROUPS = {
  USERS: "users",
  ADMIN: "admin",
  AUDIT: "audit",
  ORGANISATIONS: "organisations",
  FEATURE_FLAGS: "flags",
} as const;

export const PERMISSION_SCOPES = {
  SYSTEM: "system",
  ORG: "org",
  BOTH: "both",
} as const;

export const USER_ROLES = {
  SYSTEM_ADMIN: "systemadmin",
  SYS_ADMIN: "sysadmin",
  ADMIN: "admin",
  ORG_ADMIN: "orgadmin",
  LECTURER: "lecturer",
} as const;

export const PERMISSIONS: Record<
  PermissionId,
  { group: string; description: string; scope: "system" | "org" | "both" }
> = {
  "users.view": {
    group: "users",
    description: "View users in your organisation",
    scope: "org",
  },
  "users.create": {
    group: "users",
    description: "Create users in your organisation",
    scope: "org",
  },
  "users.edit": {
    group: "users",
    description: "Edit users in your organisation",
    scope: "org",
  },
  "users.delete": {
    group: "users",
    description: "Delete users in your organisation",
    scope: "org",
  },
  "permissions.manage": {
    group: "admin",
    description: "Manage roles and permissions",
    scope: "both",
  },
  "flags.manage": {
    group: "admin",
    description: "Toggle feature flags",
    scope: "both",
  },
  "organisations.manage": {
    group: "admin",
    description: "Manage organisations",
    scope: "system",
  },
  "audit.view": {
    group: "admin",
    description: "View audit logs",
    scope: "both",
  },
  // Planning MVP permissions (org-scoped)
  "courses.create": {
    group: "courses",
    description: "Create courses",
    scope: "org",
  },
  "courses.edit": {
    group: "courses",
    description: "Edit courses",
    scope: "org",
  },
  "courses.delete": {
    group: "courses",
    description: "Delete courses",
    scope: "org",
  },
  "courses.years.add": {
    group: "courses",
    description: "Add course years",
    scope: "org",
  },
  "modules.create": {
    group: "modules",
    description: "Create modules",
    scope: "org",
  },
  "modules.edit": {
    group: "modules",
    description: "Edit modules",
    scope: "org",
  },
  "modules.delete": {
    group: "modules",
    description: "Delete modules",
    scope: "org",
  },
  "modules.link": {
    group: "modules",
    description: "Attach module to course year",
    scope: "org",
  },
  "modules.unlink": {
    group: "modules",
    description: "Detach module from course year",
    scope: "org",
  },
  "iterations.create": {
    group: "iterations",
    description: "Create module iterations for an academic year",
    scope: "org",
  },
  "groups.create": {
    group: "groups",
    description: "Create groups",
    scope: "org",
  },
  "groups.delete": {
    group: "groups",
    description: "Delete groups",
    scope: "org",
  },
  "staff.create": {
    group: "staff",
    description: "Create lecturer profiles",
    scope: "org",
  },
  "staff.edit": {
    group: "staff",
    description: "Edit lecturer profiles",
    scope: "org",
  },
  "allocations.assign": {
    group: "allocations",
    description: "Assign lecturer to group",
    scope: "org",
  },
  "allocations.bulk": {
    group: "allocations",
    description: "Bulk manage group allocations",
    scope: "org",
  },
};

export const DEFAULT_ROLES: Record<string, PermissionId[]> = {
  systemadmin: Object.keys(PERMISSIONS) as PermissionId[],
  dev: Object.keys(PERMISSIONS) as PermissionId[],
  developer: Object.keys(PERMISSIONS) as PermissionId[],
  orgadmin: [
    // Seeded granular permissions for Org Admins. No implicit bypass.
    "users.view",
    "users.create",
    "users.edit",
    "permissions.manage",
    "flags.manage",
    "audit.view",
  ],
  lecturer: ["users.view"],
};

// Enhanced permission checking with better scope handling
export function hasPermission(
  userRole: string | undefined,
  permissionId: PermissionId,
  organisationId?: string,
  isSystemAction: boolean = false,
): boolean {
  if (!userRole) return false;

  const permission = PERMISSIONS[permissionId];
  if (!permission) return false;

  // System-level permissions (no org context needed)
  if (isSystemAction || permission.scope === "system") {
    return (
      userRole === "systemadmin" ||
      userRole === "sysadmin" ||
      userRole === "admin" ||
      userRole === "developer" ||
      userRole === "dev"
    );
  }

  // Organization-level permissions
  if (organisationId || permission.scope === "org") {
    // System admins have access to all orgs
    if (
      userRole === "systemadmin" ||
      userRole === "sysadmin" ||
      userRole === "admin" ||
      userRole === "developer" ||
      userRole === "dev"
    ) {
      return true;
    }
    // Org admins do NOT bypass; they must have seeded permission
    const userPermissions = DEFAULT_ROLES[userRole] || [];
    return userPermissions.includes(permissionId);
  }

  // Both scope permissions - check based on context
  if (permission.scope === "both") {
    if (
      userRole === "systemadmin" ||
      userRole === "sysadmin" ||
      userRole === "admin" ||
      userRole === "developer" ||
      userRole === "dev"
    ) {
      return true;
    }

    const userPermissions = DEFAULT_ROLES[userRole] || [];
    return userPermissions.includes(permissionId);
  }

  // Fallback to role-based check
  const userPermissions = DEFAULT_ROLES[userRole] || [];
  return userPermissions.includes(permissionId);
}

// Enhanced UI state management for permission-aware components
export interface UIGateOptions {
  organisationId?: string | undefined;
  isSystemAction?: boolean | undefined;
  fallbackValue?: any | undefined;
  hideForbidden?: boolean | undefined;
  disabledText?: string | undefined;
  actionName?: string | undefined;
  showToast?: boolean | undefined;
  redirectOnDeny?: boolean | undefined;
}

export interface UIGateResult {
  hasAccess: boolean;
  shouldHide: boolean;
  fallbackValue: any;
  disabled: boolean;
  disabledText?: string;
  errorMessage?: string;
  scope: "system" | "org" | "both";
  requiresOrgContext: boolean;
}

// Centralized gating utility for UI states with enhanced options
export function gateUIState(
  userRole: string | undefined,
  permissionId: PermissionId,
  options: UIGateOptions = {},
): UIGateResult {
  const {
    organisationId,
    isSystemAction = false,
    fallbackValue = null,
    hideForbidden = false,
    disabledText = "Insufficient permissions",
    actionName = "this action",
  } = options;

  const permission = PERMISSIONS[permissionId];
  const hasAccess = hasPermission(
    userRole,
    permissionId,
    organisationId,
    isSystemAction,
  );
  const scope = permission?.scope || "org";
  const requiresOrgContext = scope === "org" && !isSystemAction;

  const result: UIGateResult = {
    hasAccess,
    shouldHide: !hasAccess && hideForbidden,
    fallbackValue: hasAccess ? undefined : fallbackValue,
    disabled: !hasAccess,
    scope,
    requiresOrgContext,
  };

  if (!hasAccess) {
    result.disabledText = disabledText;
    result.errorMessage = `You don't have permission to perform ${actionName}`;
  }

  return result;
}

// Enhanced button state gating with better UX
export function gateButtonState(
  userRole: string | undefined,
  permissionId: PermissionId,
  options: UIGateOptions = {},
): {
  disabled: boolean;
  disabledText?: string;
  tooltip?: string;
  scope: string;
} {
  const {
    organisationId,
    isSystemAction = false,
    disabledText = "Insufficient permissions",
  } = options;

  const permission = PERMISSIONS[permissionId];
  const hasAccess = hasPermission(
    userRole,
    permissionId,
    organisationId,
    isSystemAction,
  );
  const scope = permission?.scope || "org";

  const result: {
    disabled: boolean;
    disabledText?: string;
    tooltip?: string;
    scope: string;
  } = {
    disabled: !hasAccess,
    scope,
  };

  if (!hasAccess) {
    result.disabledText = disabledText;
    result.tooltip = disabledText;
  }

  return result;
}

// Enhanced action state gating with better error messages
export function gateActionState(
  userRole: string | undefined,
  permissionId: PermissionId,
  options: UIGateOptions = {},
): {
  canPerform: boolean;
  errorMessage?: string | undefined;
  shouldShowError?: boolean | undefined;
  scope: string;
} {
  const {
    organisationId,
    isSystemAction = false,
    actionName = "this action",
  } = options;

  const permission = PERMISSIONS[permissionId];
  const hasAccess = hasPermission(
    userRole,
    permissionId,
    organisationId,
    isSystemAction,
  );
  const scope = permission?.scope || "org";

  return {
    canPerform: hasAccess,
    errorMessage: hasAccess
      ? undefined
      : `You don't have permission to perform ${actionName}`,
    shouldShowError: !hasAccess,
    scope,
  };
}

// Form field gating for permission-aware forms
export function gateFormField(
  userRole: string | undefined,
  permissionId: PermissionId,
  options: UIGateOptions = {},
): {
  readonly: boolean;
  disabled: boolean;
  helperText?: string | undefined;
  errorMessage?: string | undefined;
  scope: string;
} {
  const {
    organisationId,
    isSystemAction = false,
    disabledText = "Insufficient permissions",
  } = options;

  const permission = PERMISSIONS[permissionId];
  const hasAccess = hasPermission(
    userRole,
    permissionId,
    organisationId,
    isSystemAction,
  );
  const scope = permission?.scope || "org";

  return {
    readonly: !hasAccess,
    disabled: !hasAccess,
    helperText: hasAccess ? undefined : disabledText,
    errorMessage: hasAccess ? undefined : disabledText,
    scope,
  };
}

// Table row gating for permission-aware data tables
export function gateTableRow(
  userRole: string | undefined,
  permissionId: PermissionId,
  options: UIGateOptions = {},
): {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  rowClassName?: string | undefined;
  scope: string;
} {
  const { organisationId, isSystemAction = false } = options;

  const permission = PERMISSIONS[permissionId];
  const hasAccess = hasPermission(
    userRole,
    permissionId,
    organisationId,
    isSystemAction,
  );
  const scope = permission?.scope || "org";

  return {
    canView: hasAccess,
    canEdit: hasAccess,
    canDelete: hasAccess,
    rowClassName: hasAccess ? undefined : "opacity-50",
    scope,
  };
}

// Enhanced permission context checker
export function getPermissionContext(
  userRole: string | undefined,
  permissionId: PermissionId,
  organisationId?: string,
): {
  isSystemAction: boolean;
  hasOrgContext: boolean;
  scope: "system" | "org" | "both";
  canAccess: boolean;
} {
  const permission = PERMISSIONS[permissionId];
  const scope = permission?.scope || "org";

  const isSystemAction = scope === "system";
  const hasOrgContext = Boolean(organisationId);

  const canAccess = hasPermission(
    userRole,
    permissionId,
    organisationId,
    isSystemAction,
  );

  return {
    isSystemAction,
    hasOrgContext,
    scope,
    canAccess,
  };
}

// Convenience functions for common permission checks
export function canViewUsers(
  userRole?: string,
  organisationId?: string,
): boolean {
  return hasPermission(userRole, "users.view", organisationId);
}

export function canCreateUsers(
  userRole?: string,
  organisationId?: string,
): boolean {
  return hasPermission(userRole, "users.create", organisationId);
}

export function canEditUsers(
  userRole?: string,
  organisationId?: string,
): boolean {
  return hasPermission(userRole, "users.edit", organisationId);
}

export function canDeleteUsers(
  userRole?: string,
  organisationId?: string,
): boolean {
  return hasPermission(userRole, "users.delete", organisationId);
}

export function canManagePermissions(
  userRole?: string,
  organisationId?: string,
): boolean {
  return hasPermission(userRole, "permissions.manage", organisationId);
}

export function canManageFlags(
  userRole?: string,
  organisationId?: string,
): boolean {
  return hasPermission(userRole, "flags.manage", organisationId);
}

export function canManageOrganisations(userRole?: string): boolean {
  return hasPermission(userRole, "organisations.manage", undefined, true);
}

export function canViewAudit(
  userRole?: string,
  organisationId?: string,
): boolean {
  return hasPermission(userRole, "audit.view", organisationId);
}

export async function seedDefaultOrgRoles(organisationId: string) {
  // Idempotently ensure default roles for an org via Convex helper.
  const { ConvexHttpClient } = await import("convex/browser");
  const { api } = await import("../../convex/_generated/api");
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const res = await client.mutation(
    api.permissions.ensureDefaultRolesForOrganisation,
    {
      organisationId: organisationId as unknown as any,
    },
  );
  return { organisationId, created: res.created };
}

export function listPermissionsByGroup(): Record<
  string,
  Array<{ id: PermissionId; description: string }>
> {
  const entries = Object.entries(PERMISSIONS) as Array<
    [PermissionId, { group: string; description: string }]
  >;
  return entries.reduce<
    Record<string, Array<{ id: PermissionId; description: string }>>
  >((acc, [id, meta]) => {
    const list = acc[meta.group] ?? [];
    list.push({ id, description: meta.description });
    acc[meta.group] = list;
    return acc;
  }, {});
}

export function rolesForPermission(permissionId: PermissionId): string[] {
  const roles: string[] = [];
  for (const [role, perms] of Object.entries(DEFAULT_ROLES)) {
    if (perms.includes(permissionId)) roles.push(role);
  }
  return roles;
}

// Centralized Permission-Aware UI State Manager
export class PermissionUIStateManager {
  private userRole: string | undefined;
  private organisationId: string | undefined;
  private toastHandler:
    | ((message: string, variant: "error" | "warning" | "info") => void)
    | undefined;

  constructor(
    userRoleParam?: string,
    organisationIdParam?: string,
    toastHandlerParam?: (
      message: string,
      variant: "error" | "warning" | "info",
    ) => void,
  ) {
    this.userRole = userRoleParam;
    this.organisationId = organisationIdParam;
    this.toastHandler = toastHandlerParam;
  }

  // Centralized method to gate any UI element
  gateElement(
    permissionId: PermissionId,
    options: UIGateOptions = {},
  ): UIGateResult {
    const result = gateUIState(this.userRole, permissionId, {
      organisationId: this.organisationId,
      ...options,
    });

    // Auto-handle toast notifications if enabled
    if (options.showToast && !result.hasAccess && this.toastHandler) {
      this.toastHandler(result.errorMessage || "Access denied", "error");
    }

    return result;
  }

  // Gate button states
  gateButton(
    permissionId: PermissionId,
    options: UIGateOptions = {},
  ): ReturnType<typeof gateButtonState> {
    return gateButtonState(this.userRole, permissionId, {
      organisationId: this.organisationId,
      ...options,
    });
  }

  // Gate action states
  gateAction(
    permissionId: PermissionId,
    options: UIGateOptions = {},
  ): ReturnType<typeof gateActionState> {
    return gateActionState(this.userRole, permissionId, {
      organisationId: this.organisationId,
      ...options,
    });
  }

  // Gate form fields
  gateField(
    permissionId: PermissionId,
    options: UIGateOptions = {},
  ): ReturnType<typeof gateFormField> {
    return gateFormField(this.userRole, permissionId, {
      organisationId: this.organisationId,
      ...options,
    });
  }

  // Gate table rows
  gateRow(
    permissionId: PermissionId,
    options: UIGateOptions = {},
  ): ReturnType<typeof gateTableRow> {
    return gateTableRow(this.userRole, permissionId, {
      organisationId: this.organisationId,
      ...options,
    });
  }

  // Check if user can perform an action with auto-redirect
  canPerformAction(
    permissionId: PermissionId,
    actionName: string,
    options: UIGateOptions = {},
  ): boolean {
    const result = this.gateElement(permissionId, {
      actionName,
      showToast: true,
      ...options,
    });

    if (!result.hasAccess && options.redirectOnDeny) {
      // Redirect to unauthorized page
      if (typeof window !== "undefined") {
        window.location.href = "/unauthorised";
      }
    }

    return result.hasAccess;
  }

  // Get permission context for debugging
  getContext(permissionId: PermissionId) {
    // getPermissionContext already accepts undefined
    return getPermissionContext(
      this.userRole,
      permissionId,
      this.organisationId,
    );
  }

  // Check if user has any admin access
  hasAnyAdminAccess(): boolean {
    return (
      this.userRole === "systemadmin" ||
      this.userRole === "sysadmin" ||
      this.userRole === "admin" ||
      this.userRole === "orgadmin"
    );
  }

  // Check if user is system admin
  isSystemAdmin(): boolean {
    return (
      this.userRole === "systemadmin" ||
      this.userRole === "sysadmin" ||
      this.userRole === "admin"
    );
  }

  // Check if user is org admin
  isOrgAdmin(): boolean {
    return this.userRole === "orgadmin";
  }
}

// Factory function to create a permission state manager
export function createPermissionManager(
  userRole: string | undefined,
  organisationId?: string,
  toastHandler?: (
    message: string,
    variant: "error" | "warning" | "info",
  ) => void,
): PermissionUIStateManager {
  return new PermissionUIStateManager(userRole, organisationId, toastHandler);
}
