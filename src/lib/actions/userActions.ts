'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';
// Removed unused imports
import { revalidatePath } from 'next/cache';
import { api } from '../../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { logUserCreated, logUserDeleted, logUserUpdated, logUserDeactivated, logUserReactivated, logUserPasswordReset, logUserEmailUpdated } from './auditActions';
import { sendUserInvitationEmail } from '../services/emailService';

// Initialize Convex client for server actions
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  roles: string[]; // Array of system roles
  organisationId?: string;
  sendEmailInvitation?: boolean;
  organisationalRoleId?: string;
  organisationalRoleIds?: string[];
}

export async function createUser(data: CreateUserData) {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Check if user has appropriate permissions
  const userRole = currentUserData.publicMetadata?.role as string;
  const userRoles = currentUserData.publicMetadata?.roles as string[];
  const isAdmin = userRole === 'sysadmin' || userRole === 'developer' || 
                 (userRoles && (userRoles.includes('sysadmin') || userRoles.includes('developer')));
  const isOrgAdmin = userRole === 'orgadmin' || 
                    (userRoles && userRoles.includes('orgadmin'));
  
  if (!isAdmin && !isOrgAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  // If orgadmin, ensure they can only create users in their own organisation
  if (isOrgAdmin && currentUserData.publicMetadata?.organisationId !== data.organisationId) {
    throw new Error('Unauthorized: Can only create users in your own organisation');
  }

  // Ensure user has an organisationId (for orgadmins)
  if (isOrgAdmin && !currentUserData.publicMetadata?.organisationId) {
    throw new Error('Unauthorized: User must be assigned to an organisation');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new Error('Invalid email format');
  }

  try {
    // Use provided organisationId or get the first organisation as default
    let organisationId: string | undefined = data.organisationId;
    if (!organisationId) {
      const organisations = await convex.query(api.organisations.list);
      if (organisations.length === 0) {
        throw new Error('No organisations found in Convex. Please create an organisation first.');
      }
      organisationId = organisations[0]._id as unknown as string;
    }

    // Check if user already exists in Clerk
    
    try {
      const existingUsers = await clerkClient.users.getUserList({
        emailAddress: [data.email],
      });
      
      if (existingUsers.data.length > 0) {
        const existingUser = existingUsers.data[0];
        
        // Check if user exists in Convex
        const existingConvexUser = await convex.query(api.users.getBySubject, { subject: existingUser.id });
        
        if (!existingConvexUser) {
          // User exists in Clerk but not in Convex - create in Convex
          const primaryEmail = existingUser.emailAddresses.find(
            email => email.id === existingUser.primaryEmailAddressId
          );
          
          if (primaryEmail) {
            // Update Clerk user with organisationId if not already set
            if (!existingUser.publicMetadata?.organisationId) {
              await clerkClient.users.updateUser(existingUser.id, {
                publicMetadata: {
                  ...existingUser.publicMetadata,
                  organisationId: organisationId,
                },
              });
            }
            
            await convex.mutation(api.users.create, {
              email: primaryEmail.emailAddress,
              username: existingUser.username || '',
              givenName: existingUser.firstName || '',
              familyName: existingUser.lastName || '',
              fullName: `${existingUser.firstName || ''} ${existingUser.lastName || ''}`.trim(),
              systemRoles: data.roles,
              organisationId: organisationId as unknown as string,
              pictureUrl: existingUser.imageUrl,
              subject: existingUser.id,
              tokenIdentifier: primaryEmail.id,
            });
          }
        }
        
        revalidatePath('/admin/users');
        return { success: true, userId: existingUser.id, message: 'User already existed in Clerk' };
      }
    } catch {
      // Continue with user creation if search fails
    }

    // Generate password if not provided
    const password = data.password || Math.random().toString(36).substring(2, 15) + '!1';
    
    // Create new user in Clerk
    const clerkUser = await clerkClient.users.createUser({
      emailAddress: [data.email],
      username: data.username,
      password: password,
      firstName: data.firstName,
      lastName: data.lastName,
      publicMetadata: {
        roles: data.roles,
        organisationId: organisationId,
      },
    });

    // Get the primary email address
    const primaryEmail = clerkUser.emailAddresses.find(
      email => email.id === clerkUser.primaryEmailAddressId
    );

    if (!primaryEmail) {
      throw new Error('Failed to get primary email address');
    }

    // Create user in Convex
    await convex.mutation(api.users.create, {
      email: primaryEmail.emailAddress,
      username: data.username || '',
      givenName: data.firstName,
      familyName: data.lastName,
      fullName: `${data.firstName} ${data.lastName}`,
      systemRoles: data.roles,
      organisationId: organisationId as unknown as string,
      pictureUrl: clerkUser.imageUrl,
      subject: clerkUser.id,
      tokenIdentifier: primaryEmail.id,
    });

    // Send email invitation with temporary password if requested
    let emailSent = false;
    if (data.sendEmailInvitation !== false) {
      try {
        const emailResult = await sendUserInvitationEmail({
          to: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          username: data.username,
          temporaryPassword: password,
          signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 'https://workload-wiz.xyz/sign-in',
          adminName: currentUserData.firstName && currentUserData.lastName 
            ? `${currentUserData.firstName} ${currentUserData.lastName}` 
            : currentUserData.emailAddresses[0]?.emailAddress,
        });
        
        emailSent = emailResult.success;
        
        if (!emailResult.success) {
          console.warn('Failed to send invitation email:', emailResult.error);
        }
      } catch (emailError) {
        console.warn('Failed to send invitation email:', emailError);
        // Don't fail the user creation if email fails
      }
    }

    // Assign organisational roles if provided (multi or single)
    if (data.organisationalRoleIds && data.organisationalRoleIds.length > 0) {
      try {
        await convex.mutation(api.organisationalRoles.assignMultipleToUser, {
          userId: clerkUser.id,
          roleIds: data.organisationalRoleIds as unknown as string[],
          organisationId: organisationId as unknown as string,
          assignedBy: currentUserData.id,
        });
      } catch (roleError) {
        console.warn('Failed to assign organisational roles:', roleError);
      }
    } else if (data.organisationalRoleId) {
      try {
        await convex.mutation(api.organisationalRoles.assignToUser, {
          userId: clerkUser.id,
          roleId: data.organisationalRoleId as unknown as string,
          organisationId: organisationId as unknown as string,
          assignedBy: currentUserData.id,
        });
      } catch (roleError) {
        console.warn('Failed to assign organisational role:', roleError);
        // Don't fail the user creation if role assignment fails
      }
    }

    // Log the user creation
    await logUserCreated(
      clerkUser.id,
      primaryEmail.emailAddress,
      `User created with role: ${data.role}, organisation: ${organisationId}, organisational role: ${data.organisationalRoleId || 'none'}, email invitation: ${emailSent ? 'sent via Resend' : 'not sent'}`
    );

    revalidatePath('/admin/users');
    return { 
      success: true, 
      userId: clerkUser.id,
      message: emailSent 
        ? 'User created and invitation email sent with temporary password' 
        : 'User created with temporary password (email not sent)',
      emailSent,
      temporaryPassword: data.sendEmailInvitation === false ? password : undefined,
    };
  } catch (error) {
    console.error('Error inviting user:', error);
    throw new Error(`Failed to invite user: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function listUsers() {
  const currentUserData = await currentUser();
  
  // Check for multiple roles first (new format)
  const currentUserRoles: string[] = [];
  if (currentUserData?.publicMetadata?.roles && Array.isArray(currentUserData.publicMetadata.roles)) {
    currentUserRoles.push(...currentUserData.publicMetadata.roles);
  } else if (currentUserData?.publicMetadata?.role) {
    currentUserRoles.push(currentUserData.publicMetadata.role as string);
  }
  
  // Check if this is a dev login session (server-side check)
  const isDevLoginSession = currentUserData?.publicMetadata?.devLoginSession === true;
  
  if (!currentUserData || (!currentUserRoles.some(role => role === 'sysadmin' || role === 'developer') && !isDevLoginSession)) {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    // Get users from Convex
    const convexUsers = await convex.query(api.users.list);
    
    // Transform to match the expected interface
    return convexUsers.map(user => ({
      id: user.subject, // Use Clerk user ID as the ID
      subject: user.subject, // Include subject for password reset and email updates
      email: user.email,
      username: user.username,
      firstName: user.givenName,
      lastName: user.familyName,
      roles: user.systemRoles,
      organisationId: user.organisationId,
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt || null,
      isActive: user.isActive,
      organisation: user.organisation,
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function deleteUser(userId: string) {
  const currentUserData = await currentUser();
  
  // Check for multiple roles first (new format)
  const currentUserRoles: string[] = [];
  if (currentUserData?.publicMetadata?.roles && Array.isArray(currentUserData.publicMetadata.roles)) {
    currentUserRoles.push(...currentUserData.publicMetadata.roles);
  } else if (currentUserData?.publicMetadata?.role) {
    currentUserRoles.push(currentUserData.publicMetadata.role as string);
  }
  
  // Check if this is a dev login session (server-side check)
  const isDevLoginSession = currentUserData?.publicMetadata?.devLoginSession === true;
  
  if (!currentUserData || (!currentUserRoles.some(role => role === 'sysadmin' || role === 'developer') && !isDevLoginSession)) {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    // Get user details before deletion for audit logging
    let userEmail = 'unknown';
    let userExistsInClerk = true;
    
    try {
      const user = await clerkClient.users.getUser(userId);
      const primaryEmail = user.emailAddresses.find(
        email => email.id === user.primaryEmailAddressId
      );
      userEmail = primaryEmail?.emailAddress || 'unknown';
    } catch (userError) {
      console.warn('Could not get user details for audit log:', userError);
      const httpStatus = (userError as { status?: number } | undefined)?.status
      if (httpStatus === 404) {
        userExistsInClerk = false;
        console.log(`User ${userId} not found in Clerk, will skip Clerk deletion`);
      }
    }

    // Delete from Convex (always required)
    const convexDeletePromise = convex.mutation(api.users.hardDelete, { userId });
    
    // Delete from Clerk only if user exists there
    const promises = [convexDeletePromise];
    if (userExistsInClerk) {
      const clerkDeletePromise = clerkClient.users.deleteUser(userId).catch((error) => {
        const httpStatus = (error as { status?: number } | undefined)?.status
        if (httpStatus === 404) {
          console.log(`User ${userId} not found in Clerk during deletion, skipping`);
          return; // Don't throw, just skip
        }
        throw error; // Re-throw other errors
      });
      promises.push(clerkDeletePromise);
    } else {
      console.log(`Skipping Clerk deletion for user ${userId} - user not found in Clerk`);
    }
    
    // Wait for all operations to complete
    await Promise.all(promises);
    
    // Log the user deletion
    await logUserDeleted(userId, userEmail, `User deleted by admin: ${currentUserData.emailAddresses[0]?.emailAddress}${userExistsInClerk ? '' : ' (Clerk: not found)'}`);
    
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}

export async function updateUser(userId: string, updates: {
  email?: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  organisationId?: string;
  isActive?: boolean;
  password?: string;
  organisationalRoleId?: string;
}) {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Check if user has appropriate permissions
  const userRole = currentUserData.publicMetadata?.role as string;
  const userRoles = currentUserData.publicMetadata?.roles as string[];
  const isAdmin = userRole === 'sysadmin' || userRole === 'developer' || 
                 (userRoles && (userRoles.includes('sysadmin') || userRoles.includes('developer')));
  const isOrgAdmin = userRole === 'orgadmin' || 
                    (userRoles && userRoles.includes('orgadmin'));
  
  if (!isAdmin && !isOrgAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }

  // If orgadmin, ensure they can only update users in their own organisation
  if (isOrgAdmin) {
    // Ensure orgadmin has an organisationId
    if (!currentUserData.publicMetadata?.organisationId) {
      throw new Error('Unauthorized: User must be assigned to an organisation');
    }

    // Get the user being updated to check their organisation
    try {
      const userToUpdate = await clerkClient.users.getUser(userId);
      const userOrgId = userToUpdate.publicMetadata?.organisationId as string;
      const currentUserOrgId = currentUserData.publicMetadata?.organisationId as string;
      
      if (userOrgId !== currentUserOrgId) {
        throw new Error('Unauthorized: Can only update users in your own organisation');
      }
    } catch {
      throw new Error('Unauthorized: Cannot access user information');
    }
  }

  try {
    // Get user details before update for audit logging
    let userEmail = 'unknown';
    let currentUserData = null;
    
    try {
      const user = await clerkClient.users.getUser(userId);
      const primaryEmail = user.emailAddresses.find(
        email => email.id === user.primaryEmailAddressId
      );
      userEmail = primaryEmail?.emailAddress || 'unknown';
      currentUserData = user;
    } catch (userError) {
      console.warn('Could not get user details for audit log:', userError);
    }

    // Prepare Clerk update data
    const clerkUpdateData: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      firstName: updates.firstName,
      lastName: updates.lastName,
      publicMetadata: {
        role: updates.role,
        organisationId: updates.organisationId,
      },
    };

    // Handle password update if provided
    if (updates.password) {
      clerkUpdateData.password = updates.password;
    }

    // Update in Clerk
    await clerkClient.users.updateUser(userId, clerkUpdateData);
    
    // Update in Convex
    await convex.mutation(api.users.update, {
      userId,
      email: updates.email,
      givenName: updates.firstName,
      familyName: updates.lastName,
      fullName: updates.firstName && updates.lastName ? `${updates.firstName} ${updates.lastName}` : undefined,
              systemRoles: updates.roles || [updates.role],
      organisationId: updates.organisationId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      isActive: updates.isActive,
    });
    
    // Create detailed audit message
    const changeDetails = [];
    if (updates.firstName !== undefined) changeDetails.push(`first name: ${updates.firstName}`);
    if (updates.lastName !== undefined) changeDetails.push(`last name: ${updates.lastName}`);
    if (updates.email !== undefined) changeDetails.push(`email: ${updates.email}`);
    if (updates.role !== undefined) changeDetails.push(`role: ${updates.role}`);
    if (updates.organisationId !== undefined) changeDetails.push(`organisation: ${updates.organisationId}`);
    if (updates.isActive !== undefined) changeDetails.push(`status: ${updates.isActive ? 'active' : 'inactive'}`);
    if (updates.password !== undefined) changeDetails.push('password: changed');

    const auditMessage = `User updated by admin: ${currentUserData?.emailAddresses[0]?.emailAddress || 'unknown'}. Changes: ${changeDetails.join(', ')}`;

    // Update organisational role if provided
    if (updates.organisationalRoleId && currentUserData) {
      try {
        const targetOrganisationId = updates.organisationId || currentUserData.publicMetadata?.organisationId as string;
        if (targetOrganisationId) {
          await convex.mutation(api.organisationalRoles.assignToUser, {
            userId: userId,
            roleId: updates.organisationalRoleId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            organisationId: targetOrganisationId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            assignedBy: currentUserData.id,
          });
        }
      } catch (roleError) {
        console.warn('Failed to update organisational role:', roleError);
        // Don't fail the user update if role assignment fails
      }
    }

    // Log the user update
    await logUserUpdated(
      userId, 
      userEmail, 
      updates, 
      auditMessage
    );
    
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
} 

export async function getUsersByOrganisationId(organisationId: string) {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Check if user has access to this organisation
  const currentUserRoles: string[] = [];
  if (currentUserData.publicMetadata?.roles && Array.isArray(currentUserData.publicMetadata.roles)) {
    currentUserRoles.push(...currentUserData.publicMetadata.roles);
  } else if (currentUserData.publicMetadata?.role) {
    currentUserRoles.push(currentUserData.publicMetadata.role as string);
  }
  
  if (!currentUserRoles.some(role => role === 'sysadmin' || role === 'developer') &&
      currentUserData.publicMetadata?.organisationId !== organisationId) {
    throw new Error('Unauthorized: Access denied to this organisation');
  }

  // Ensure user has an organisationId (for orgadmins)
  if (currentUserData.publicMetadata?.role === 'orgadmin' && !currentUserData.publicMetadata?.organisationId) {
    throw new Error('Unauthorized: User must be assigned to an organisation');
  }

  try {
    // Get users from Convex filtered by organisation
    const convexUsers = await convex.query(api.users.listByOrganisation, { 
      organisationId: organisationId as any // eslint-disable-line @typescript-eslint/no-explicit-any
    });
    
    // Transform to match the expected interface and get organisational roles
    const usersWithRoles = await Promise.all(
      convexUsers.map(async (user) => {
        // Get user's organisational role
        let organisationalRole = null;
        try {
          const userRoleData = await convex.query(api.organisationalRoles.getUserRole, {
            userId: user.subject,
            organisationId: user.organisationId,
          });
          if (userRoleData?.role) {
            organisationalRole = {
              name: userRoleData.role.name,
              description: userRoleData.role.description,
            };
          }
        } catch (error) {
          console.warn('Failed to get organisational role for user:', user.subject, error);
        }

        return {
          id: user.subject, // Use Clerk user ID as the ID
          email: user.email,
          firstName: user.givenName,
          lastName: user.familyName,
          roles: user.systemRoles,
          organisationId: user.organisationId,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt || null,
          isActive: user.isActive,
          organisationalRole,
        };
      })
    );

    return usersWithRoles;
  } catch (error) {
    console.error('Error fetching users by organisation:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function deactivateUser(userId: string) {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Only orgadmin, sysadmin, and developer can deactivate users
  const currentUserRoles: string[] = [];
  if (currentUserData.publicMetadata?.roles && Array.isArray(currentUserData.publicMetadata.roles)) {
    currentUserRoles.push(...currentUserData.publicMetadata.roles);
  } else if (currentUserData.publicMetadata?.role) {
    currentUserRoles.push(currentUserData.publicMetadata.role as string);
  }
  
  if (!currentUserRoles.some(role => role === 'orgadmin' || role === 'sysadmin' || role === 'developer')) {
    throw new Error('Unauthorized: Admin access required');
  }

  // Ensure user has an organisationId (for orgadmins)
  if (currentUserRoles.includes('orgadmin') && !currentUserData.publicMetadata?.organisationId) {
    throw new Error('Unauthorized: User must be assigned to an organisation');
  }

  try {
    // Get user details before deactivation for audit logging
    let userEmail = 'unknown';
    let userRole = 'unknown';
    
    try {
      const user = await clerkClient.users.getUser(userId);
      const primaryEmail = user.emailAddresses.find(
        email => email.id === user.primaryEmailAddressId
      );
      userEmail = primaryEmail?.emailAddress || 'unknown';
      userRole = (user.publicMetadata?.role as string) || 'unknown';
      
      // Prevent deactivating orgadmin or sysadmin users
      if (userRole === 'orgadmin' || userRole === 'sysadmin') {
        throw new Error('Cannot deactivate organisation admin or system admin users');
      }
    } catch (userError) {
      console.warn('Could not get user details for audit log:', userError);
      if (userError instanceof Error && userError.message.includes('Cannot deactivate')) {
        throw userError;
      }
    }

    // Deactivate in Convex (soft delete)
    await convex.mutation(api.users.remove, { userId });
    
    // Log the user deactivation
    await logUserDeactivated(
      userId, 
      userEmail, 
      `User deactivated by ${currentUserData.publicMetadata?.role}: ${currentUserData.emailAddresses[0]?.emailAddress}`
    );
    
    revalidatePath('/organisation/users');
    return { success: true };
  } catch (error) {
    console.error('Error deactivating user:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to deactivate user');
  }
}

export async function reactivateUser(userId: string) {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Only orgadmin, sysadmin, and developer can reactivate users
  const currentUserRoles: string[] = [];
  if (currentUserData.publicMetadata?.roles && Array.isArray(currentUserData.publicMetadata.roles)) {
    currentUserRoles.push(...currentUserData.publicMetadata.roles);
  } else if (currentUserData.publicMetadata?.role) {
    currentUserRoles.push(currentUserData.publicMetadata.role as string);
  }
  
  if (!currentUserRoles.some(role => role === 'orgadmin' || role === 'sysadmin' || role === 'developer')) {
    throw new Error('Unauthorized: Admin access required');
  }

  // Ensure user has an organisationId (for orgadmins)
  if (currentUserRoles.includes('orgadmin') && !currentUserData.publicMetadata?.organisationId) {
    throw new Error('Unauthorized: User must be assigned to an organisation');
  }

  try {
    // Get user details before reactivation for audit logging
    let userEmail = 'unknown';
    
    try {
      const user = await clerkClient.users.getUser(userId);
      const primaryEmail = user.emailAddresses.find(
        email => email.id === user.primaryEmailAddressId
      );
      userEmail = primaryEmail?.emailAddress || 'unknown';
    } catch (userError) {
      console.warn('Could not get user details for audit log:', userError);
    }

    // Reactivate in Convex (set isActive to true)
    await convex.mutation(api.users.update, { 
      userId,
      isActive: true 
    });
    
    // Log the user reactivation
    await logUserReactivated(
      userId, 
      userEmail, 
      `User reactivated by ${currentUserData.publicMetadata?.role}: ${currentUserData.emailAddresses[0]?.emailAddress}`
    );
    
    revalidatePath('/organisation/users');
    return { success: true };
  } catch (error) {
    console.error('Error reactivating user:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to reactivate user');
  }
}

export async function updateLastSignInForCurrentUser() {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  try {
    // Update last sign in time in Convex
    await convex.mutation(api.users.updateLastSignIn, {
      userId: currentUserData.id,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating last sign in time:', error);
    throw new Error('Failed to update last sign in time');
  }
}

export async function getUsersByOrganisationIdWithOverride(organisationId: string, overrideOrganisationId?: string) {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Check if user has admin privileges
  const isAdmin = currentUserData.publicMetadata?.role === 'sysadmin' || currentUserData.publicMetadata?.role === 'developer';
  
  // If not admin, check if user has access to this organisation
  if (!isAdmin && currentUserData.publicMetadata?.organisationId !== organisationId) {
    throw new Error('Unauthorized: Access denied to this organisation');
  }

  // Use override organisation ID if provided and user is admin
  const targetOrganisationId = (isAdmin && overrideOrganisationId) ? overrideOrganisationId : organisationId;

  try {
    // Get users from Convex filtered by organisation
    const convexUsers = await convex.query(api.users.listByOrganisation, { 
      organisationId: targetOrganisationId as any // eslint-disable-line @typescript-eslint/no-explicit-any
    });
    
    // Transform to match the expected interface and get organisational roles
    const usersWithRoles = await Promise.all(
      convexUsers.map(async (user) => {
        // Get user's organisational role
        let organisationalRole = null;
        try {
          const userRoleData = await convex.query(api.organisationalRoles.getUserRole, {
            userId: user.subject,
            organisationId: user.organisationId,
          });
          if (userRoleData?.role) {
            organisationalRole = {
              name: userRoleData.role.name,
              description: userRoleData.role.description,
            };
          }
        } catch (error) {
          console.warn('Failed to get organisational role for user:', user.subject, error);
        }

        return {
          id: user.subject, // Use Clerk user ID as the ID
          email: user.email,
          firstName: user.givenName,
          lastName: user.familyName,
          roles: user.systemRoles,
          organisationId: user.organisationId,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt || null,
          isActive: user.isActive,
          organisationalRole,
        };
      })
    );

    return usersWithRoles;
  } catch (error) {
    console.error('Error fetching users by organisation:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function getAllUsersByOrganisationIdWithOverride(organisationId: string, overrideOrganisationId?: string) {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Check if user has admin privileges
  const currentUserRoles: string[] = [];
  if (currentUserData.publicMetadata?.roles && Array.isArray(currentUserData.publicMetadata.roles)) {
    currentUserRoles.push(...currentUserData.publicMetadata.roles);
  } else if (currentUserData.publicMetadata?.role) {
    currentUserRoles.push(currentUserData.publicMetadata.role as string);
  }
  
  const isAdmin = currentUserRoles.some(role => role === 'sysadmin' || role === 'developer');
  
  // If not admin, check if user has access to this organisation
  if (!isAdmin && currentUserData.publicMetadata?.organisationId !== organisationId) {
    throw new Error('Unauthorized: Access denied to this organisation');
  }

  // Use override organisation ID if provided and user is admin
  const targetOrganisationId = (isAdmin && overrideOrganisationId) ? overrideOrganisationId : organisationId;

  try {
    // Get all users from Convex filtered by organisation (including inactive)
    const convexUsers = await convex.query(api.users.listAllByOrganisation, { 
      organisationId: targetOrganisationId as any // eslint-disable-line @typescript-eslint/no-explicit-any
    });
    
    // Transform to match the expected interface and get organisational roles
    const usersWithRoles = await Promise.all(
      convexUsers.map(async (user) => {
        // Get user's organisational role
        let organisationalRole = null;
        try {
          const userRoleData = await convex.query(api.organisationalRoles.getUserRole, {
            userId: user.subject,
            organisationId: user.organisationId,
          });
          if (userRoleData?.role) {
            organisationalRole = {
              name: userRoleData.role.name,
              description: userRoleData.role.description,
            };
          }
        } catch (error) {
          console.warn('Failed to get organisational role for user:', user.subject, error);
        }

        return {
          id: user.subject, // Use Clerk user ID as the ID
          email: user.email,
          firstName: user.givenName,
          lastName: user.familyName,
          roles: user.systemRoles,
          organisationId: user.organisationId,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt || null,
          isActive: user.isActive,
          organisationalRole,
        };
      })
    );

    return usersWithRoles;
  } catch (error) {
    console.error('Error fetching all users by organisation:', error);
    throw new Error('Failed to fetch users');
  }
}

export async function getAllOrganisations() {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Only sysadmin and developer can view all organisations
  const currentUserRoles: string[] = [];
  if (currentUserData.publicMetadata?.roles && Array.isArray(currentUserData.publicMetadata.roles)) {
    currentUserRoles.push(...currentUserData.publicMetadata.roles);
  } else if (currentUserData.publicMetadata?.role) {
    currentUserRoles.push(currentUserData.publicMetadata.role as string);
  }
  
  if (!currentUserRoles.some(role => role === 'sysadmin' || role === 'developer')) {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    // Get all organisations from Convex
    const organisations = await convex.query(api.organisations.list);
    
    return organisations.map(org => ({
      id: org._id,
      name: org.name,
      code: org.code,
    }));
  } catch (error) {
    console.error('Error fetching organisations:', error);
    throw new Error('Failed to fetch organisations');
  }
} 