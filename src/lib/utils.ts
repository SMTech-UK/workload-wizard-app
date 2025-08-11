import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ZodError } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type PublicMetadata = { role?: string; roles?: string[] } & Record<
  string,
  unknown
>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Get user roles from Clerk metadata, supporting both single role and multiple roles
 */
export function getUserRoles(user: unknown): string[] {
  if (!isObject(user)) return [];
  const publicMetadata = user.publicMetadata as PublicMetadata | undefined;
  if (!publicMetadata) return [];

  if (Array.isArray(publicMetadata.roles)) {
    return publicMetadata.roles;
  }

  if (
    typeof publicMetadata.role === "string" &&
    publicMetadata.role.length > 0
  ) {
    return [publicMetadata.role];
  }

  return [];
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: unknown, roles: string[]): boolean {
  const userRoles = getUserRoles(user);
  return userRoles.some((role) => roles.includes(role));
}

/**
 * Check if user has all of the specified roles
 */
export function hasAllRoles(user: unknown, roles: string[]): boolean {
  const userRoles = getUserRoles(user);
  return roles.every((role) => userRoles.includes(role));
}

// Mutation helper: wraps async actions with success/error toasts
export async function withToast<T>(
  action: () => Promise<T>,
  options: {
    success?: { title: string; description?: string };
    error: { title: string; description?: string };
  },
  toast: (opts: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive" | "success";
  }) => any,
): Promise<T> {
  try {
    const result = await action();
    if (options.success) {
      toast({ ...options.success, variant: "success" });
    }
    return result;
  } catch (e) {
    const desc =
      errorMessageFromUnknown(e) ?? options.error.description ?? undefined;
    toast({
      title: options.error.title,
      ...(desc ? { description: desc } : {}),
      variant: "destructive",
    });
    throw e;
  }
}

export function isZodError(error: unknown): error is ZodError {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in (error as any) &&
    Array.isArray((error as any).issues)
  );
}

export function formatZodError(error: ZodError): string {
  const first = error.issues?.[0];
  if (!first) return "Validation failed";
  const path = first.path?.length ? String(first.path.join(".")) + ": " : "";
  return path + (first.message || "Invalid value");
}

export function errorMessageFromUnknown(error: unknown): string | undefined {
  if (isZodError(error)) return formatZodError(error);
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return undefined;
  }
}

export function toastError(
  toast: (opts: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive" | "success";
  }) => any,
  error: unknown,
  title: string = "Error",
): void {
  const desc = errorMessageFromUnknown(error);
  toast({
    title,
    ...(desc ? { description: desc } : {}),
    variant: "destructive",
  });
}
