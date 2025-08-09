"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { hasAdminAccess } from "@/lib/auth/permissions";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function syncUsersFromClerk() {
  const currentUserData = await currentUser();

  if (!currentUserData) {
    throw new Error("Unauthorized: User not authenticated");
  }

  // Check if user has admin role in Clerk metadata
  const userRole = currentUserData.publicMetadata?.role as string;
  const userRoles = currentUserData.publicMetadata?.roles as string[];

  if (
    !hasAdminAccess(userRole) &&
    !(
      userRoles &&
      (userRoles.includes("sysadmin") || userRoles.includes("developer"))
    )
  ) {
    throw new Error("Unauthorized: Admin access required");
  }

  try {
    // Get all users from Clerk
    const clerk = await clerkClient();
    const clerkUsersResponse = await clerk.users.getUserList({
      limit: 100,
    });
    const clerkUsers = clerkUsersResponse.data;

    // Get the first organisation from Convex (we'll use this as default)
    const organisations = await convex.query(api.organisations.list);
    if ((organisations?.length || 0) === 0) {
      throw new Error(
        "No organisations found in Convex. Please create an organisation first.",
      );
    }
    const defaultOrganisationId = organisations[0]!._id;

    const results = [];

    for (const clerkUser of clerkUsers) {
      try {
        const primaryEmail = clerkUser.emailAddresses.find(
          (email) => email.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress;

        if (!primaryEmail) {
          console.warn(
            `Clerk user ${clerkUser.id} has no primary email address. Skipping.`,
          );
          results.push({
            userId: clerkUser.id,
            status: "failed",
            message: "No primary email address found",
          });
          continue;
        }

        // Check if user exists in Convex
        const existingConvexUser = await convex.query(api.users.getBySubject, {
          subject: clerkUser.id,
        });

        if (!existingConvexUser) {
          // Create user in Convex if not found
          const systemRole =
            (clerkUser.publicMetadata?.role as
              | "orgadmin"
              | "sysadmin"
              | "developer"
              | "user"
              | "trial") || "user";

          const createData = {
            email: primaryEmail,
            username: clerkUser.username || "",
            givenName: clerkUser.firstName || "",
            familyName: clerkUser.lastName || "",
            fullName:
              clerkUser.firstName && clerkUser.lastName
                ? `${clerkUser.firstName} ${clerkUser.lastName}`
                : primaryEmail,
            systemRoles: [systemRole],
            // API accepts optional organisationId for system flows; Convex derives for actor-driven flows
            organisationId: defaultOrganisationId,
            pictureUrl: clerkUser.imageUrl || "",
            subject: clerkUser.id,
            tokenIdentifier: `https://clerk.com/users/${clerkUser.id}`,
          };

          await convex.mutation(api.users.create, createData);
          results.push({
            userId: clerkUser.id,
            status: "created",
            message: "User created in Convex",
          });
        } else {
          // User already exists in Convex
          results.push({
            userId: clerkUser.id,
            status: "skipped",
            message: "User already exists in Convex",
          });
        }
      } catch (innerError) {
        console.error(
          `Error processing Clerk user ${clerkUser.id}:`,
          innerError,
        );
        const errorMessage =
          innerError instanceof Error ? innerError.message : String(innerError);
        results.push({
          userId: clerkUser.id,
          status: "failed",
          message: `Failed to process: ${errorMessage}`,
        });
      }
    }

    return {
      success: true,
      totalUsers: clerkUsers.length,
      message: `Sync complete. Processed ${clerkUsers.length} users.`,
      results,
    };
  } catch (error) {
    console.error("Error syncing users:", error);
    throw new Error("Failed to sync users from Clerk");
  }
}

export async function getSyncStatus() {
  const currentUserData = await currentUser();

  if (!currentUserData) {
    throw new Error("Unauthorized: User not authenticated");
  }

  // Check if user has admin role in Clerk metadata
  const userRole = currentUserData.publicMetadata?.role as string;
  const userRoles = currentUserData.publicMetadata?.roles as string[];

  if (
    !hasAdminAccess(userRole) &&
    !(
      userRoles &&
      (userRoles.includes("sysadmin") || userRoles.includes("developer"))
    )
  ) {
    throw new Error("Unauthorized: Admin access required");
  }

  try {
    const clerk = await clerkClient();
    const clerkUsersResponse = await clerk.users.getUserList({ limit: 100 });
    const clerkUsers = clerkUsersResponse.data;
    const clerkUserIds = new Set(clerkUsers.map((u) => u.id));

    const convexUsers = await convex.query(api.users.list, {});
    const convexUserSubjects = new Set(convexUsers.map((u) => u.subject));

    const missingInConvex = clerkUsers.filter(
      (clerkUser) => !convexUserSubjects.has(clerkUser.id),
    );
    const extraInConvex = convexUsers.filter(
      (convexUser) => !clerkUserIds.has(convexUser.subject),
    );

    return {
      clerkUserCount: clerkUsers.length,
      convexUserCount: convexUsers.length,
      missingInConvex: missingInConvex.length,
      extraInConvex: extraInConvex.length,
      isSynced: missingInConvex.length === 0 && extraInConvex.length === 0,
    };
  } catch (error) {
    console.error("Error getting sync status:", error);
    throw new Error("Failed to get sync status");
  }
}
