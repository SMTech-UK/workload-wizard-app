'use server';

import { currentUser } from '@clerk/nextjs/server';

export async function getCurrentUserDetails() {
  const user = await currentUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    fullName: user.firstName + ' ' + user.lastName,
    organisationId: user.publicMetadata?.organisationId as string | undefined,
    role: user.publicMetadata?.role as string | undefined,
  };
}

export function hasSystemAdminAccess(userRole?: string): boolean {
  return userRole === 'sysadmin' || userRole === 'developer';
}

export function hasOrgAdminAccess(userRole?: string): boolean {
  return userRole === 'orgadmin';
}

export function hasAdminAccess(userRole?: string): boolean {
  return userRole === 'orgadmin' || userRole === 'sysadmin' || userRole === 'developer';
}
