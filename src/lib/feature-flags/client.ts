import posthog from 'posthog-js';
import { FeatureFlags, FeatureFlagResult, FeatureFlagContext } from './types';
import { getFeatureFlagConfig, isValidFeatureFlag } from './config';
import { getUserFeatureFlagContext } from './auth-integration';

// Cache for feature flag results to avoid repeated PostHog calls
const flagCache = new Map<string, FeatureFlagResult>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedFlagResult extends FeatureFlagResult {
  timestamp: number;
}

/**
 * Check if PostHog is properly configured
 */
function isPostHogConfigured(): boolean {
  return typeof window !== 'undefined' && 
         !!process.env.NEXT_PUBLIC_POSTHOG_KEY && 
         !!posthog;
}

/**
 * Get a feature flag value with PostHog integration and fallback logic
 * @param flagName - The feature flag name
 * @param context - Optional context for flag evaluation
 * @param forceRefresh - Force refresh the cache
 * @returns Promise<FeatureFlagResult>
 */
export async function getFeatureFlag(
  flagName: FeatureFlags,
  context?: FeatureFlagContext,
  forceRefresh: boolean = false
): Promise<FeatureFlagResult> {
  // Validate flag name
  if (!isValidFeatureFlag(String(flagName))) {
    console.warn(`Invalid feature flag name: ${flagName}`);
    return { enabled: false, source: 'fallback' };
  }

  const cacheKey = `${flagName}-${JSON.stringify(context || {})}`;
  
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = flagCache.get(cacheKey) as CachedFlagResult | undefined;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached;
    }
  }

  try {
    // Try PostHog first if properly configured
    if (isPostHogConfigured()) {
      const posthogResult = await getPostHogFlag(flagName, context);
      const result: FeatureFlagResult = {
        enabled: posthogResult.enabled,
        payload: posthogResult.payload,
        source: 'posthog'
      };
      
      // Cache the result
      flagCache.set(cacheKey, { ...result, timestamp: Date.now() } as CachedFlagResult);
      return result;
    } else {
      console.warn('PostHog not configured, using fallback for feature flag:', flagName);
    }
  } catch (error) {
    console.warn(`PostHog feature flag check failed for ${flagName}:`, error);
  }

  // Fallback to config defaults
  const fallbackResult = getFallbackFlag(flagName, context);
  flagCache.set(cacheKey, { ...fallbackResult, timestamp: Date.now() } as CachedFlagResult);
  return fallbackResult;
}

/**
 * Get a feature flag value with automatic user context from Clerk
 * This is the recommended way to use feature flags in components
 */
export async function getFeatureFlagWithUser(
  flagName: FeatureFlags,
  forceRefresh: boolean = false
): Promise<FeatureFlagResult> {
  // Get user context automatically
  const context = getUserFeatureFlagContext(null); // Will be populated by the hook
  
  return getFeatureFlag(flagName, context, forceRefresh);
}

/**
 * Get feature flag from PostHog
 */
