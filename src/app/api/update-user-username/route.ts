import { NextRequest, NextResponse } from "next/server";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { getOrganisationIdFromSession } from "@/lib/authz";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { z } from "zod";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const BodySchema = z.object({
  userId: z.string().min(1),
  newUsername: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export async function POST(request: NextRequest) {
  try {
    // Check if the current user is authenticated and has admin privileges
    const currentUserData = await currentUser();

    if (!currentUserData) {
      return NextResponse.json(
        { error: "Unauthorised: User not authenticated" },
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
        { error: "Unauthorised: Admin access required" },
        { status: 403 },
      );
    }

    let parsed;
    try {
      parsed = BodySchema.parse(await request.json());
    } catch (err) {
      if (err && typeof err === "object" && "errors" in (err as any)) {
        return NextResponse.json(
          { error: "Invalid request body", details: (err as any).errors },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { userId, newUsername } = parsed;

    // validated by schema

    // format validated by schema

    // Initialize Clerk client
    const clerk = await clerkClient();

    // If orgadmin, ensure they can only update usernames for users in their own organisation
    if (isOrgAdmin) {
      const targetUser = await clerk.users.getUser(userId);
      const targetUserOrgId = targetUser.publicMetadata
        ?.organisationId as string;
      const currentUserOrgId = await getOrganisationIdFromSession();

      if (targetUserOrgId !== currentUserOrgId) {
        return NextResponse.json(
          {
            error:
              "Unauthorised: Can only update usernames for users in your own organisation",
          },
          { status: 403 },
        );
      }
    }

    // Check if the new username is already in use by another user
    try {
      const existingUser = await clerk.users.getUserList({
        username: [newUsername],
      });

      if (
        (existingUser.data?.length || 0) > 0 &&
        existingUser.data![0] &&
        existingUser.data![0].id !== userId
      ) {
        return NextResponse.json(
          { error: "Username is already in use by another user" },
          { status: 409 },
        );
      }
    } catch (error) {
      console.error("Error checking existing username:", error);
      // Continue with the update even if we can't verify uniqueness
    }

    // Update username in Clerk
    await clerk.users.updateUser(userId, {
      username: newUsername,
    });

    // Find the Convex user by their Clerk subject (userId)
    // and update username in Convex if needed
    try {
      // Query Convex to find the target user by their subject (Clerk ID)
      const convexUser = await convex.query(api.users.getBySubject, {
        subject: userId,
      });

      if (!convexUser) {
        console.error("User not found in Convex with subject:", userId);
        // Continue without failing since Clerk update succeeded
      } else {
        // Also get the current user's Convex ID for permissions
        const currentConvexUser = await convex.query(api.users.getBySubject, {
          subject: currentUserData.id,
        });

        if (!currentConvexUser) {
          console.error(
            "Current user not found in Convex with subject:",
            currentUserData.id,
          );
          // Continue without failing since Clerk update succeeded
        } else {
          // Check if Convex user table has a username field, if not we'll skip this
          // For now, we'll just update Clerk since that's the primary source
        }
      }
    } catch (error) {
      console.error("Error updating username in Convex:", error);
      // If Convex update fails, we'll continue since Clerk is the primary source for username
    }

    return NextResponse.json(
      { message: "Username updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating username:", error);

    if (error instanceof Error) {
      // Handle specific Clerk errors
      if (error.message.includes("already exists")) {
        return NextResponse.json(
          { error: "Username is already in use" },
          { status: 409 },
        );
      }

      if (error.message.includes("Invalid username")) {
        return NextResponse.json(
          { error: "Invalid username format" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update username" },
      { status: 500 },
    );
  }
}
