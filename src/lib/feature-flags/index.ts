// Main feature flag exports
export * from './types';
export * from './config';
export * from './client';
// Server exports are only available server-side
// export * from './server';

// Re-export commonly used functions for easier imports
export {
  getFeatureFlag,
  getFeatureFlags,
  isFeatureFlagEnabled,
  clearFeatureFlagCache,
} from './client';

// Server functions are only available server-side
// export {
//   getServerFeatureFlag,
//   getServerFeatureFlags,
//   captureFeatureFlagEvent,
//   closePostHogServer,
// } from './server';

export {
  FeatureFlags,
} from './types';

export {
  getFeatureFlagConfig,
  getAllFeatureFlagConfigs,
  isValidFeatureFlag,
} from './config';
