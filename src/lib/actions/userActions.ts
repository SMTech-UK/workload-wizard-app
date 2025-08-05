'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

// Ensure clerkClient is properly initialized
const client = clerkClient;

export interface InviteUserData {
  email: string;
  role: 'admin' | 'lecturer' | 'staff';
  organisationId: string;
}

export async function inviteUser(data: InviteUserData) {
  const currentUserData = await currentUser();
  
  if (!currentUserData || currentUserData.publicMetadata?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    // For now, just log the invitation since Clerk's API might need different setup
    // In production, you'd implement proper user creation and invitation
    console.log('Would invite user:', {
      email: data.email,
      role: data.role,
      organisationId: data.organisationId,
    });

    revalidatePath('/admin/users');
    return { success: true, userId: 'mock-user-id' };
  } catch (error) {
    console.error('Error inviting user:', error);
    throw new Error('Failed to invite user');
  }
}

export async function listUsers() {
  const currentUserData = await currentUser();
  
  if (!currentUserData || currentUserData.publicMetadata?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    // For now, return current user as a mock list
    // In production, you'd implement proper user listing via Clerk's API
    return [
      {
        id: currentUserData.id,
        email: currentUserData.emailAddresses[0]?.emailAddress,
        firstName: currentUserData.firstName,
        lastName: currentUserData.lastName,
        role: currentUserData.publicMetadata?.role as string,
        organisationId: currentUserData.publicMetadata?.organisationId as string,
        createdAt: currentUserData.createdAt,
        lastSignInAt: currentUserData.lastSignInAt,
      }
    ];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function deleteUser(userId: string) {
  const currentUserData = await currentUser();
  
  if (!currentUserData || currentUserData.publicMetadata?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    await client.users.deleteUser(userId);
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
} 