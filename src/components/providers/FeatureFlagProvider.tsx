'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { identifyUserForFeatureFlags, bootstrapFeatureFlags } from '@/lib/feature-flags/auth-integration';

interface FeatureFlagProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that handles feature flag authentication integration
 * This ensures feature flags persist across authentication steps
 */
export function FeatureFlagProvider({ children }: FeatureFlagProviderProps) {
  const { user, isLoaded } = useUser();
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    // Only identify user if they've changed or haven't been identified yet
    const currentUserId = user?.id || null;
    if (currentUserId !== lastUserId.current) {
      console.log('User changed, identifying in PostHog:', { 
        previous: lastUserId.current, 
        current: currentUserId 
      });
      
      // Identify user in PostHog for feature flags
      identifyUserForFeatureFlags(user);

      // Bootstrap feature flags for the user
      if (user) {
        bootstrapFeatureFlags(user);
      }
      
      lastUserId.current = currentUserId;
    }
  }, [user, isLoaded]);

  return <>{children}</>;
}
