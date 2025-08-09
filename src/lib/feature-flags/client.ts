import posthog from "posthog-js";
import { FeatureFlags, FeatureFlagResult, FeatureFlagContext } from "./types";
import { getFeatureFlagConfig, isValidFeatureFlag } from "./config";
import { getUserFeatureFlagContext } from "./auth-integration";

// Cache for feature flag results to avoid repeated PostHog calls
const flagCache = new Map<string, FeatureFlagResult>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedFlagResult extends FeatureFlagResult {
  timestamp: number;
}

// Local storage for feature flag overrides (for flags that can't be set via PostHog client API)
const LOCAL_FLAG_OVERRIDES_KEY = "feature-flag-overrides";

function getLocalFlagOverrides(): Record<string, boolean> {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(LOCAL_FLAG_OVERRIDES_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    Object.keys(parsed).forEach((k) => {
      if (typeof parsed[k] !== "boolean") delete parsed[k];
    });
    return parsed;
  } catch (error) {
    console.warn("Failed to get local flag overrides:", error);
    return {};
  }
}

function setLocalFlagOverride(flagKey: string, enabled: boolean): void {
  if (typeof window === "undefined") return;

  try {
    const overrides = getLocalFlagOverrides();
    overrides[flagKey] = enabled;
    localStorage.setItem(LOCAL_FLAG_OVERRIDES_KEY, JSON.stringify(overrides));
    console.log(`Local flag override set: ${flagKey} = ${enabled}`);
  } catch (error) {
    console.warn("Failed to set local flag override:", error);
  }
}

function clearLocalFlagOverride(flagKey: string): void {
  if (typeof window === "undefined") return;

  try {
    const overrides = getLocalFlagOverrides();
    delete overrides[flagKey];
    localStorage.setItem(LOCAL_FLAG_OVERRIDES_KEY, JSON.stringify(overrides));
    console.log(`Local flag override cleared: ${flagKey}`);
  } catch (error) {
    console.warn("Failed to clear local flag override:", error);
  }
}

/**
 * Check if PostHog is properly configured
 */
function isPostHogConfigured(): boolean {
  const isConfigured =
    typeof window !== "undefined" &&
    !!process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    !!posthog;

  if (!isConfigured) {
    console.warn("PostHog not configured:", {
      hasWindow: typeof window !== "undefined",
      hasKey: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
      hasPostHog: !!posthog,
    });
  }

  return isConfigured;
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
  forceRefresh: boolean = false,
): Promise<FeatureFlagResult> {
  // Validate flag name
  if (!isValidFeatureFlag(String(flagName))) {
    console.warn(`Invalid feature flag name: ${flagName}`);
    return { enabled: false, source: "fallback" };
  }

  const cacheKey = `${flagName}-${JSON.stringify(context || {})}`;

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = flagCache.get(cacheKey) as CachedFlagResult | undefined;
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached;
    }
  }

  // Check local overrides first (highest priority)
  const localOverrides = getLocalFlagOverrides();
  if (Object.prototype.hasOwnProperty.call(localOverrides, flagName)) {
    const result: FeatureFlagResult = {
      enabled: !!localOverrides[flagName],
      source: "local-override",
    };

    // Cache the result
    flagCache.set(cacheKey, {
      ...result,
      timestamp: Date.now(),
    } as CachedFlagResult);
    return result;
  }

  try {
    // Try PostHog first if properly configured
    if (isPostHogConfigured()) {
      const posthogResult = await getPostHogFlag(flagName, context);
      const result: FeatureFlagResult = {
        enabled: posthogResult.enabled,
        payload: posthogResult.payload,
        source: "posthog",
      };

      // Cache the result
      flagCache.set(cacheKey, {
        ...result,
        timestamp: Date.now(),
      } as CachedFlagResult);
      return result;
    } else {
      console.warn(
        "PostHog not configured, using fallback for feature flag:",
        flagName,
      );
    }
  } catch (error) {
    console.warn(`PostHog feature flag check failed for ${flagName}:`, error);
  }

  // Fallback to config defaults
  const fallbackResult = getFallbackFlag(flagName, context);
  flagCache.set(cacheKey, {
    ...fallbackResult,
    timestamp: Date.now(),
  } as CachedFlagResult);
  return fallbackResult;
}

