import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get user roles from Clerk metadata, supporting both single role and multiple roles
 */
export function getUserRoles(user: any): string[] {
  if (!user?.publicMetadata) return [];
  
  // Check for multiple roles first (new format)
  if (user.publicMetadata.roles && Array.isArray(user.publicMetadata.roles)) {
    return user.publicMetadata.roles;
  }
  
  // Fallback to single role (old format)
  if (user.publicMetadata.role) {
    return [user.publicMetadata.role];
  }
  
  return [];
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: any, roles: string[]): boolean {
  const userRoles = getUserRoles(user);
  return userRoles.some(role => roles.includes(role));
}

/**
 * Check if user has all of the specified roles
 */
export function hasAllRoles(user: any, roles: string[]): boolean {
  const userRoles = getUserRoles(user);
  return roles.every(role => userRoles.includes(role));
}


