import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { type PermissionId } from "@/lib/permissions";

interface PermissionPageWrapperProps {
  children: ReactNode;
  permission: PermissionId;
  organisationId?: string;
  isSystemAction?: boolean;
  fallback?: ReactNode;
  redirectOnDenied?: boolean;
  showToastOnDenied?: boolean;
  loadingFallback?: ReactNode;
}

export function PermissionPageWrapper({
  children,
  permission,
  organisationId,
  isSystemAction = false,
  fallback = null,
  redirectOnDenied = true,
  showToastOnDenied = true,
  loadingFallback = null,
}: PermissionPageWrapperProps) {
  const permissions = usePermissions(organisationId as string | undefined);
  const router = useRouter();
  const { toast } = useToast();

  // Defer conditional returns until after hooks

  // Check permission
  const hasAccess = permissions.hasPermission(permission, isSystemAction);

  useEffect(() => {
    if (!hasAccess) {
      // Handle permission denied
      if (showToastOnDenied) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
      }

      // Redirect to unauthorised page if enabled
      if (redirectOnDenied) {
        router.push("/unauthorised");
      }
    }
  }, [hasAccess, showToastOnDenied, redirectOnDenied, router, toast]);

  const loadingOrFallback =
    !permissions.userRole && loadingFallback ? (
      <>{loadingFallback}</>
    ) : !hasAccess && !redirectOnDenied ? (
      <>{fallback}</>
    ) : !hasAccess && redirectOnDenied ? (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Redirecting...</p>
        </div>
      </div>
    ) : null;

  if (loadingOrFallback) return loadingOrFallback;

  // User has access, render children
  return <>{children}</>;
}

// Convenience wrappers for common page types
export function UsersPageWrapper({
  children,
  organisationId,
  ...props
}: Omit<PermissionPageWrapperProps, "permission">) {
  return (
    <PermissionPageWrapper
      permission="users.view"
      {...(organisationId ? { organisationId } : {})}
      {...props}
    >
      {children}
    </PermissionPageWrapper>
  );
}

export function AdminPageWrapper({
  children,
  organisationId,
  ...props
}: Omit<PermissionPageWrapperProps, "permission">) {
  return (
    <PermissionPageWrapper
      permission="permissions.manage"
      {...(organisationId ? { organisationId } : {})}
      {...props}
    >
      {children}
    </PermissionPageWrapper>
  );
}

export function SystemAdminPageWrapper({
  children,
  ...props
}: Omit<PermissionPageWrapperProps, "permission" | "organisationId">) {
  return (
    <PermissionPageWrapper
      permission="permissions.manage"
      isSystemAction={true}
      {...props}
    >
      {children}
    </PermissionPageWrapper>
  );
}
