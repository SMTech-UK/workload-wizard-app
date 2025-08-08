import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type PublicMetadata = { role?: string; roles?: string[] } & Record<string, unknown>

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Get user roles from Clerk metadata, supporting both single role and multiple roles
 */
export function getUserRoles(user: unknown): string[] {
  if (!isObject(user)) return []
  const publicMetadata = user.publicMetadata as PublicMetadata | undefined
  if (!publicMetadata) return []

  if (Array.isArray(publicMetadata.roles)) {
    return publicMetadata.roles
  }

  if (typeof publicMetadata.role === 'string' && publicMetadata.role.length > 0) {
    return [publicMetadata.role]
  }

  return []
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: unknown, roles: string[]): boolean {
  const userRoles = getUserRoles(user)
  return userRoles.some(role => roles.includes(role))
}

/**
 * Check if user has all of the specified roles
 */
export function hasAllRoles(user: unknown, roles: string[]): boolean {
  const userRoles = getUserRoles(user)
  return roles.every(role => userRoles.includes(role))
}