async function getPostHogFlag(
  flagName: FeatureFlags,
  context?: FeatureFlagContext
): Promise<FeatureFlagResult> {
    return new Promise(async (resolve) => {
    // Set user properties if context is provided
    if (context?.userProperties) {
      posthog.people.set(context.userProperties);
    }

    // Check if PostHog is ready and user is identified
    const checkFlag = async () => {
      // Get flag value from PostHog using isFeatureEnabled (recommended method)
      const flagValue = posthog.isFeatureEnabled(String(flagName));
      
      // Also check the raw flag value for debugging
      const rawFlagValue = posthog.getFeatureFlag(String(flagName));
      
      // Check if this is an early access feature
      let isEarlyAccessFeature = false;
      let earlyAccessEnrolled = false;
      
      // Use a promise to properly handle the async early access feature check
      const checkEarlyAccessFeatures = new Promise<void>((resolve) => {
        try {
          posthog.getEarlyAccessFeatures((features) => {
            const feature = features.find(f => f.flagKey === String(flagName));
            if (feature) {
              isEarlyAccessFeature = true;
              earlyAccessEnrolled = (feature as { enrolled?: boolean }).enrolled || false;
            }
            resolve();
          }, false, ['concept', 'beta']);
        } catch (error) {
          console.warn('Failed to check early access features:', error);
          resolve();
        }
      });
      
      // Wait for early access feature check to complete
      await checkEarlyAccessFeatures;
      
      console.log('PostHog feature flag check:', {
        flagName,
        flagValue,
        rawFlagValue,
        isEarlyAccessFeature,
        earlyAccessEnrolled,
        context: {
          userId: context?.userId,
          userEmail: context?.userEmail,
          distinctId: context?.distinctId
        },
        posthogUser: posthog.get_distinct_id(),
        isIdentified: posthog.isFeatureEnabled('test_flag') !== null,
        personProfiles: posthog.getFeatureFlag('test_flag') !== null, // Check if person profiles are working
      });
      
      // For early access features, only return true if user is enrolled
      if (isEarlyAccessFeature) {
        resolve({ enabled: earlyAccessEnrolled, source: 'posthog' });
        return;
      }
      
      // Handle the boolean result from isFeatureEnabled for regular feature flags
      if (typeof flagValue === 'boolean') {
        resolve({ enabled: flagValue, source: 'posthog' });
      } else {
        // Flag not found or not enabled, fall back to config
        console.warn(`Flag ${flagName} not found in PostHog or returned non-boolean value:`, flagValue);
        resolve({ enabled: false, source: 'posthog' });
      }
    };

    // If user context is provided, wait a bit for PostHog to identify the user
    if (context?.userId && context?.distinctId) {
      // Wait for PostHog to process the user identification and feature flags
      setTimeout(async () => {
        await checkFlag();
      }, 300);
    } else {
      // No user context, check immediately
      await checkFlag();
    }
  });
}

/**
 * Get fallback flag value from local config
 */
function getFallbackFlag(
  flagName: FeatureFlags,
  context?: FeatureFlagContext
): FeatureFlagResult {
  const config = getFeatureFlagConfig(flagName);
  
  // Check if user is explicitly enabled/disabled
  if (context?.userEmail) {
    if (config.enabledFor?.userEmails?.includes(context.userEmail)) {
      return { enabled: true, source: 'fallback' };
    }
    if (config.disabledFor?.userEmails?.includes(context.userEmail)) {
      return { enabled: false, source: 'fallback' };
    }
  }

  if (context?.userId) {
    if (config.enabledFor?.userIds?.includes(context.userId)) {
      return { enabled: true, source: 'fallback' };
    }
    if (config.disabledFor?.userIds?.includes(context.userId)) {
      return { enabled: false, source: 'fallback' };
    }
  }

  // Check rollout percentage if specified
  if (config.rolloutPercentage !== undefined && context?.distinctId) {
    const hash = simpleHash(context.distinctId);
    const percentage = hash % 100;
    const enabled = percentage < config.rolloutPercentage;
    return { enabled, source: 'fallback' };
  }

  // Return default value
  return { enabled: config.defaultValue, source: 'fallback' };
}

/**
 * Simple hash function for consistent rollout percentages
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Clear the feature flag cache
 */
export function clearFeatureFlagCache(): void {
  flagCache.clear();
}

/**
 * Get multiple feature flags at once
 */
export async function getFeatureFlags(
  flagNames: FeatureFlags[],
  context?: FeatureFlagContext
): Promise<Record<FeatureFlags, FeatureFlagResult>> {
  const results: Record<FeatureFlags, FeatureFlagResult> = {} as Record<FeatureFlags, FeatureFlagResult>;
  
  await Promise.all(
    flagNames.map(async (flagName) => {
      results[flagName] = await getFeatureFlag(flagName, context);
    })
  );
  
  return results;
}

/**
 * Check if a feature flag is enabled (synchronous version for simple checks)
 * Note: This uses cached values and may not be real-time
 */
export function isFeatureFlagEnabled(flagName: FeatureFlags): boolean {
  const config = getFeatureFlagConfig(flagName);
  return config.defaultValue;
}

/**
 * Update early access feature enrollment (PostHog's built-in user opt-in system)
 */
