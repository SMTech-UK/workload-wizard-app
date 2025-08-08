'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { currentUser } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import { hasAdminAccess } from '@/lib/auth/permissions';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function syncUsernamesFromClerk() {
  const currentUserData = await currentUser();
  
  if (!currentUserData) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Check if user has admin role in Clerk metadata
  const userRole = currentUserData.publicMetadata?.role as string;
  const userRoles = currentUserData.publicMetadata?.roles as string[];
  
  if (!hasAdminAccess(userRole) && !(userRoles && (userRoles.includes('sysadmin') || userRoles.includes('developer')))) {
    throw new Error('Unauthorized: Admin access required');
  }

  try {
    // Get all users from Clerk
    const clerk = await clerkClient();
    let allClerkUsers: Array<{
      id: string;
      username?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      emailAddresses: Array<{ emailAddress: string }>;
    }> = [];
    let hasNextPage = true;
    let lastUserId: string | undefined = undefined;

    // Paginate through all Clerk users
    while (hasNextPage) {
      const clerkUsersResponse = await clerk.users.getUserList({
        limit: 100,
        ...(lastUserId && { lastUserId }),
      });
      
      allClerkUsers = allClerkUsers.concat(clerkUsersResponse.data);
      hasNextPage = clerkUsersResponse.totalCount > allClerkUsers.length;
      
      if ((clerkUsersResponse.data?.length || 0) > 0) {
        lastUserId = clerkUsersResponse.data![clerkUsersResponse.data!.length - 1]!.id;
      } else {
        hasNextPage = false;
      }
    }

    console.log(`Found ${allClerkUsers.length} users in Clerk`);

    const results = [];
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const clerkUser of allClerkUsers) {
      try {
        // Find corresponding user in Convex
        const convexUser = await convex.query(api.users.getBySubject, { subject: clerkUser.id });

        if (!convexUser) {
          console.warn(`Clerk user ${clerkUser.id} not found in Convex. Skipping.`);
          results.push({ 
            userId: clerkUser.id, 
            email: clerkUser.emailAddresses[0]?.emailAddress || 'unknown',
            status: 'skipped', 
            message: 'User not found in Convex' 
          });
          skippedCount++;
          continue;
        }

        // Check if username needs updating
        const clerkUsername = clerkUser.username || '';
        const convexUsername = convexUser.username || '';

        if (clerkUsername === convexUsername) {
          console.log(`Username already synced for user ${clerkUser.id}`);
          results.push({ 
            userId: clerkUser.id, 
            email: clerkUser.emailAddresses[0]?.emailAddress || 'unknown',
            status: 'skipped', 
            message: 'Username already up to date' 
          });
          skippedCount++;
          continue;
        }

        // Get current user's Convex ID for permission check
        const currentConvexUser = await convex.query(api.users.getBySubject, { subject: currentUserData.id });
        if (!currentConvexUser) {
          throw new Error('Current user not found in Convex');
        }

        // Update username in Convex
        await convex.mutation(api.users.update, {
          id: convexUser._id,
          username: clerkUsername,
          currentUserId: currentConvexUser._id,
        });

        console.log(`Updated username for user ${clerkUser.id}: "${convexUsername}" -> "${clerkUsername}"`);
        results.push({ 
          userId: clerkUser.id, 
          email: clerkUser.emailAddresses[0]?.emailAddress || 'unknown',
          status: 'updated', 
          message: `Username updated: "${convexUsername}" -> "${clerkUsername}"` 
        });
        updatedCount++;

      } catch (innerError) {
        console.error(`Error updating user ${clerkUser.id}:`, innerError);
        results.push({ 
          userId: clerkUser.id, 
          email: clerkUser.emailAddresses[0]?.emailAddress || 'unknown',
          status: 'error', 
          message: innerError instanceof Error ? innerError.message : 'Unknown error' 
        });
        errorCount++;
      }
    }

    console.log(`Username sync completed: ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors`);

    return {
      success: true,
      summary: {
        total: allClerkUsers.length,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
      results,
    };

  } catch (error) {
    console.error('Failed to sync usernames from Clerk:', error);
    throw new Error(`Failed to sync usernames: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}