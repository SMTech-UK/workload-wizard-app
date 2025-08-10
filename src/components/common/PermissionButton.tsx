import { ReactNode, forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { usePermissionManager } from "@/hooks/usePermissionManager";
import { type PermissionId } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface PermissionButtonProps extends Omit<ButtonProps, "disabled"> {
  permission: PermissionId;
  organisationId?: string;
  isSystemAction?: boolean;
  actionName?: string;
  fallback?: ReactNode;
  hideForbidden?: boolean;
  disabledText?: string;
  showToast?: boolean;
  redirectOnDeny?: boolean;
  children: ReactNode;
}

export const PermissionButton = forwardRef<
  HTMLButtonElement,
  PermissionButtonProps
>(
  (
    {
      permission,
      organisationId,
      isSystemAction = false,
      actionName,
      fallback = null,
      hideForbidden = false,
      disabledText = "Insufficient permissions",
      showToast = true,
      redirectOnDeny = false,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const { gateButton, canPerform } = usePermissionManager(organisationId);

    // Gate the button state
    const buttonState = gateButton(permission, {
      organisationId,
      isSystemAction,
      disabledText,
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

    return (
      <Button
        ref={ref}
        disabled={buttonState.disabled}
        title={buttonState.disabledText}
        className={cn(
          buttonState.disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
        {...props}
      >
        {children}
      </Button>
    );
  },
);

PermissionButton.displayName = "PermissionButton";

// Convenience components for common permission checks
export const UsersViewButton = forwardRef<
  HTMLButtonElement,
  Omit<PermissionButtonProps, "permission">
>((props, ref) => (
  <PermissionButton
    ref={ref}
    permission="users.view"
    actionName="view users"
    {...props}
  />
));

export const UsersCreateButton = forwardRef<
  HTMLButtonElement,
  Omit<PermissionButtonProps, "permission">
>((props, ref) => (
  <PermissionButton
    ref={ref}
    permission="users.create"
    actionName="create users"
    {...props}
  />
));

export const UsersEditButton = forwardRef<
  HTMLButtonElement,
  Omit<PermissionButtonProps, "permission">
>((props, ref) => (
  <PermissionButton
    ref={ref}
    permission="users.edit"
    actionName="edit users"
    {...props}
  />
));

export const UsersDeleteButton = forwardRef<
  HTMLButtonElement,
  Omit<PermissionButtonProps, "permission">
>((props, ref) => (
  <PermissionButton
    ref={ref}
    permission="users.delete"
    actionName="delete users"
    {...props}
  />
));

export const PermissionsManageButton = forwardRef<
  HTMLButtonElement,
  Omit<PermissionButtonProps, "permission">
>((props, ref) => (
  <PermissionButton
    ref={ref}
    permission="permissions.manage"
    actionName="manage permissions"
    {...props}
  />
));

export const FlagsManageButton = forwardRef<
  HTMLButtonElement,
  Omit<PermissionButtonProps, "permission">
>((props, ref) => (
  <PermissionButton
    ref={ref}
    permission="flags.manage"
    actionName="manage feature flags"
    {...props}
  />
));

export const OrganisationsManageButton = forwardRef<
  HTMLButtonElement,
  Omit<PermissionButtonProps, "permission">
>((props, ref) => (
  <PermissionButton
    ref={ref}
    permission="organisations.manage"
    isSystemAction={true}
    actionName="manage organisations"
    {...props}
  />
));

export const AuditViewButton = forwardRef<
  HTMLButtonElement,
  Omit<PermissionButtonProps, "permission">
>((props, ref) => (
  <PermissionButton
    ref={ref}
    permission="audit.view"
    actionName="view audit logs"
    {...props}
  />
));

// Set display names for convenience components
UsersViewButton.displayName = "UsersViewButton";
UsersCreateButton.displayName = "UsersCreateButton";
UsersEditButton.displayName = "UsersEditButton";
UsersDeleteButton.displayName = "UsersDeleteButton";
PermissionsManageButton.displayName = "PermissionsManageButton";
FlagsManageButton.displayName = "FlagsManageButton";
OrganisationsManageButton.displayName = "OrganisationsManageButton";
AuditViewButton.displayName = "AuditViewButton";
