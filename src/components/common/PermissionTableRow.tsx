import React, { ReactNode, forwardRef } from "react";
import { usePermissionManager } from "@/hooks/usePermissionManager";
import { type PermissionId } from "@/lib/permissions";
import { cn } from "@/components/ui/table";

interface PermissionTableRowProps {
  permission: PermissionId;
  organisationId?: string;
  isSystemAction?: boolean;
  actionName?: string;
  showToast?: boolean;
  redirectOnDeny?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  hideForbidden?: boolean;
  className?: string;
}

export const PermissionTableRow = forwardRef<
  HTMLTableRowElement,
  PermissionTableRowProps
>(
  (
    {
      permission,
      organisationId,
      isSystemAction = false,
      actionName,
      showToast = false,
      redirectOnDeny = false,
      children,
      fallback = null,
      hideForbidden = false,
      className,
    },
    ref,
  ) => {
    const { gateRow, canPerform } = usePermissionManager(organisationId);

    // Gate the row state
    const rowState = gateRow(permission, {
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

    return (
      <tr ref={ref} className={cn(rowState.rowClassName, className)}>
        {children}
      </tr>
    );
  },
);

PermissionTableRow.displayName = "PermissionTableRow";

// Permission-aware table cell components
interface PermissionTableCellProps {
  permission: PermissionId;
  organisationId?: string;
  isSystemAction?: boolean;
  actionName?: string;
  showToast?: boolean;
  redirectOnDeny?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  hideForbidden?: boolean;
  className?: string;
  as?: "td" | "th";
}

export const PermissionTableCell = forwardRef<
  HTMLTableCellElement,
  PermissionTableCellProps
>(
  (
    {
      permission,
      organisationId,
      isSystemAction = false,
      actionName,
      showToast = false,
      redirectOnDeny = false,
      children,
      fallback = null,
      hideForbidden = false,
      className,
      as: Component = "td",
    },
    ref,
  ) => {
    const { gateRow, canPerform } = usePermissionManager(organisationId);

    const rowState = gateRow(permission, {
      organisationId,
      isSystemAction,
      actionName,
      showToast,
      redirectOnDeny,
    });

    const hasAccess = canPerform(permission, {
      organisationId,
      isSystemAction,
    });

    if (hideForbidden && !hasAccess) {
      return fallback ? <>{fallback}</> : null;
    }

    if (!hasAccess && !fallback) {
      return null;
    }

    if (!hasAccess && fallback) {
      return <>{fallback}</>;
    }

    return (
      <Component ref={ref} className={cn(rowState.rowClassName, className)}>
        {children}
      </Component>
    );
  },
);

PermissionTableCell.displayName = "PermissionTableCell";

// Convenience components for common permissions
export const UsersViewRow = forwardRef<
  HTMLTableRowElement,
  Omit<PermissionTableRowProps, "permission">
>((props, ref) => (
  <PermissionTableRow
    ref={ref}
    permission="users.view"
    actionName="view users"
    {...props}
  />
));

export const UsersEditRow = forwardRef<
  HTMLTableRowElement,
  Omit<PermissionTableRowProps, "permission">
>((props, ref) => (
  <PermissionTableRow
    ref={ref}
    permission="users.edit"
    actionName="edit users"
    {...props}
  />
));

export const UsersDeleteRow = forwardRef<
  HTMLTableRowElement,
  Omit<PermissionTableRowProps, "permission">
>((props, ref) => (
  <PermissionTableRow
    ref={ref}
    permission="users.delete"
    actionName="delete users"
    {...props}
  />
));

// Set display names
UsersViewRow.displayName = "UsersViewRow";
UsersEditRow.displayName = "UsersEditRow";
UsersDeleteRow.displayName = "UsersDeleteRow";
