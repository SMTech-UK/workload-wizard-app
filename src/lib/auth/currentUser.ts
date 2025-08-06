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

/**
 * Gets current user and throws if they don't have an organisationId
 * Use this for actions that require organisation context
 */
export async function getUserOrgOrThrow() {
  const user = await currentUser();

  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  const organisationId = user.publicMetadata?.organisationId as string | undefined;
  
  if (!organisationId) {
    throw new Error('Unauthorized: User must be assigned to an organisation');
  }

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    organisationId,
    role: user.publicMetadata?.role as string | undefined,
  };
}

/**
 * Gets current user and throws if they don't have an organisationId
 * Also validates that the user's organisationId matches the provided organisationId
 * Use this for actions that require specific organisation access
 */
export async function getUserOrgOrThrowWithValidation(requiredOrganisationId: string) {
  const user = await getUserOrgOrThrow();
  
  if (user.organisationId !== requiredOrganisationId) {
    throw new Error('Unauthorized: Access denied to this organisation');
  }
  
  return user;
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
