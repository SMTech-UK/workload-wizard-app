// Server-side feature flag exports only
export * from './types';
export * from './config';
export * from './server';

// Re-export commonly used server functions
export {
  getServerFeatureFlag,
  getServerFeatureFlags,
  captureFeatureFlagEvent,
  closePostHogServer,
} from './server';

export {
  FeatureFlags,
} from './types';

export {
  getFeatureFlagConfig,
  getAllFeatureFlagConfigs,
  isValidFeatureFlag,
} from './config';
