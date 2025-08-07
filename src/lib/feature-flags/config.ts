import { FeatureFlags, FeatureFlagConfig } from './types';

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
    description: 'Enables pink mode theme for early access users',
    defaultValue: false,
    rolloutPercentage: 0, // Start with 0% rollout, users must opt-in
  },
};

// Helper function to get flag config
export function getFeatureFlagConfig(flagName: FeatureFlags): FeatureFlagConfig {
  return FEATURE_FLAG_CONFIGS[flagName];
}

// Helper function to get all flag configs
export function getAllFeatureFlagConfigs(): Record<FeatureFlags, FeatureFlagConfig> {
  return FEATURE_FLAG_CONFIGS;
}

// Helper function to check if a flag exists
export function isValidFeatureFlag(flagName: string): flagName is FeatureFlags {
  return Object.values(FeatureFlags).includes(flagName as FeatureFlags);
}
