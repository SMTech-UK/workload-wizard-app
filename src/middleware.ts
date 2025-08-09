import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Simple token bucket per-IP for a few sensitive routes
const RATE_LIMITS: Record<string, { tokens: number; lastRefill: number }> =
  Object.create(null);
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_TOKENS = 20; // 20 requests/min per IP

function shouldRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = RATE_LIMITS[ip] ?? {
    tokens: RATE_LIMIT_TOKENS,
    lastRefill: now,
  };
  // refill
  const elapsed = now - bucket.lastRefill;
  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    bucket.tokens = RATE_LIMIT_TOKENS;
    bucket.lastRefill = now;
  }
  // spend
  if (bucket.tokens <= 0) {
    RATE_LIMITS[ip] = bucket;
    return true;
  }
  bucket.tokens -= 1;
  RATE_LIMITS[ip] = bucket;
  return false;
}

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/api/webhooks/clerk",
  "/terms",
  "/privacy",
  "/reset-password",
]);
const isAccountRoute = createRouteMatcher(["/account(.*)"]);
const isApiRoute = createRouteMatcher([
  "/api/complete-onboarding",
  "/api/update-user-email",
]);
const isOnboardingRoute = createRouteMatcher([
  "/onboarding",
  "/onboarding-success",
]);

// Initialize Convex client for middleware
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Allow account routes for authenticated users (but don't check onboarding status)
  if (isAccountRoute(req)) {
    await auth.protect();
    return NextResponse.next();
  }

  // Allow API routes for authenticated users (but don't check onboarding status)
  if (isApiRoute(req)) {
    await auth.protect();
    // Basic rate limit for sensitive endpoints
    const url = new URL(req.url);
    const path = url.pathname;
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const isSensitive = [
      "/api/admin/flags/toggle",
      "/api/analytics/track",
      "/api/reset-password",
      "/api/admin/reset-password",
      "/api/update-user",
      "/api/update-user-email",
      "/api/update-user-username",
    ].some((p) => path.startsWith(p));
    if (isSensitive && shouldRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }
    return NextResponse.next();
  }

  // Allow onboarding route for authenticated users
  if (isOnboardingRoute(req)) {
    await auth.protect();
    return NextResponse.next();
  }

  // Protect all other routes
  await auth.protect();

  // Enforce onboarding completion
  if (userId) {
    try {
      // Prefer Clerk session claims (publicMetadata) for the flag
      const claimsAny = sessionClaims as unknown as {
        publicMetadata?: Record<string, unknown>;
        metadata?: { publicMetadata?: Record<string, unknown> };
      };
      const hasCompletedInClaims = Boolean(
        claimsAny?.publicMetadata?.onboardingCompleted ??
          claimsAny?.metadata?.publicMetadata?.onboardingCompleted,
      );

      let hasCompletedOnboarding = hasCompletedInClaims;

      // Fallback to Convex user record if claims missing or false
      if (!hasCompletedOnboarding) {
        try {
          const user = await convex.query(api.users.getBySubject, {
            subject: userId,
          });
          hasCompletedOnboarding = Boolean(user?.onboardingCompleted);
        } catch (convexErr) {
          // Non-fatal; proceed with claims-only decision
          console.error("Convex onboarding check failed:", convexErr);
        }
      }

      // Redirects based on onboarding status
      if (!hasCompletedOnboarding && !isOnboardingRoute(req)) {
        const onboardingUrl = new URL("/onboarding", req.url);
        return NextResponse.redirect(onboardingUrl);
      }

      if (hasCompletedOnboarding && isOnboardingRoute(req)) {
        const dashboardUrl = new URL("/dashboard", req.url);
        return NextResponse.redirect(dashboardUrl);
      }
    } catch (error) {
      console.error("Error enforcing onboarding status:", error);
      // Allow access if check fails unexpectedly
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
