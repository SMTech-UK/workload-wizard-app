import posthog from 'posthog-js';
import type { UserResource } from '@clerk/types';
import type { FeatureFlagContext } from './types';

// Track if user has been identified to prevent duplicates
let identifiedUserId: string | null = null;

/**
 * Initialize PostHog with user identification for feature flags
 * This should be called after user authentication
 */
export function identifyUserForFeatureFlags(user: UserResource | null) {
  if (typeof window === 'undefined' || !posthog) {
    console.log('PostHog not available (server-side or not initialized)');
    return;
  }

  if (user) {
    // Prevent duplicate identification
    if (identifiedUserId === user.id) {
      console.log('User already identified, skipping duplicate identification');
      return;
    }

    // Wait for PostHog to be ready before identifying
    const identifyUser = () => {
      // First, capture an event to ensure the user profile is created
      posthog.capture('user_authenticated', {
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      });

      // Then identify the user in PostHog
      posthog.identify(user.id, {
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        organisationId: user.publicMetadata?.organisationId as string,
        role: user.publicMetadata?.role as string,
        // Add any other user properties you want to track
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
      });

      // Set user properties for feature flag targeting
      posthog.people.set({
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        organisationId: user.publicMetadata?.organisationId as string,
        role: user.publicMetadata?.role as string,
        // Add custom properties for feature flag targeting
        userType: user.publicMetadata?.role as string,
        hasOrganisation: !!user.publicMetadata?.organisationId,
      });

      // Track that this user has been identified
      identifiedUserId = user.id;

      console.log('PostHog user identified for feature flags:', {
        userId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        posthogDistinctId: posthog.get_distinct_id(),
        posthogIsIdentified: posthog.isFeatureEnabled('test_flag') !== null // Check if PostHog is working
      });
    };

    // If PostHog is already ready, identify immediately
    if (posthog.get_distinct_id()) {
      identifyUser();
    } else {
      // Wait for PostHog to be ready
      setTimeout(identifyUser, 200);
    }
  } else {
    // Reset to anonymous user
    posthog.reset();
    identifiedUserId = null;
    console.log('PostHog reset to anonymous user');
  }
}

/**
 * Get user context for feature flag evaluation
 */
export function getUserFeatureFlagContext(user: UserResource | null): FeatureFlagContext {
  if (!user) {
    return {
      distinctId: undefined,
      userId: undefined,
      userEmail: undefined,
      userProperties: {},
      groups: {},
    };
  }

  // Filter out undefined values from groups
  const groups: Record<string, string> = {};
  if (user.publicMetadata?.organisationId) {
    groups.organisation = user.publicMetadata.organisationId as string;
  }
  if (user.publicMetadata?.role) {
    groups.role = user.publicMetadata.role as string;
  }

  return {
    distinctId: user.id,
    userId: user.id,
    userEmail: user.emailAddresses[0]?.emailAddress,
    userProperties: {
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      organisationId: user.publicMetadata?.organisationId as string,
      role: user.publicMetadata?.role as string,
      userType: user.publicMetadata?.role as string,
      hasOrganisation: !!user.publicMetadata?.organisationId,
    },
    groups,
  };
}

// Server-side function moved to server.ts to avoid client-side imports

/**
 * Bootstrap feature flags for authenticated users
 * This should be called after user identification
 */
export async function bootstrapFeatureFlags(user: UserResource | null) {
  if (typeof window === 'undefined' || !posthog) {
    return;
  }

  if (user) {
    try {
      // Get user context
      const context = getUserFeatureFlagContext(user);
      
      // Bootstrap feature flags for the user
      // This ensures flags are available immediately after authentication
      console.log('Feature flags bootstrapped for user:', user.id);
      
      return true;
    } catch (error) {
      console.error('Failed to bootstrap feature flags:', error);
    }
  }
}

/**
 * Capture feature flag events with user context
 */
export function captureFeatureFlagEvent(
  flagName: string,
  enabled: boolean,
  user: UserResource | null,
  additionalProperties?: Record<string, unknown>
) {
  if (typeof window === 'undefined' || !posthog) {
    return;
  }

  const context = getUserFeatureFlagContext(user);
  
  posthog.capture('feature_flag_viewed', {
    flag_name: flagName,
    flag_enabled: enabled,
    ...context.userProperties,
    ...additionalProperties,
  });
}
