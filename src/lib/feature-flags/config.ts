import { FeatureFlags, FeatureFlagConfig } from "./types";

// Feature flag configurations
// Add new flags here with proper descriptions and default values
export const FEATURE_FLAG_CONFIGS: Record<FeatureFlags, FeatureFlagConfig> = {
  // Add your feature flag configurations here
  // Example:
  // [FeatureFlags.NEW_DASHBOARD]: {
  //   name: FeatureFlags.NEW_DASHBOARD,
  //   description: 'Enables the new dashboard UI',
  //   defaultValue: false,
  // },
  [FeatureFlags.PINK_MODE]: {
    name: FeatureFlags.PINK_MODE,
    description: "Enables pink mode theme for early access users",
    defaultValue: false,
    rolloutPercentage: 0, // Start with 0% rollout, users must opt-in
    stage: "beta",
    stagingOnly: true,
  },
  [FeatureFlags.NEW_ALLOCATION_UI]: {
    name: FeatureFlags.NEW_ALLOCATION_UI,
    description: "Enables the new experimental allocation interface",
    defaultValue: false,
    rolloutPercentage: 10, // 10% rollout for testing
    stage: "alpha",
  },
  [FeatureFlags.ADVANCED_AUDIT_LOGS]: {
    name: FeatureFlags.ADVANCED_AUDIT_LOGS,
    description: "Enables enhanced audit logging with detailed tracking",
    defaultValue: true,
    rolloutPercentage: 100, // Full rollout
    stage: "stable",
  },
  [FeatureFlags.BETA_FEATURES]: {
    name: FeatureFlags.BETA_FEATURES,
    description:
      "Enables access to beta features and experimental functionality",
    defaultValue: false,
    rolloutPercentage: 5, // 5% rollout for beta testers
    stage: "beta",
  },
  [FeatureFlags.EXPERIMENTAL_PERMISSIONS]: {
    name: FeatureFlags.EXPERIMENTAL_PERMISSIONS,
    description: "Enables the new experimental permissions system",
    defaultValue: false,
    rolloutPercentage: 0, // No rollout, admin override only
    stage: "concept",
    stagingOnly: true,
  },
  [FeatureFlags.ACADEMIC_YEAR_BULK_OPS]: {
    name: FeatureFlags.ACADEMIC_YEAR_BULK_OPS,
    description: "Enable bulk publish/archive for Academic Years",
    defaultValue: false,
    rolloutPercentage: 0,
    stage: "beta",
  },
};

// Helper function to get flag config
export function getFeatureFlagConfig(
  flagName: FeatureFlags,
): FeatureFlagConfig {
  return FEATURE_FLAG_CONFIGS[flagName];
}

// Helper function to get all flag configs
export function getAllFeatureFlagConfigs(): Record<
  FeatureFlags,
  FeatureFlagConfig
> {
  return FEATURE_FLAG_CONFIGS;
}

// Helper function to check if a flag exists
export function isValidFeatureFlag(flagName: string): flagName is FeatureFlags {
  return Object.values(FeatureFlags).includes(flagName as FeatureFlags);
}
