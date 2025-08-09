import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { logRoleAssignedToUser, logRoleRevokedFromUser } from '@/lib/actions/auditActions';
import type { Id } from '../../../../convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Check if the current user is authenticated and has admin privileges
    const currentUserData = await currentUser();
    
    if (!currentUserData) {
      return NextResponse.json(
        { error: 'Unauthorized: User not authenticated' },
        { status: 401 }
      );
    }

    // Check if user has appropriate permissions
    const userRole = currentUserData.publicMetadata?.role as string;
    const userRoles = (currentUserData.publicMetadata?.roles as string[]) || [];
    const isAdmin = userRole === 'sysadmin' || userRole === 'developer' ||
      (userRoles && (userRoles.includes('sysadmin') || userRoles.includes('developer')));
    const isOrgAdmin = userRole === 'orgadmin' || userRoles.includes('orgadmin');
    
    if (!isAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const { userId, firstName, lastName, username, systemRoles, isActive, organisationId, organisationalRoleId, organisationalRoleIds } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Guardrail: orgadmin cannot assign or revoke system-level roles for sysadmin/developer users
    if (isOrgAdmin && Array.isArray(systemRoles)) {
      const targetUserPreview = await (await clerkClient()).users.getUser(userId);
      const targetRoles = (targetUserPreview.publicMetadata?.roles as string[]) || [];
      const targetIsSystem = targetRoles.includes('sysadmin') || targetRoles.includes('developer');
      const addingSystem = systemRoles.some((r: string) => r === 'sysadmin' || r === 'developer');
      if (targetIsSystem || addingSystem) {
        return NextResponse.json(
          { error: 'Unauthorized: Org admins cannot modify system roles or users with system roles' },
          { status: 403 }
        );
      }
    }

    // Initialize Clerk client
    const clerk = await clerkClient();

    // If orgadmin, ensure they can only update users in their own organisation
    if (isOrgAdmin) {
      const targetUser = await clerk.users.getUser(userId);
      const targetUserOrgId = targetUser.publicMetadata?.organisationId as string;
      const currentUserOrgId = currentUserData.publicMetadata?.organisationId as string;
      
      if (targetUserOrgId !== currentUserOrgId) {
        return NextResponse.json(
          { error: 'Unauthorized: Can only update users in your own organisation' },
          { status: 403 }
        );
      }
    }

    // Get existing user from Clerk to compare values
    let existingClerkUser;
    try {
      existingClerkUser = await clerk.users.getUser(userId);
    } catch (error) {
      const httpStatus = (error as { status?: number } | undefined)?.status
      if (httpStatus === 404) {
        console.warn(`User ${userId} not found in Clerk, skipping Clerk update`);
        existingClerkUser = null;
      } else {
        throw error;
      }
    }

    // Only update Clerk if user exists and values have changed
    if (existingClerkUser) {
      const clerkUpdates: Record<string, unknown> = {};
      
      // Only update if values are different
      if (firstName && firstName !== existingClerkUser.firstName) {
        clerkUpdates.firstName = firstName;
      }
      if (lastName && lastName !== existingClerkUser.lastName) {
        clerkUpdates.lastName = lastName;
      }
      if (username && username !== existingClerkUser.username) {
        clerkUpdates.username = username;
      }
      
      // Update public metadata if systemRoles or organisationId is different
      const needsMetadataUpdate = 
        (systemRoles && JSON.stringify(systemRoles) !== JSON.stringify(existingClerkUser.publicMetadata?.roles)) ||
        (organisationId && organisationId !== existingClerkUser.publicMetadata?.organisationId);
        
      if (needsMetadataUpdate) {
        const nextMeta: Record<string, unknown> = {
          ...(existingClerkUser.publicMetadata as Record<string, unknown>),
        };
        if (systemRoles) {
          nextMeta.roles = systemRoles;
        }
        if (organisationId) {
          nextMeta.organisationId = organisationId;
        }
        clerkUpdates.publicMetadata = nextMeta;
      }

      // Only make API call if there are actual changes
      if (Object.keys(clerkUpdates).length > 0) {
        console.log(`Updating Clerk user ${userId} with:`, Object.keys(clerkUpdates));
        await clerk.users.updateUser(userId, clerkUpdates);
      } else {
        console.log(`No Clerk updates needed for user ${userId}`);
      }
    }

    // Update user in Convex
    try {
      // Query Convex to find the target user by their subject (Clerk ID)
      const convexUser = await convex.query(api.users.getBySubject, { subject: userId });
      
      if (!convexUser) {
        console.error('User not found in Convex with subject:', userId);
        // Continue without failing since Clerk update succeeded
      } else {
        // Also get the current user's Convex ID for permissions
        const currentConvexUser = await convex.query(api.users.getBySubject, { subject: currentUserData.id });
        
        if (!currentConvexUser) {
          console.error('Current user not found in Convex with subject:', currentUserData.id);
          // Continue without failing since Clerk update succeeded
        } else {
          // Prepare Convex updates
          const previousSystemRoles: string[] = Array.isArray(convexUser.systemRoles) ? convexUser.systemRoles : [];
          const convexUpdates: Record<string, unknown> = {};
          if (firstName) convexUpdates.givenName = firstName;
          if (lastName) convexUpdates.familyName = lastName;
          if (username) convexUpdates.username = username;
          if (firstName || lastName) {
            convexUpdates.fullName = `${firstName || convexUser.givenName} ${lastName || convexUser.familyName}`;
          }
          if (systemRoles) convexUpdates.systemRoles = systemRoles;
          if (organisationId) convexUpdates.organisationId = organisationId;
          if (typeof isActive === 'boolean') convexUpdates.isActive = isActive;
          
          if (Object.keys(convexUpdates).length > 0) {
            await convex.mutation(api.users.update, {
              id: convexUser._id,
              currentUserId: currentUserData.id, // Pass Clerk subject ID
              ...convexUpdates,
            });
          }

          // Log system role changes
          if (Array.isArray(systemRoles)) {
            const added = systemRoles.filter((r: string) => !previousSystemRoles.includes(r));
            const removed = previousSystemRoles.filter((r: string) => !systemRoles.includes(r));
            const userLabel = convexUser.fullName || convexUser.email;
            for (const role of added) {
              await logRoleAssignedToUser(userId, userLabel, role, 'system');
            }
            for (const role of removed) {
              await logRoleRevokedFromUser(userId, userLabel, role, 'system');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating user in Convex:', error);
      // If Convex update fails, we'll continue since Clerk is the primary source
    }

    // Organisational role assignment change (optional)
    if (organisationalRoleIds && Array.isArray(organisationalRoleIds)) {
      try {
        const targetOrganisationId = organisationId || (currentUserData.publicMetadata?.organisationId as string);
        if (targetOrganisationId) {
          // Guardrail: orgadmin cannot assign roles in other organisations
          if (isOrgAdmin && targetOrganisationId !== (currentUserData.publicMetadata?.organisationId as string)) {
            return NextResponse.json(
              { error: 'Unauthorized: Cannot assign roles outside your organisation' },
              { status: 403 }
            );
          }
          // Assign multiple roles, merging RBAC
          await convex.mutation(api.organisationalRoles.assignMultipleToUser, {
            userId,
            roleIds: organisationalRoleIds as unknown as Id<'user_roles'>[],
            organisationId: targetOrganisationId as unknown as Id<'organisations'>,
            assignedBy: currentUserData.id,
          });
        }
      } catch (err) {
        console.warn('Organisational multi-role change failed:', err);
      }
    } else if (organisationalRoleId) {
      try {
        const targetOrganisationId = organisationId || (currentUserData.publicMetadata?.organisationId as string);
        if (targetOrganisationId) {
          // Guardrail: orgadmin cannot assign roles in other organisations
          if (isOrgAdmin && targetOrganisationId !== (currentUserData.publicMetadata?.organisationId as string)) {
            return NextResponse.json(
              { error: 'Unauthorized: Cannot assign roles outside your organisation' },
              { status: 403 }
            );
          }
          const existingAssignment = await convex.query(api.organisationalRoles.getUserRole, {
            userId,
            organisationId: targetOrganisationId as unknown as Id<'organisations'>,
          });

          await convex.mutation(api.organisationalRoles.assignToUser, {
            userId,
            roleId: organisationalRoleId as unknown as Id<'user_roles'>,
            organisationId: targetOrganisationId as unknown as Id<'organisations'>,
            assignedBy: currentUserData.id,
          });

          // Audit revoke + assign
          const convexUserAfter = await convex.query(api.users.getBySubject, { subject: userId });
          const userLabel = convexUserAfter?.fullName || convexUserAfter?.email;
          if (existingAssignment?.role?._id && existingAssignment.role.name && existingAssignment.role._id !== organisationalRoleId) {
            await logRoleRevokedFromUser(userId, userLabel, existingAssignment.role.name, 'organisation', {
              organisationId: targetOrganisationId,
              roleId: existingAssignment.role._id,
            });
          }
          try {
            const newRole = await convex.query(api.organisationalRoles.getById, { roleId: organisationalRoleId as unknown as Id<'user_roles'> });
            if (newRole?.name) {
              await logRoleAssignedToUser(userId, userLabel, newRole.name, 'organisation', {
                organisationId: targetOrganisationId,
                roleId: organisationalRoleId,
              });
            }
          } catch {}
        }
      } catch (err) {
        console.warn('Organisational role change failed:', err);
      }
    }

    return NextResponse.json(
      { message: 'User updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating user:', error);
    
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}