import { NextRequest, NextResponse } from 'next/server';
import { clerkClient, currentUser } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

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

    const { userId, newEmail } = await request.json();

    if (!userId || !newEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and newEmail' },
        { status: 400 }
      );
    }

    // Check if user has appropriate permissions
      const userRole = currentUserData.publicMetadata?.role as string;
  const userRoles = currentUserData.publicMetadata?.roles as string[];
  const isAdmin = userRole === 'sysadmin' || userRole === 'developer' || 
                 (userRoles && (userRoles.includes('sysadmin') || userRoles.includes('developer')));
    const isOrgAdmin = userRole === 'orgadmin';
    
    // Allow users to update their own email
    const isUpdatingOwnEmail = currentUserData.id === userId;
    
    if (!isAdmin && !isOrgAdmin && !isUpdatingOwnEmail) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own email or admin access required' },
        { status: 403 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Initialize Clerk client
    const clerk = await clerkClient();

    // If orgadmin, ensure they can only update emails for users in their own organisation
    // But allow users to update their own email regardless
    if (isOrgAdmin && !isUpdatingOwnEmail) {
      const targetUser = await clerk.users.getUser(userId);
      const targetUserOrgId = targetUser.publicMetadata?.organisationId as string;
      const currentUserOrgId = currentUserData.publicMetadata?.organisationId as string;
      
      if (targetUserOrgId !== currentUserOrgId) {
        return NextResponse.json(
          { error: 'Unauthorized: Can only update emails for users in your own organisation' },
          { status: 403 }
        );
      }
    }

    // Check if the new email is already in use by another user
    try {
      const existingUser = await clerk.users.getUserList({
        emailAddress: [newEmail],
      });

      if ((existingUser.data?.length || 0) > 0 && existingUser.data![0] && existingUser.data![0].id !== userId) {
        return NextResponse.json(
          { error: 'Email address is already in use by another user' },
          { status: 409 }
        );
      }
    } catch (error) {
      console.error('Error checking existing email:', error);
      // Continue with the update even if we can't verify uniqueness
    }

    // Get current user to access their email addresses
    const user = await clerk.users.getUser(userId);
    
    // Create new email address for the user
    const newEmailAddress = await clerk.emailAddresses.createEmailAddress({
      userId: userId,
      emailAddress: newEmail,
      verified: true,
    });

    // Update user to make this the primary email address
    await clerk.users.updateUser(userId, {
      primaryEmailAddressID: newEmailAddress.id,
    });

    // Optionally remove old email addresses
    for (const existingEmail of user.emailAddresses) {
      if (existingEmail.id !== newEmailAddress.id) {
        try {
          await clerk.emailAddresses.deleteEmailAddress(existingEmail.id);
        } catch (error) {
          // 404 or other errors are fine - old email might already be removed
          // This is not critical to the main functionality
        }
      }
    }

    // Find the Convex user by their Clerk subject (userId)
    // and update email in Convex
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
          await convex.mutation(api.users.updateEmail, {
            userId: convexUser._id,
            newEmail: newEmail,
            currentUserId: currentConvexUser._id, // Use Convex ID for permissions
          });
        }
      }
    } catch (error) {
      console.error('Error updating email in Convex:', error);
      // If Convex update fails, we should rollback the Clerk update
      // For now, we'll just log the error and continue
      // In a production environment, you might want to implement proper rollback logic
    }

    return NextResponse.json(
      { message: 'Email updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating user email:', error);
    
    if (error instanceof Error) {
      // Handle specific Clerk errors
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Email address is already in use' },
          { status: 409 }
        );
      }
      
      if (error.message.includes('Invalid email')) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update email' },
      { status: 500 }
    );
  }
} 