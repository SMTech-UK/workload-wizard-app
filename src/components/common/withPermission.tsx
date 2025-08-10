import React, { ComponentType, forwardRef } from "react";
import { usePermissionManager } from "@/hooks/usePermissionManager";
import { type PermissionId } from "@/lib/permissions";

// Higher-order component for permission-aware components
export function withPermission<P extends object>(
  WrappedComponent: ComponentType<P>,
  permission: PermissionId,
  options: {
    organisationId?: string;
    isSystemAction?: boolean;
    actionName?: string;
    showToast?: boolean;
    redirectOnDeny?: boolean;
    fallback?: React.ReactNode;
    hideForbidden?: boolean;
  } = {},
) {
  const {
    organisationId,
    isSystemAction = false,
    actionName,
    showToast = false,
    redirectOnDeny = false,
    fallback = null,
    hideForbidden = false,
  } = options;

  const PermissionWrappedComponent = forwardRef<any, P>((props, ref) => {
    const { gateElement, canPerform } = usePermissionManager(organisationId);

    // Gate the component state
    const uiState = gateElement(permission, {
      organisationId,
      isSystemAction,
      actionName,
      showToast,
      redirectOnDeny,
    });

    // Check if user can perform the action
    const hasAccess = canPerform(permission, {
      organisationId,
      isSystemAction,
    });

    // If hiding forbidden actions and no access, return fallback or null
    if (hideForbidden && !hasAccess) {
      return fallback ? <>{fallback}</> : null;
    }

    // If no access and no fallback, return null
    if (!hasAccess && !fallback) {
      return null;
    }

    // If no access but fallback exists, return fallback
    if (!hasAccess && fallback) {
      return <>{fallback}</>;
    }

    // User has access, render the wrapped component with enhanced props
    const enhancedProps = {
      ...props,
      ref,
      // Add permission state to props
      permissionState: {
        hasAccess: uiState.hasAccess,
        disabled: uiState.disabled,
        scope: uiState.scope,
        requiresOrgContext: uiState.requiresOrgContext,
      },
    };

    return <WrappedComponent {...(enhancedProps as P)} />;
  });

  // Set display name for debugging
  const wrappedComponentName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";
  PermissionWrappedComponent.displayName = `withPermission(${wrappedComponentName})`;

  return PermissionWrappedComponent;
}

// Factory function for creating permission-aware components
export function createPermissionAwareComponent<P extends object>(
  permission: PermissionId,
  options: {
    organisationId?: string;
    isSystemAction?: boolean;
    actionName?: string;
    showToast?: boolean;
    redirectOnDeny?: boolean;
    fallback?: React.ReactNode;
    hideForbidden?: boolean;
  } = {},
) {
  return <T extends ComponentType<P>>(Component: T) =>
    withPermission(Component, permission, options);
}

// Pre-configured permission wrappers for common use cases
export const withUsersView = createPermissionAwareComponent("users.view", {
  actionName: "view users",
});

export const withUsersCreate = createPermissionAwareComponent("users.create", {
  actionName: "create users",
});

export const withUsersEdit = createPermissionAwareComponent("users.edit", {
  actionName: "edit users",
});

export const withUsersDelete = createPermissionAwareComponent("users.delete", {
  actionName: "delete users",
});

export const withPermissionsManage = createPermissionAwareComponent(
  "permissions.manage",
  {
    actionName: "manage permissions",
  },
);

export const withFlagsManage = createPermissionAwareComponent("flags.manage", {
  actionName: "manage feature flags",
});

export const withOrganisationsManage = createPermissionAwareComponent(
  "organisations.manage",
  {
    isSystemAction: true,
    actionName: "manage organisations",
  },
);

export const withAuditView = createPermissionAwareComponent("audit.view", {
  actionName: "view audit logs",
});

// Hook for using permission state in custom components
export function usePermissionState(
  permission: PermissionId,
  options: {
    organisationId?: string;
    isSystemAction?: boolean;
    actionName?: string;
    showToast?: boolean;
    redirectOnDeny?: boolean;
  } = {},
) {
  const { gateElement, canPerform } = usePermissionManager(
    options.organisationId,
  );

  const uiState = gateElement(permission, {
    organisationId: options.organisationId,
    isSystemAction: options.isSystemAction,
    actionName: options.actionName,
    showToast: options.showToast,
    redirectOnDeny: options.redirectOnDeny,
  });

  const hasAccess = canPerform(permission, {
    organisationId: options.organisationId,
    isSystemAction: options.isSystemAction,
  });

  return {
    ...uiState,
    hasAccess,
    // Convenience methods
    canView: hasAccess && !uiState.shouldHide,
    canEdit: hasAccess,
    canDelete: hasAccess,
    // Conditional rendering helpers
    shouldRender: hasAccess && !uiState.shouldHide,
    shouldDisable: !hasAccess,
    shouldHide: uiState.shouldHide,
  };
}