/**
 * Get a feature flag value with automatic user context from Clerk
 * This is the recommended way to use feature flags in components
 */
export async function getFeatureFlagWithUser(
  flagName: FeatureFlags,
  forceRefresh: boolean = false,
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
  context?: FeatureFlagContext,
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
          posthog.getEarlyAccessFeatures(
            (features) => {
              const feature = features.find(
                (f) => f.flagKey === String(flagName),
              );
              if (feature) {
                isEarlyAccessFeature = true;
                earlyAccessEnrolled =
                  (feature as { enrolled?: boolean }).enrolled || false;
              }
              resolve();
            },
            false,
            ["concept", "beta"],
          );
        } catch (error) {
          console.warn("Failed to check early access features:", error);
          resolve();
        }
      });

      // Wait for early access feature check to complete
      await checkEarlyAccessFeatures;

      console.log("PostHog feature flag check:", {
        flagName,
        flagValue,
        rawFlagValue,
        isEarlyAccessFeature,
        earlyAccessEnrolled,
        context: {
          userId: context?.userId,
          userEmail: context?.userEmail,
          distinctId: context?.distinctId,
        },
        posthogUser: posthog.get_distinct_id(),
        isIdentified: posthog.isFeatureEnabled("test_flag") !== null,
        personProfiles: posthog.getFeatureFlag("test_flag") !== null, // Check if person profiles are working
      });

      // For early access features, only return true if user is enrolled
      if (isEarlyAccessFeature) {
        resolve({ enabled: earlyAccessEnrolled, source: "posthog" });
        return;
      }

      // Handle the boolean result from isFeatureEnabled for regular feature flags
      if (typeof flagValue === "boolean") {
        resolve({ enabled: flagValue, source: "posthog" });
      } else {
        // Flag not found or not enabled, fall back to config
        console.warn(
          `Flag ${flagName} not found in PostHog or returned non-boolean value:`,
          flagValue,
        );
        resolve({ enabled: false, source: "posthog" });
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
  context?: FeatureFlagContext,
): Promise<Record<FeatureFlags, FeatureFlagResult>> {
  const results: Record<FeatureFlags, FeatureFlagResult> = {} as Record<
    FeatureFlags,
    FeatureFlagResult
  >;

  await Promise.all(
    flagNames.map(async (flagName) => {
      results[flagName] = await getFeatureFlag(flagName, context);
    }),
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
 * This handles both PostHog early access features and local feature flags
 */
export async function updateEarlyAccessFeatureEnrollment(
  flagKey: string,
  enabled: boolean,
): Promise<void> {
  if (!isPostHogConfigured()) {
    console.warn("PostHog not configured for early access feature enrollment");
    return;
  }

  try {
    console.log(
      `Updating early access feature enrollment: ${flagKey} = ${enabled}`,
    );

    // First, check if this is a local feature flag that should be treated as early access
    const isLocalFeatureFlag = Object.values(FeatureFlags).includes(
      flagKey as FeatureFlags,
    );
    if (isLocalFeatureFlag) {
      const config = getFeatureFlagConfig(flagKey as FeatureFlags);
      if (config && config.rolloutPercentage === 0) {
        // For local early access features like pink-mode, we'll use a local override system
        // since we can't directly set feature flag values through PostHog's client API
        console.log(
          `Local early access feature ${flagKey} toggle requested: ${enabled}`,
        );

        // Set local override for this feature flag
        setLocalFlagOverride(flagKey, enabled);

        // Clear cache to force refresh
        clearFeatureFlagCache();

        console.log(`Local override set for ${flagKey}: ${enabled}`);
        return;
      }
    }

    // Check if this is a PostHog early access feature
    const isPostHogEarlyAccessFeature = await new Promise<boolean>(
      (resolve) => {
        try {
          posthog.getEarlyAccessFeatures(
            (features) => {
              const feature = features.find((f) => f.flagKey === flagKey);
              resolve(!!feature);
            },
            true,
            ["concept", "beta"],
          );
        } catch (error) {
          console.warn("Failed to check PostHog early access features:", error);
          resolve(false);
        }
      },
    );

    if (isPostHogEarlyAccessFeature) {
      // Update the enrollment for PostHog early access features
      try {
        // Check if the method exists before calling it
        if (typeof posthog.updateEarlyAccessFeatureEnrollment === "function") {
          await posthog.updateEarlyAccessFeatureEnrollment(flagKey, enabled);
          console.log(
            `PostHog early access feature enrollment updated: ${flagKey} = ${enabled}`,
          );
        } else {
          console.warn(
            "PostHog updateEarlyAccessFeatureEnrollment method not available",
          );
          // Fall back to just logging the request
          console.log(
            `Early access feature enrollment requested: ${flagKey} = ${enabled}`,
          );
        }
      } catch (error) {
        console.warn(
          "Failed to update PostHog early access feature enrollment:",
          error,
        );
        // Continue with the process even if PostHog update fails
      }
    } else {
      console.log(
        `Feature ${flagKey} is not a PostHog early access feature and not a local early access feature flag`,
      );
    }

    // Clear cache to force refresh
    clearFeatureFlagCache();

    // Wait a moment for PostHog to process the change
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the change was applied (but don't fail if verification fails)
    try {
      const verificationStatus =
        await checkEarlyAccessFeatureEnrollment(flagKey);
      console.log(
        `Verification status for ${flagKey}: ${verificationStatus}, expected: ${enabled}`,
      );

      if (verificationStatus !== enabled) {
        console.warn(
          `Enrollment change verification failed for ${flagKey}: expected ${enabled}, got ${verificationStatus}`,
        );
        // Try one more time after a longer delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const secondVerification =
          await checkEarlyAccessFeatureEnrollment(flagKey);
        console.log(
          `Second verification for ${flagKey}: ${secondVerification}`,
        );

        if (secondVerification !== enabled) {
          console.warn(
            `Enrollment change verification failed after retry for ${flagKey}: expected ${enabled}, got ${secondVerification}`,
          );
          // Don't throw an error, just log the warning
          // PostHog can sometimes have delays in reporting the correct status
          console.log(
            `Proceeding with the change despite verification mismatch - PostHog may have delays`,
          );
        }
      } else {
        console.log(`Enrollment change verified successfully for ${flagKey}`);
      }
    } catch (verificationError) {
      console.warn("Failed to verify enrollment change:", verificationError);
      // Don't throw an error for verification failures
      console.log(`Proceeding with the change despite verification failure`);
    }
  } catch (error) {
    console.error("Failed to update early access feature enrollment:", error);
    // Don't throw the error, just log it and continue
    // This allows the UI to continue working even if PostHog is having issues
  }
}

/**
 * Get all available feature flags from PostHog
 */
export async function getAllPostHogFeatureFlags(): Promise<
  Array<{
    key: string;
    name?: string;
    description?: string;
    enabled: boolean;
    payload?: unknown;
    isEarlyAccess?: boolean;
  }>
> {
  if (!isPostHogConfigured()) {
    console.warn("PostHog not configured for feature flag discovery");
    return [];
  }

  return new Promise((resolve) => {
    try {
      // Get PostHog early access features only (not local ones)
      posthog.getEarlyAccessFeatures(
        (posthogFeatures) => {
          try {
            console.log(
              "PostHog early access features for getAllPostHogFeatureFlags:",
              posthogFeatures,
            );

            // Filter out features without flagKey and map to our expected format
            const featureFlags = posthogFeatures
              .filter((feature) => feature.flagKey)
              .map((feature) => {
                const enrolled =
                  (feature as { enrolled?: boolean }).enrolled || false;
                console.log(
                  `PostHog feature ${feature.flagKey} enrollment status:`,
                  enrolled,
                );
                return {
                  key: feature.flagKey!,
                  name: feature.name,
                  description:
                    feature.description ||
                    `PostHog early access feature: ${feature.flagKey}`,
                  enabled: enrolled,
                  payload: undefined,
                  isEarlyAccess: true,
                };
              });

            console.log("All PostHog feature flags:", featureFlags);
            resolve(featureFlags);
          } catch (error) {
            console.warn(
              "Error processing PostHog early access features:",
              error,
            );
            resolve([]);
          }
        },
        true,
        ["concept", "beta"],
      ); // Force reload to get latest status
    } catch (error) {
      console.warn("Failed to get PostHog feature flags:", error);
      resolve([]);
    }
  });
}

/**
 * Get early access features for the current user
 * This combines PostHog early access features with locally configured feature flags
 */
export async function getEarlyAccessFeatures(): Promise<
  Array<{
    flagKey: string;
    name: string;
    description?: string;
    documentationUrl?: string;
    stage: string;
    enrolled?: boolean;
  }>
> {
  if (!isPostHogConfigured()) {
    console.warn("PostHog not configured for early access features");
    return [];
  }

  return new Promise(async (resolve) => {
    try {
      // First, get PostHog early access features
      posthog.getEarlyAccessFeatures(
        (posthogFeatures) => {
          try {
            console.log(
              "PostHog early access features loaded:",
              posthogFeatures,
            );

            // Filter out features without flagKey and map to a loose format compatible with our UI
            const validPosthogFeatures = posthogFeatures
              .filter((feature) => feature.flagKey)
              .map((feature) => {
                const enrolled =
                  (feature as { enrolled?: boolean }).enrolled || false;
                console.log(
                  `PostHog feature ${feature.flagKey} enrollment status:`,
                  enrolled,
                );
                const obj: {
                  flagKey: string;
                  name: string;
                  description?: string;
                  documentationUrl?: string;
                  stage: string;
                  enrolled?: boolean;
                } = {
                  flagKey: feature.flagKey!,
                  name: feature.name,
                  stage: feature.stage,
                };
                if (feature.description) obj.description = feature.description;
                if (feature.documentationUrl)
                  obj.documentationUrl = feature.documentationUrl;
                obj.enrolled = enrolled;
                return obj;
              });

            // Then, add our locally configured feature flags that should be treated as early access
            const localEarlyAccessFeatures = Object.values(FeatureFlags)
              .filter((flagKey) => {
                // Only include flags that are configured as early access features
                const config = getFeatureFlagConfig(flagKey);
                return config && config.rolloutPercentage === 0; // 0% rollout indicates early access
              })
              .map((flagKey) => {
                const config = getFeatureFlagConfig(flagKey);

                // Check local override first, then PostHog
                const localOverrides = getLocalFlagOverrides();
                let isEnabled = false;

                if (
                  Object.prototype.hasOwnProperty.call(localOverrides, flagKey)
                ) {
                  isEnabled = !!localOverrides[flagKey];
                  console.log(
                    `Local early access feature ${flagKey} status from override:`,
                    isEnabled,
                  );
                } else {
                  isEnabled = posthog.isFeatureEnabled(flagKey) || false;
                  console.log(
                    `Local early access feature ${flagKey} status from PostHog:`,
                    isEnabled,
                  );
                }

                const obj: {
                  flagKey: string;
                  name: string;
                  description?: string;
                  documentationUrl?: string;
                  stage: string;
                  enrolled?: boolean;
                } = {
                  flagKey: flagKey,
                  name: config?.description || flagKey,
                  stage: "beta",
                };
                if (config?.description) obj.description = config.description;
                obj.enrolled = !!isEnabled;
                return obj;
              });

            // Combine both sets of features, avoiding duplicates
            const allFeatures: Array<{
              flagKey: string;
              name: string;
              description?: string;
              documentationUrl?: string;
              stage: string;
              enrolled?: boolean;
            }> = [...validPosthogFeatures];

            // Add local features that aren't already in PostHog features
            localEarlyAccessFeatures.forEach((localFeature) => {
              const exists = allFeatures.some(
                (f) => f.flagKey === localFeature.flagKey,
              );
              if (!exists) {
                allFeatures.push(localFeature);
              }
            });

            console.log("Combined early access features:", allFeatures);
            resolve(
              allFeatures as Array<{
                flagKey: string;
                name: string;
                description?: string;
                documentationUrl?: string;
                stage: string;
                enrolled?: boolean;
              }>,
            );
          } catch (error) {
            console.warn("Error processing early access features:", error);
            // Fall back to just local features if PostHog processing fails
            const localEarlyAccessFeatures = Object.values(FeatureFlags)
              .filter((flagKey) => {
                const config = getFeatureFlagConfig(flagKey);
                return config && config.rolloutPercentage === 0;
              })
              .map((flagKey) => {
                const config = getFeatureFlagConfig(flagKey);
                const isEnabled = posthog.isFeatureEnabled(flagKey);

                return {
                  flagKey: flagKey,
                  name: config?.description || flagKey,
                  description:
                    config?.description || `Early access feature: ${flagKey}`,
                  documentationUrl: undefined,
                  stage: "beta" as const,
                  enrolled: isEnabled || false,
                };
              });

            resolve(
              localEarlyAccessFeatures.map((f) => ({
                flagKey: f.flagKey,
                name: f.name,
                ...(f.description ? { description: f.description } : {}),
                ...(f.documentationUrl
                  ? { documentationUrl: f.documentationUrl }
                  : {}),
                stage: f.stage,
                enrolled: f.enrolled,
              })) as Array<{
                flagKey: string;
                name: string;
                description?: string;
                documentationUrl?: string;
                stage: string;
                enrolled?: boolean;
              }>,
            );
          }
        },
        true,
        ["concept", "beta"],
      ); // Force reload and get concept + beta features
    } catch (error) {
      console.warn("Failed to get PostHog early access features:", error);
      // Fall back to just local features if PostHog is completely unavailable
      const localEarlyAccessFeatures = Object.values(FeatureFlags)
        .filter((flagKey) => {
          const config = getFeatureFlagConfig(flagKey);
          return config && config.rolloutPercentage === 0;
        })
        .map((flagKey) => {
          const config = getFeatureFlagConfig(flagKey);

          return {
            flagKey: flagKey,
            name: config?.description || flagKey,
            description:
              config?.description || `Early access feature: ${flagKey}`,
            documentationUrl: undefined,
            stage: "beta" as const,
            enrolled: false, // Default to false if PostHog is unavailable
          };
        });

      resolve(
        localEarlyAccessFeatures.map((f) => ({
          flagKey: f.flagKey,
          name: f.name,
          ...(f.description ? { description: f.description } : {}),
          ...(f.documentationUrl
            ? { documentationUrl: f.documentationUrl }
            : {}),
          stage: f.stage,
          enrolled: f.enrolled,
        })) as Array<{
          flagKey: string;
          name: string;
          description?: string;
          documentationUrl?: string;
          stage: string;
          enrolled?: boolean;
        }>,
      );
    }
  });
}

/**
 * Check if a user is enrolled in an early access feature
 * This handles both PostHog early access features and local feature flags
 */
export async function checkEarlyAccessFeatureEnrollment(
  flagKey: string,
): Promise<boolean | null> {
  // First check if this is a local feature flag
  const isLocalFeatureFlag = Object.values(FeatureFlags).includes(
    flagKey as FeatureFlags,
  );
  if (isLocalFeatureFlag) {
    const config = getFeatureFlagConfig(flagKey as FeatureFlags);
    if (config && config.rolloutPercentage === 0) {
      // This is a local early access feature flag
      // Check local override first, then fallback to config default
      const localOverrides = getLocalFlagOverrides();
      if (Object.prototype.hasOwnProperty.call(localOverrides, flagKey)) {
        console.log(
          `Local early access feature ${flagKey} status from override:`,
          localOverrides[flagKey],
        );
        return !!localOverrides[flagKey];
      }

      // Return the config default value for local features
      console.log(
        `Local early access feature ${flagKey} status from config default:`,
        config.defaultValue,
      );
      return config.defaultValue;
    }
  }

  // For PostHog features, check if PostHog is configured
  if (!isPostHogConfigured()) {
    console.warn(
      "PostHog not configured for early access feature enrollment check",
    );
    return null;
  }

  return new Promise((resolve) => {
    try {
      posthog.getEarlyAccessFeatures(
        (features) => {
          try {
            const feature = features.find((f) => f.flagKey === flagKey);
            if (feature) {
              console.log(
                `Early access feature enrollment status for ${flagKey}:`,
                feature,
              );
              // The feature object should contain enrollment information
              const enrolled =
                (feature as { enrolled?: boolean }).enrolled || false;
              console.log(`Enrollment status for ${flagKey}: ${enrolled}`);

              // Also check if the feature flag is enabled for this user
              const isFeatureEnabled = posthog.isFeatureEnabled(flagKey);
              console.log(
                `Feature flag ${flagKey} enabled status:`,
                isFeatureEnabled,
              );

              // For early access features, prefer the enrollment status over the feature flag status
              // because enrollment status is more reliable for early access features
              if (typeof isFeatureEnabled === "boolean") {
                console.log(
                  `Feature flag ${flagKey} boolean status: ${isFeatureEnabled}, enrollment: ${enrolled}`,
                );
                // If there's a mismatch, log it for debugging but still return the enrollment status
                if (isFeatureEnabled !== enrolled) {
                  console.warn(
                    `Enrollment/feature flag mismatch for ${flagKey}: enrolled=${enrolled}, featureEnabled=${isFeatureEnabled}`,
                  );
                  console.warn(
                    "Using enrollment status as the source of truth for early access features",
                  );
                }
              }

              resolve(enrolled);
            } else {
              console.log(
                `Early access feature ${flagKey} not found in PostHog`,
              );
              resolve(null);
            }
          } catch (error) {
            console.warn("Error processing early access feature:", error);
            resolve(null);
          }
        },
        true,
        ["concept", "beta"],
      ); // Force reload to get latest status
    } catch (error) {
      console.warn("Failed to get early access features:", error);
      resolve(null);
    }
  });
}

/**
 * Test PostHog connection and functionality
 */
export async function testPostHogConnection(): Promise<{
  isConfigured: boolean;
  canConnect: boolean;
  hasUser: boolean;
  error?: string;
}> {
  if (!isPostHogConfigured()) {
    return {
      isConfigured: false,
      canConnect: false,
      hasUser: false,
      error: "PostHog not configured",
    };
  }

  try {
    // Test basic PostHog functionality
    const hasUser = !!posthog.get_distinct_id();

    // Test if we can make a simple API call
    let canConnect = false;
    try {
      // Try to get early access features as a test
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Timeout")), 5000);

        posthog.getEarlyAccessFeatures(
          (features) => {
            clearTimeout(timeout);
            canConnect = true;
            resolve(features);
          },
          false,
          ["concept", "beta"],
        );
      });
    } catch (error) {
      console.warn("PostHog connection test failed:", error);
      canConnect = false;
    }

    return {
      isConfigured: true,
      canConnect,
      hasUser,
    };
  } catch (error) {
    return {
      isConfigured: true,
      canConnect: false,
      hasUser: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
