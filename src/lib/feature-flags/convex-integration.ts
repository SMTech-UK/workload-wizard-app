import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { FeatureFlags, FeatureFlagResult } from './types';
import { getUserFeatureFlagContext } from './auth-integration';
import { useUser } from '@clerk/nextjs';

/**
 * Convex query to get user's feature flag context
 * This can be used to store user properties in Convex for feature flag targeting
 */
export function useUserFeatureFlagContext() {
  const { user } = useUser();
  
  // Query user data from Convex if needed
  const userData = useQuery(api.users.getBySubject, user?.id ? { subject: user.id } : 'skip');
  
  if (!user) {
    return null;
  }

  const context = getUserFeatureFlagContext(user);
  
  // Merge with Convex data if available
  // Optionally use userData for side-effects or logging; avoid mutating typed shape

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
  const { user } = useUser();
  
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
  
  if (typeof override === 'boolean') {
    return {
      enabled: override,
      payload: posthogResult.payload,
      source: 'override',
    };
  }
  
  return posthogResult;
}
