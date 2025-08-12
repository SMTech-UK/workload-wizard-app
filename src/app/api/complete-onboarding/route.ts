import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      console.error("No current user found in onboarding completion");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { onboardingData } = body;

    // Only call Convex if the user exists there; avoid 500s if webhook hasn't created it yet
    try {
      const existing = await convex.query(api.users.getBySubject, {
        subject: user.id,
      });
      if (existing) {
        await convex.mutation(api.users.completeOnboarding, {
          subject: user.id,
          onboardingData: onboardingData,
        });
      } else {
        console.warn(
          "complete-onboarding: Convex user not found; skipping Convex update",
        );
      }
    } catch (convexErr) {
      console.error("complete-onboarding: Convex call failed", convexErr);
      // Continue; Clerk will still be updated below
    }

    // Also update Clerk user record for name changes to keep in sync
    const clerk = await clerkClient();
    const clerkUpdates: Record<string, unknown> = {};

    if (
      onboardingData.firstName &&
      onboardingData.firstName !== user.firstName
    ) {
      clerkUpdates.firstName = onboardingData.firstName;
    }

    if (onboardingData.lastName && onboardingData.lastName !== user.lastName) {
      clerkUpdates.lastName = onboardingData.lastName;
    }

    // Only update Clerk if there are name changes to sync
    if (Object.keys(clerkUpdates).length > 0) {
      await clerk.users.updateUser(user.id, clerkUpdates);
    }

    // Update Clerk metadata with just completion status
    await clerk.users.updateUserMetadata(user.id, {
      publicMetadata: {
        ...user.publicMetadata,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 },
    );
  }
}
