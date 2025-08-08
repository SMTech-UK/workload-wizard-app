'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  FeatureFlagResult, 
  FeatureFlagContext,
  getFeatureFlag,
  getFeatureFlags,
  clearFeatureFlagCache
} from '@/lib/feature-flags';
import { FeatureFlags } from '@/lib/feature-flags/types';
import { getUserFeatureFlagContext } from '@/lib/feature-flags/auth-integration';

// Re-export FeatureFlags for convenience
export { FeatureFlags } from '@/lib/feature-flags/types';

/**
 * Hook to get a single feature flag value
 */
export function useFeatureFlag(
  flagName: FeatureFlags,
  context?: Omit<FeatureFlagContext, 'userId' | 'userEmail' | 'distinctId'>
) {
  const { user, isLoaded } = useUser();
  const [result, setResult] = useState<FeatureFlagResult>({ enabled: false, source: 'fallback' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlag = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      // Get user context from Clerk
      const userContext = getUserFeatureFlagContext(user ?? null);
      
      // Create a simple context object
      const flagContext: FeatureFlagContext = {
        ...(userContext.userId ? { userId: userContext.userId } : {}),
        ...(userContext.userEmail ? { userEmail: userContext.userEmail } : {}),
        ...(userContext.distinctId ? { distinctId: userContext.distinctId } : {}),
        userProperties: {
          ...userContext.userProperties,
          ...context?.userProperties,
        },
        ...(userContext.groups ? { groups: userContext.groups } : {}),
      } as FeatureFlagContext;

      const flagResult = await getFeatureFlag(flagName, flagContext);
      
      // If we got a fallback result and user is loaded, retry once more
      if (flagResult.source === 'fallback' && user && retryCount < 1) {
        console.log('Retrying feature flag fetch due to fallback result...');
        setTimeout(() => fetchFlag(retryCount + 1), 500);
        return;
      }
      
      setResult(flagResult);
    } catch (err) {
      console.error('Error fetching feature flag:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch feature flag'));
      // Set a safe fallback
      setResult({ enabled: false, source: 'fallback' });
    } finally {
      setLoading(false);
    }
  }, [flagName, user, context]);

  useEffect(() => {
    if (isLoaded) {
      fetchFlag();
    }
  }, [fetchFlag, isLoaded]);

  const refresh = useCallback(() => {
    fetchFlag();
  }, [fetchFlag]);

  return {
    enabled: result.enabled,
    payload: result.payload,
    source: result.source,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook to get multiple feature flags at once
 */
export function useFeatureFlags(
  flagNames: FeatureFlags[],
  context?: Omit<FeatureFlagContext, 'userId' | 'userEmail' | 'distinctId'>
) {
  const { user } = useUser();
  const [results, setResults] = useState<Record<FeatureFlags, FeatureFlagResult>>({} as Record<FeatureFlags, FeatureFlagResult>);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user context from Clerk
      const userContext = getUserFeatureFlagContext(user ?? null);
      
      // Merge with provided context
      const flagContext: FeatureFlagContext = {
        ...(userContext.userId ? { userId: userContext.userId } : {}),
        ...(userContext.userEmail ? { userEmail: userContext.userEmail } : {}),
        ...(userContext.distinctId ? { distinctId: userContext.distinctId } : {}),
        userProperties: {
          ...userContext.userProperties,
          ...context?.userProperties,
        },
        ...(userContext.groups ? { groups: userContext.groups } : {}),
      } as FeatureFlagContext;

      const flagResults = await getFeatureFlags(flagNames, flagContext);
      setResults(flagResults);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch feature flags'));
    } finally {
      setLoading(false);
    }
  }, [flagNames, user, context]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const refresh = useCallback(() => {
    fetchFlags();
  }, [fetchFlags]);

  return {
    flags: results,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook to check if any of the provided flags are enabled
 */
export function useAnyFeatureFlag(
  flagNames: FeatureFlags[],
  context?: Omit<FeatureFlagContext, 'userId' | 'userEmail' | 'distinctId'>
) {
  const { flags, loading, error, refresh } = useFeatureFlags(flagNames, context);
  
  const anyEnabled = Object.values(flags).some(flag => flag.enabled);
  
  return {
    enabled: anyEnabled,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook to check if all of the provided flags are enabled
 */
export function useAllFeatureFlags(
  flagNames: FeatureFlags[],
  context?: Omit<FeatureFlagContext, 'userId' | 'userEmail' | 'distinctId'>
) {
  const { flags, loading, error, refresh } = useFeatureFlags(flagNames, context);
  
  const allEnabled = flagNames.length > 0 && Object.values(flags).every(flag => flag.enabled);
  
  return {
    enabled: allEnabled,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook to clear feature flag cache
 */
export function useClearFeatureFlagCache() {
  return useCallback(() => {
    clearFeatureFlagCache();
  }, []);
}
