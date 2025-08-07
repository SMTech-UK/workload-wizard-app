import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { FeatureFlags, FeatureFlagResult } from './types';
import { getUserFeatureFlagContext } from './auth-integration';
import { useAuth } from '@clerk/nextjs';

/**
 * Convex query to get user's feature flag context
 * This can be used to store user properties in Convex for feature flag targeting
 */
export function useUserFeatureFlagContext() {
  const { user } = useAuth();
  
  // Query user data from Convex if needed
  const userData = useQuery(api.users.getUser, user?.id ? { userId: user.id } : 'skip');
  
  if (!user) {
    return null;
  }

  const context = getUserFeatureFlagContext(user);
  
  // Merge with Convex data if available
  if (userData) {
    context.userProperties = {
      ...context.userProperties,
      // Add any additional properties from Convex
      convexUserId: userData._id,
      // Add other Convex-specific properties
    };
  }

  return context;
}

/**
 * Convex mutation to log feature flag usage
 * This can be used to track feature flag usage in your database
 */
export function useLogFeatureFlagUsage() {
  // You can create a Convex mutation to log feature flag usage
  // This is useful for analytics and debugging
  
  return async (flagName: FeatureFlags, enabled: boolean, context?: unknown) => {
    // Example implementation - you can create a Convex mutation for this
    console.log('Feature flag usage logged:', {
      flagName,
      enabled,
      context,
      timestamp: new Date().toISOString(),
    });
  };
}

/**
 * Convex query to get feature flag overrides
 * This allows you to store feature flag overrides in your database
 */
export function useFeatureFlagOverrides() {
  const { user } = useAuth();
  
  // Query feature flag overrides from Convex
  const overrides = useQuery(
    api.featureFlags.getOverrides, 
    user?.id ? { userId: user.id } : 'skip'
  );
  
  return overrides || {};
}

/**
 * Helper function to merge Convex overrides with PostHog flags
 */
export function mergeFeatureFlagWithOverrides(
  posthogResult: FeatureFlagResult,
  flagName: FeatureFlags,
  overrides: Record<string, unknown>
): FeatureFlagResult {
  const override = overrides[flagName];
  
  if (override !== undefined) {
    return {
      enabled: override,
      payload: posthogResult.payload,
      source: 'override',
    };
  }
  
  return posthogResult;
}
