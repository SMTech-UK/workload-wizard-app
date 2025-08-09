/**
 * Permission utility functions
 * These are pure functions that don't need to be server actions
 */

export function hasSystemAdminAccess(userRole?: string): boolean {
  return userRole === "sysadmin" || userRole === "developer";
}

export function hasOrgAdminAccess(userRole?: string): boolean {
  return userRole === "orgadmin";
}

export function hasAdminAccess(userRole?: string): boolean {
  return (
    userRole === "orgadmin" ||
    userRole === "sysadmin" ||
    userRole === "developer"
  );
}
