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
