import React, { ReactNode, forwardRef } from "react";
import { usePermissionManager } from "@/hooks/usePermissionManager";
import { type PermissionId } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

interface PermissionFieldProps {
  permission: PermissionId;
  organisationId?: string;
  isSystemAction?: boolean;
  actionName?: string;
  showToast?: boolean;
  redirectOnDeny?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  hideForbidden?: boolean;
}

export const PermissionField = forwardRef<HTMLDivElement, PermissionFieldProps>(
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
    },
    ref,
  ) => {
    const { gateField, canPerform } = usePermissionManager(organisationId);

    // Gate the field state
    const fieldState = gateField(permission, {
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

    // Clone children and apply permission state
    const enhancedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child, {
          disabled: fieldState.disabled,
          readOnly: fieldState.readonly,
          ...(fieldState.helperText && {
            "aria-describedby": `${permission}-helper`,
          }),
          ...child.props,
        });
      }
      return child;
    });

    return (
      <div ref={ref} className="space-y-2">
        {enhancedChildren}
        {fieldState.helperText && (
          <p
            id={`${permission}-helper`}
            className={cn(
              "text-sm",
              fieldState.errorMessage
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {fieldState.helperText}
          </p>
        )}
      </div>
    );
  },
);

PermissionField.displayName = "PermissionField";

// Permission-aware form components
interface PermissionInputProps extends React.ComponentProps<typeof Input> {
  permission: PermissionId;
  organisationId?: string;
  isSystemAction?: boolean;
  actionName?: string;
  showToast?: boolean;
  redirectOnDeny?: boolean;
  fallback?: ReactNode;
  hideForbidden?: boolean;
}

export const PermissionInput = forwardRef<
  HTMLInputElement,
  PermissionInputProps
>(
  (
    {
      permission,
      organisationId,
      isSystemAction = false,
      actionName,
      showToast = false,
      redirectOnDeny = false,
      fallback,
      hideForbidden,
      ...props
    },
    ref,
  ) => {
    const { gateField, canPerform } = usePermissionManager(organisationId);

    const fieldState = gateField(permission, {
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
      <div className="space-y-2">
        <Input
          ref={ref}
          disabled={fieldState.disabled}
          readOnly={fieldState.readonly}
          {...props}
        />
        {fieldState.helperText && (
          <p
            className={cn(
              "text-sm",
              fieldState.errorMessage
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {fieldState.helperText}
          </p>
        )}
      </div>
    );
  },
);

PermissionInput.displayName = "PermissionInput";

interface PermissionTextareaProps
  extends React.ComponentProps<typeof Textarea> {
  permission: PermissionId;
  organisationId?: string;
  isSystemAction?: boolean;
  actionName?: string;
  showToast?: boolean;
  redirectOnDeny?: boolean;
  fallback?: ReactNode;
  hideForbidden?: boolean;
}

export const PermissionTextarea = forwardRef<
  HTMLTextAreaElement,
  PermissionTextareaProps
>(
  (
    {
      permission,
      organisationId,
      isSystemAction = false,
      actionName,
      showToast = false,
      redirectOnDeny = false,
      fallback,
      hideForbidden,
      ...props
    },
    ref,
  ) => {
    const { gateField, canPerform } = usePermissionManager(organisationId);

    const fieldState = gateField(permission, {
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
      <div className="space-y-2">
        <Textarea
          ref={ref}
          disabled={fieldState.disabled}
          readOnly={fieldState.readonly}
          {...props}
        />
        {fieldState.helperText && (
          <p
            className={cn(
              "text-sm",
              fieldState.errorMessage
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {fieldState.helperText}
          </p>
        )}
      </div>
    );
  },
);

PermissionTextarea.displayName = "PermissionTextarea";

interface PermissionSelectProps extends React.ComponentProps<typeof Select> {
  permission: PermissionId;
  organisationId?: string;
  isSystemAction?: boolean;
  actionName?: string;
  showToast?: boolean;
  redirectOnDeny?: boolean;
  fallback?: ReactNode;
  hideForbidden?: boolean;
  children: ReactNode;
}

export const PermissionSelect = forwardRef<
  HTMLButtonElement,
  PermissionSelectProps
>(
  (
    {
      permission,
      organisationId,
      isSystemAction = false,
      actionName,
      showToast = false,
      redirectOnDeny = false,
      fallback,
      hideForbidden,
      children,
      ...props
    },
    ref,
  ) => {
    const { gateField, canPerform } = usePermissionManager(organisationId);

    const fieldState = gateField(permission, {
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
      <div className="space-y-2">
        <Select {...props} disabled={fieldState.disabled}>
          <SelectTrigger ref={ref}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{children}</SelectContent>
        </Select>
        {fieldState.helperText && (
          <p
            className={cn(
              "text-sm",
              fieldState.errorMessage
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {fieldState.helperText}
          </p>
        )}
      </div>
    );
  },
);

PermissionSelect.displayName = "PermissionSelect";

// Convenience components for common permissions
export const UsersViewField = forwardRef<
  HTMLDivElement,
  Omit<PermissionFieldProps, "permission">
>((props, ref) => (
  <PermissionField
    ref={ref}
    permission="users.view"
    actionName="view users"
    {...props}
  />
));

export const UsersCreateField = forwardRef<
  HTMLDivElement,
  Omit<PermissionFieldProps, "permission">
>((props, ref) => (
  <PermissionField
    ref={ref}
    permission="users.create"
    actionName="create users"
    {...props}
  />
));

export const UsersEditField = forwardRef<
  HTMLDivElement,
  Omit<PermissionFieldProps, "permission">
>((props, ref) => (
  <PermissionField
    ref={ref}
    permission="users.edit"
    actionName="edit users"
    {...props}
  />
));

// Set display names
UsersViewField.displayName = "UsersViewField";
UsersCreateField.displayName = "UsersCreateField";
UsersEditField.displayName = "UsersEditField";
