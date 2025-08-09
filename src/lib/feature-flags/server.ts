// Server-only PostHog import was intentionally removed to avoid unused dep.
import { FeatureFlags, FeatureFlagResult, FeatureFlagContext } from "./types";
import { getFeatureFlagConfig, isValidFeatureFlag } from "./config";
import { getCurrentUserDetails } from "@/lib/auth/currentUser";

// Server-side PostHog client - COMMENTED OUT FOR USER PERSISTENCE
// let posthogServer: PostHog | null = null;

// function getPostHogServer(): PostHog | null {
//   if (!posthogServer && process.env.POSTHOG_API_KEY) {
//     posthogServer = new PostHog(
//       process.env.POSTHOG_API_KEY,
//       {
//         host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com',
//       }
//     );
//   }
//   return posthogServer;
// }

/**
 * Get a feature flag value on the server side
 * @param flagName - The feature flag name
 * @param context - Optional context for flag evaluation
 * @returns Promise<FeatureFlagResult>
 */
export async function getServerFeatureFlag(
  flagName: FeatureFlags,
  context?: FeatureFlagContext,
): Promise<FeatureFlagResult> {
  // Validate flag name
  if (!isValidFeatureFlag(flagName)) {
    console.warn(`Invalid feature flag name: ${flagName}`);
    return { enabled: false, source: "fallback" };
  }

  // COMMENTED OUT: Server-side PostHog to ensure user persistence
  // try {
  //   // Try PostHog server-side first
  //   const posthog = getPostHogServer();
  //   if (posthog && context?.distinctId) {
  //     const flagValue = await posthog.getFeatureFlag(flagName, context.distinctId, context);
  //
  //     if (typeof flagValue === 'boolean') {
  //       return { enabled: flagValue, source: 'posthog' };
  //     } else if (typeof flagValue === 'string') {
  //       try {
  //         const parsed = JSON.parse(flagValue);
  //         return { enabled: true, payload: parsed, source: 'posthog' };
  //       } catch {
  //         return { enabled: true, payload: flagValue, source: 'posthog' };
  //       }
  //     } else if (flagValue !== null && flagValue !== undefined) {
  //       return { enabled: true, payload: flagValue, source: 'posthog' };
  //     }
  //   }
  // } catch (error) {
  //   console.warn(`PostHog server feature flag check failed for ${flagName}:`, error);
  // }

  // Fallback to config defaults
  return getFallbackFlag(flagName, context);
}

/**
 * Server-side function to get user context for feature flags
 */
export async function getServerUserFeatureFlagContext(): Promise<FeatureFlagContext> {
  const userDetails = await getCurrentUserDetails();

  if (!userDetails) {
    return {
      userProperties: {},
      groups: {},
    } as FeatureFlagContext;
  }

  return {
    distinctId: userDetails.id,
    userId: userDetails.id,
    ...(userDetails.email ? { userEmail: userDetails.email } : {}),
    userProperties: {
      ...(userDetails.email ? { email: userDetails.email } : {}),
      fullName: userDetails.fullName,
      ...(userDetails.organisationId
        ? { organisationId: userDetails.organisationId }
        : {}),
      ...(userDetails.role
        ? { role: userDetails.role, userType: userDetails.role }
        : {}),
      hasOrganisation: !!userDetails.organisationId,
    },
    groups: {
      ...(userDetails.organisationId
        ? { organisation: userDetails.organisationId }
        : {}),
      ...(userDetails.role ? { role: userDetails.role } : {}),
    },
  } as FeatureFlagContext;
}

/**
 * Get a feature flag value on the server side with automatic user context
 * This is the recommended way to use feature flags in API routes
 */
export async function getServerFeatureFlagWithUser(
  flagName: FeatureFlags,
): Promise<FeatureFlagResult> {
  // Get user context automatically from Clerk
  const context = await getServerUserFeatureFlagContext();

  return getServerFeatureFlag(flagName, context);
}

/**
 * Get fallback flag value from local config (server-side)
 */
function getFallbackFlag(
  flagName: FeatureFlags,
  context?: FeatureFlagContext,
): FeatureFlagResult {
  const config = getFeatureFlagConfig(flagName);

  // Check if user is explicitly enabled/disabled
  if (context?.userEmail) {
    if (config.enabledFor?.userEmails?.includes(context.userEmail)) {
      return { enabled: true, source: "fallback" };
    }
    if (config.disabledFor?.userEmails?.includes(context.userEmail)) {
      return { enabled: false, source: "fallback" };
    }
  }

  if (context?.userId) {
    if (config.enabledFor?.userIds?.includes(context.userId)) {
      return { enabled: true, source: "fallback" };
    }
    if (config.disabledFor?.userIds?.includes(context.userId)) {
      return { enabled: false, source: "fallback" };
    }
  }

  // Check rollout percentage if specified
  if (config.rolloutPercentage !== undefined && context?.distinctId) {
    const hash = simpleHash(context.distinctId);
    const percentage = hash % 100;
    const enabled = percentage < config.rolloutPercentage;
    return { enabled, source: "fallback" };
  }

  // Return default value
  return { enabled: config.defaultValue, source: "fallback" };
}

/**
 * Simple hash function for consistent rollout percentages
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get multiple feature flags at once (server-side)
 */
export async function getServerFeatureFlags(
  flagNames: FeatureFlags[],
  context?: FeatureFlagContext,
): Promise<Record<FeatureFlags, FeatureFlagResult>> {
  const results: Record<FeatureFlags, FeatureFlagResult> = {} as Record<
    FeatureFlags,
    FeatureFlagResult
  >;

  await Promise.all(
    flagNames.map(async (flagName) => {
      results[flagName] = await getServerFeatureFlag(flagName, context);
    }),
  );

  return results;
}

/**
 * Capture a feature flag event on the server side
 */
export async function captureFeatureFlagEvent(
  flagName: FeatureFlags,
  enabled: boolean,
  context?: FeatureFlagContext,
): Promise<void> {
  // COMMENTED OUT: Server-side PostHog to ensure user persistence
  // try {
  //   const posthog = getPostHogServer();
  //   if (posthog && context?.distinctId) {
  //     await posthog.capture({
  //       distinctId: context.distinctId,
  //       event: 'feature_flag_viewed',
  //       properties: {
  //         flag_name: flagName,
  //         flag_enabled: enabled,
  //         ...context.userProperties,
  //       },
  //     });
  //   }
  // } catch (error) {
  //   console.warn(`Failed to capture feature flag event for ${flagName}:`, error);
  // }
}

/**
 * Close the PostHog server connection
 */
export async function closePostHogServer(): Promise<void> {
  // COMMENTED OUT: Server-side PostHog to ensure user persistence
  // if (posthogServer) {
  //   await posthogServer.shutdown();
  //   posthogServer = null;
  // }
}
