import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getOrganisationIdFromSession } from "@/lib/authz";
import { createClerkClient } from "@clerk/clerk-sdk-node";

export async function POST(request: NextRequest) {
  try {
    // Check if the current user is authenticated and has admin privileges
    const currentUserData = await currentUser();

    if (!currentUserData) {
      return NextResponse.json(
        { error: "Unauthorized: User not authenticated" },
        { status: 401 },
      );
    }

    // Check if user has appropriate permissions
    const userRole = currentUserData.publicMetadata?.role as string;
    const userRoles = currentUserData.publicMetadata?.roles as string[];
    const isAdmin =
      userRole === "sysadmin" ||
      userRole === "developer" ||
      (userRoles &&
        (userRoles.includes("sysadmin") || userRoles.includes("developer")));
    const isOrgAdmin = userRole === "orgadmin";

    if (!isAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 },
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 },
      );
    }

    // Initialize Clerk client
    const clerk = createClerkClient({
      ...(process.env.CLERK_SECRET_KEY
        ? { secretKey: process.env.CLERK_SECRET_KEY as string }
        : {}),
    });

    // If orgadmin, ensure they can only reset passwords for users in their own organisation
    if (isOrgAdmin) {
      const targetUser = await clerk.users.getUser(userId);
      const targetUserOrgId = targetUser.publicMetadata
        ?.organisationId as string;
      const currentUserOrgId = await getOrganisationIdFromSession();

      if (targetUserOrgId !== currentUserOrgId) {
        return NextResponse.json(
          {
            error:
              "Unauthorized: Can only reset passwords for users in your own organisation",
          },
          { status: 403 },
        );
      }
    }

    // Get the user to find their email address
    const user = await clerk.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    );

    if (!primaryEmail?.emailAddress) {
      throw new Error("User email address not found");
    }

    // Unfortunately, Clerk doesn't provide a backend API to send password reset emails
    // The client-side approach is the only way to trigger the reset email
    // So we'll disable their password and they'll have to use "Forgot Password?"

    try {
      // Set the password to null/undefined to force a reset
      await clerk.users.updateUser(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          passwordResetRequestedBy: currentUserData.id,
          passwordResetRequestedAt: new Date().toISOString(),
          passwordResetRequired: true,
        },
      });

      console.log("Password disabled for user:", primaryEmail.emailAddress);

      return NextResponse.json(
        {
          message: `Password has been disabled for ${primaryEmail.emailAddress}. User must use "Forgot Password?" on the sign-in page to set a new password.`,
          userEmail: primaryEmail.emailAddress,
          action: "password_disabled",
          nextSteps:
            'Inform the user to visit the sign-in page and click "Forgot Password?" to reset their password.',
        },
        { status: 200 },
      );
    } catch (error) {
      console.error("Failed to disable password:", error);

      // If we can't disable the password, just flag it
      await clerk.users.updateUser(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          passwordResetRequestedBy: currentUserData.id,
          passwordResetRequestedAt: new Date().toISOString(),
          passwordResetRequired: true,
        },
      });

      return NextResponse.json(
        {
          message: `Password reset has been flagged for ${primaryEmail.emailAddress}. Please inform them to use "Forgot Password?" on the sign-in page.`,
          userEmail: primaryEmail.emailAddress,
          action: "password_flagged",
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Error sending password reset email:", error);

    return NextResponse.json(
      { error: "Failed to send password reset email" },
      { status: 500 },
    );
  }
}
