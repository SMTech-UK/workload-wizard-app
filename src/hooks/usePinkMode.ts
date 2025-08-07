'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { getFeatureFlag } from '@/lib/feature-flags/client';
import { FeatureFlags } from '@/lib/feature-flags/types';

// Key for local storage overrides
const LOCAL_FLAG_OVERRIDES_KEY = 'feature-flag-overrides';

export function usePinkMode() {
  const { user, isLoaded } = useUser();
  const [isPinkModeEnabled, setIsPinkModeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Function to check pink mode status
  const checkPinkMode = useCallback(async () => {
    if (!isLoaded || !user) {
      setIsLoading(false);
      return;
    }

    try {
      // Check if the pink-mode feature is enabled for the user
      const pinkModeResult = await getFeatureFlag(FeatureFlags.PINK_MODE);
      const enabled = pinkModeResult.enabled;
      
      setIsPinkModeEnabled(enabled);
      
      // Apply or remove the pink-mode class from the document
      if (enabled) {
        document.documentElement.classList.add('pink-mode');
        console.log('Pink mode enabled');
      } else {
        document.documentElement.classList.remove('pink-mode');
        console.log('Pink mode disabled');
      }
    } catch (error) {
      console.error('Failed to check pink mode status:', error);
      // Default to disabled if there's an error
      setIsPinkModeEnabled(false);
      document.documentElement.classList.remove('pink-mode');
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, user]);

  // Function to check local storage directly (for immediate updates)
  const checkLocalStorage = useCallback(() => {
    try {
      const overridesStr = localStorage.getItem(LOCAL_FLAG_OVERRIDES_KEY);
      if (overridesStr) {
        const overrides = JSON.parse(overridesStr);
        const pinkModeOverride = overrides[FeatureFlags.PINK_MODE];
        
        if (pinkModeOverride !== undefined) {
          const enabled = pinkModeOverride;
          setIsPinkModeEnabled(enabled);
          
          if (enabled) {
            document.documentElement.classList.add('pink-mode');
            console.log('Pink mode enabled (from local storage)');
          } else {
            document.documentElement.classList.remove('pink-mode');
            console.log('Pink mode disabled (from local storage)');
          }
        }
      }
    } catch (error) {
      console.error('Failed to check local storage for pink mode:', error);
    }
  }, []);

  useEffect(() => {
    checkPinkMode();
  }, [checkPinkMode]);

  // Listen for storage changes (when localStorage is updated from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_FLAG_OVERRIDES_KEY) {
        console.log('Local storage changed, checking pink mode...');
        checkLocalStorage();
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (for same-tab updates)
    const handleCustomStorageChange = () => {
      console.log('Custom storage event, checking pink mode...');
      checkLocalStorage();
    };

    window.addEventListener('featureFlagChanged', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('featureFlagChanged', handleCustomStorageChange);
    };
  }, [checkLocalStorage]);

  // Function to manually refresh the pink mode status
  const refreshPinkMode = async () => {
    setIsLoading(true);
    try {
      const pinkModeResult = await getFeatureFlag(FeatureFlags.PINK_MODE);
      const enabled = pinkModeResult.enabled;
      
      setIsPinkModeEnabled(enabled);
      
      if (enabled) {
        document.documentElement.classList.add('pink-mode');
      } else {
        document.documentElement.classList.remove('pink-mode');
      }
    } catch (error) {
      console.error('Failed to refresh pink mode status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isPinkModeEnabled,
    isLoading,
    refreshPinkMode
  };
}
