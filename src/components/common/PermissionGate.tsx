"use client";

import { ReactNode } from "react";
import { usePermissionManager } from "@/hooks/usePermissionManager";
import { type PermissionId } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface PermissionGateProps {
  children: ReactNode;
  permission?: PermissionId;
  isSystemAction?: boolean;
  organisationId?: string;
  fallback?: ReactNode;
  hide?: boolean; // If true, renders nothing instead of fallback
  disabled?: boolean; // If true, renders children but disabled
  disabledText?: string; // Text to show when disabled
  actionName?: string; // Name of the action for better error messages
  showToast?: boolean; // Whether to show toast on permission denial
  redirectOnDeny?: boolean; // Whether to redirect to unauthorized page
}

export function PermissionGate({
  children,
  permission,
  isSystemAction = false,
  organisationId,
  fallback = null,
  hide = false,
  disabled = false,
  disabledText,
  actionName,
  showToast = false,
  redirectOnDeny = false,
}: PermissionGateProps) {
  const { gateElement, canPerform, isSystemAdmin, isOrgAdmin } =
    usePermissionManager(organisationId);

  // If no permission specified, check if user has any admin access
  if (!permission) {
    if (isSystemAdmin() || isOrgAdmin()) {
      return <>{children}</>;
    }
    return hide ? null : <>{fallback}</>;
  }

  // Use centralized gating utility
  const uiState = gateElement(permission, {
    organisationId,
    isSystemAction,
    hideForbidden: hide,
    fallbackValue: fallback,
    actionName,
    showToast,
    redirectOnDeny,
  });

  // Handle different UI states
  if (uiState.shouldHide) {
    return null;
  }

  if (!uiState.hasAccess) {
    return <>{uiState.fallbackValue}</>;
  }

  // If disabled prop is true, render children but with disabled state
  if (disabled) {
    return (
      <div
        className={cn(
          "opacity-50 pointer-events-none",
          disabledText && "cursor-not-allowed",
        )}
        title={disabledText}
      >
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

// Enhanced convenience components with better UI state handling
export function UsersViewGate({
  children,
  organisationId,
  fallback,
  hide,
  disabled,
  disabledText = "You don't have permission to view users",
  actionName = "view users",
  showToast = false,
  redirectOnDeny = false,
}: Omit<PermissionGateProps, "permission">) {
  return (
    <PermissionGate
      permission="users.view"
      {...(organisationId ? { organisationId: organisationId as string } : {})}
      {...(typeof hide === "boolean" ? { hide } : {})}
      {...(typeof disabled === "boolean" ? { disabled } : {})}
      {...(fallback ? { fallback } : {})}
      {...(disabledText ? { disabledText } : {})}
      {...(actionName ? { actionName } : {})}
      {...(showToast ? { showToast } : {})}
      {...(redirectOnDeny ? { redirectOnDeny } : {})}
    >
      {children}
    </PermissionGate>
  );
}

export function UsersCreateGate({
  children,
  organisationId,
  fallback,
  hide,
  disabled,
  disabledText = "You don't have permission to create users",
  actionName = "create users",
  showToast = false,
  redirectOnDeny = false,
}: Omit<PermissionGateProps, "permission">) {
  return (
    <PermissionGate
      permission="users.create"
      {...(organisationId ? { organisationId: organisationId as string } : {})}
      {...(typeof hide === "boolean" ? { hide } : {})}
      {...(typeof disabled === "boolean" ? { disabled } : {})}
      {...(fallback ? { fallback } : {})}
      {...(disabledText ? { disabledText } : {})}
      {...(actionName ? { actionName } : {})}
      {...(showToast ? { showToast } : {})}
      {...(redirectOnDeny ? { redirectOnDeny } : {})}
    >
      {children}
    </PermissionGate>
  );
}

export function UsersEditGate({
  children,
  organisationId,
  fallback,
  hide,
  disabled,
  disabledText = "You don't have permission to edit users",
  actionName = "edit users",
  showToast = false,
  redirectOnDeny = false,
}: Omit<PermissionGateProps, "permission">) {
  return (
    <PermissionGate
      permission="users.edit"
      {...(organisationId ? { organisationId: organisationId as string } : {})}
      {...(typeof hide === "boolean" ? { hide } : {})}
      {...(typeof disabled === "boolean" ? { disabled } : {})}
      {...(fallback ? { fallback } : {})}
      {...(disabledText ? { disabledText } : {})}
      {...(actionName ? { actionName } : {})}
      {...(showToast ? { showToast } : {})}
      {...(redirectOnDeny ? { redirectOnDeny } : {})}
    >
      {children}
    </PermissionGate>
  );
}

export function UsersDeleteGate({
  children,
  organisationId,
  fallback,
  hide,
  disabled,
  disabledText = "You don't have permission to delete users",
  actionName = "delete users",
  showToast = false,
  redirectOnDeny = false,
}: Omit<PermissionGateProps, "permission">) {
  return (
    <PermissionGate
      permission="users.delete"
      {...(organisationId ? { organisationId: organisationId as string } : {})}
      {...(typeof hide === "boolean" ? { hide } : {})}
      {...(typeof disabled === "boolean" ? { disabled } : {})}
      {...(fallback ? { fallback } : {})}
      {...(disabledText ? { disabledText } : {})}
      {...(actionName ? { actionName } : {})}
      {...(showToast ? { showToast } : {})}
      {...(redirectOnDeny ? { redirectOnDeny } : {})}
    >
      {children}
    </PermissionGate>
  );
}

export function PermissionsManageGate({
  children,
  organisationId,
  fallback,
  hide,
  disabled,
  disabledText = "You don't have permission to manage permissions",
  actionName = "manage permissions",
  showToast = false,
  redirectOnDeny = false,
}: Omit<PermissionGateProps, "permission">) {
  return (
    <PermissionGate
      permission="permissions.manage"
      {...(organisationId ? { organisationId: organisationId as string } : {})}
      {...(typeof hide === "boolean" ? { hide } : {})}
      {...(typeof disabled === "boolean" ? { disabled } : {})}
      {...(fallback ? { fallback } : {})}
      {...(disabledText ? { disabledText } : {})}
      {...(actionName ? { actionName } : {})}
      {...(showToast ? { showToast } : {})}
      {...(redirectOnDeny ? { redirectOnDeny } : {})}
    >
      {children}
    </PermissionGate>
  );
}

export function FlagsManageGate({
  children,
  organisationId,
  fallback,
  hide,
  disabled,
  disabledText = "You don't have permission to manage feature flags",
  actionName = "manage feature flags",
  showToast = false,
  redirectOnDeny = false,
}: Omit<PermissionGateProps, "permission">) {
  return (
    <PermissionGate
      permission="flags.manage"
      {...(organisationId ? { organisationId: organisationId as string } : {})}
      {...(typeof hide === "boolean" ? { hide } : {})}
      {...(typeof disabled === "boolean" ? { disabled } : {})}
      {...(fallback ? { fallback } : {})}
      {...(disabledText ? { disabledText } : {})}
      {...(actionName ? { actionName } : {})}
      {...(showToast ? { showToast } : {})}
      {...(redirectOnDeny ? { redirectOnDeny } : {})}
    >
      {children}
    </PermissionGate>
  );
}

export function OrganisationsManageGate({
  children,
  fallback,
  hide,
  disabled,
  disabledText = "You don't have permission to manage organisations",
  actionName = "manage organisations",
  showToast = false,
  redirectOnDeny = false,
}: Omit<PermissionGateProps, "permission" | "organisationId">) {
  return (
    <PermissionGate
      permission="organisations.manage"
      isSystemAction={true}
      {...(typeof hide === "boolean" ? { hide } : {})}
      {...(typeof disabled === "boolean" ? { disabled } : {})}
      {...(fallback ? { fallback } : {})}
      {...(disabledText ? { disabledText } : {})}
      {...(actionName ? { actionName } : {})}
      {...(showToast ? { showToast } : {})}
      {...(redirectOnDeny ? { redirectOnDeny } : {})}
    >
      {children}
    </PermissionGate>
  );
}

export function AuditViewGate({
  children,
  organisationId,
  fallback,
  hide,
  disabled,
  disabledText = "You don't have permission to view audit logs",
  actionName = "view audit logs",
  showToast = false,
  redirectOnDeny = false,
}: Omit<PermissionGateProps, "permission">) {
  return (
    <PermissionGate
      permission="audit.view"
      {...(organisationId ? { organisationId: organisationId as string } : {})}
      {...(typeof hide === "boolean" ? { hide } : {})}
      {...(typeof disabled === "boolean" ? { disabled } : {})}
      {...(fallback ? { fallback } : {})}
      {...(disabledText ? { disabledText } : {})}
      {...(actionName ? { actionName } : {})}
      {...(showToast ? { showToast } : {})}
      {...(redirectOnDeny ? { redirectOnDeny } : {})}
    >
      {children}
    </PermissionGate>
  );
}