export async function updateEarlyAccessFeatureEnrollment(
  flagKey: string,
  enabled: boolean
): Promise<void> {
  if (!isPostHogConfigured()) {
    console.warn('PostHog not configured for early access feature enrollment');
    return;
  }

  try {
    console.log(`Updating early access feature enrollment: ${flagKey} = ${enabled}`);
    await posthog.updateEarlyAccessFeatureEnrollment(flagKey, enabled);
    console.log(`Early access feature enrollment updated: ${flagKey} = ${enabled}`);
    
    // Clear cache to force refresh
    clearFeatureFlagCache();
    
    // Wait a moment for PostHog to process the change
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.error('Failed to update early access feature enrollment:', error);
    throw error;
  }
}

/**
 * Get all available feature flags from PostHog
 */
export async function getAllPostHogFeatureFlags(): Promise<Array<{
  key: string;
  name?: string;
  description?: string;
  enabled: boolean;
  payload?: unknown;
  isEarlyAccess?: boolean;
}>> {
  if (!isPostHogConfigured()) {
    console.warn('PostHog not configured for feature flag discovery');
    return [];
  }

  // Since PostHog doesn't provide a direct API to get all flags,
  // we'll combine early access features with known flags
  const earlyAccessFeatures = await getEarlyAccessFeatures();
  
  // Convert early access features to feature flag format
  const featureFlags = earlyAccessFeatures.map(feature => ({
    key: feature.flagKey,
    name: feature.name,
    description: feature.description || `Early access feature: ${feature.flagKey}`,
    enabled: feature.enrolled || false,
    payload: undefined,
    isEarlyAccess: true
  }));

  // Add known flags from our config and check their real-time status
  // Note: FeatureFlags enum is currently empty, so this will be empty array
  const knownFlags = Object.values(FeatureFlags).map(flagKey => {
    const isEnabled = posthog.isFeatureEnabled(flagKey as string);
    const rawValue = posthog.getFeatureFlag(flagKey as string);
    
    return {
      key: flagKey as string,
      name: flagKey as string,
      description: `Known feature flag: ${flagKey}`,
      enabled: isEnabled || false,
      payload: rawValue,
      isEarlyAccess: false
    };
  });

  return [...featureFlags, ...knownFlags];
}

/**
 * Get early access features for the current user
 */
export async function getEarlyAccessFeatures(): Promise<Array<{
  flagKey: string;
  name: string;
  description?: string;
  documentationUrl?: string;
  stage: string;
  enrolled?: boolean;
}>> {
  if (!isPostHogConfigured()) {
    console.warn('PostHog not configured for early access features');
    return [];
  }

  return new Promise((resolve) => {
    posthog.getEarlyAccessFeatures((features) => {
      console.log('Early access features loaded:', features);
      // Filter out features without flagKey and map to our expected format
      const validFeatures = features
        .filter((feature) => feature.flagKey)
        .map((feature) => ({
          flagKey: feature.flagKey!,
          name: feature.name,
          description: feature.description || undefined,
          documentationUrl: feature.documentationUrl || undefined,
          stage: feature.stage,
          enrolled: (feature as { enrolled?: boolean }).enrolled || false
        }));
      resolve(validFeatures);
    }, true, ['concept', 'beta']); // Force reload and get concept + beta features
  });
}

/**
 * Check if a user is enrolled in an early access feature
 */
export async function checkEarlyAccessFeatureEnrollment(flagKey: string): Promise<boolean | null> {
  if (!isPostHogConfigured()) {
    console.warn('PostHog not configured for early access feature enrollment check');
    return null;
  }

  return new Promise((resolve) => {
    posthog.getEarlyAccessFeatures((features) => {
      const feature = features.find(f => f.flagKey === flagKey);
      if (feature) {
        console.log(`Early access feature enrollment status for ${flagKey}:`, feature);
        // The feature object should contain enrollment information
        const enrolled = (feature as { enrolled?: boolean }).enrolled || false;
        console.log(`Enrollment status for ${flagKey}: ${enrolled}`);
        resolve(enrolled);
      } else {
        console.log(`Early access feature ${flagKey} not found`);
        resolve(null);
      }
    }, true, ['concept', 'beta']); // Force reload to get latest status
  });
}
