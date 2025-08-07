// Feature flag names - use UPPERCASE_WITH_UNDERSCORE convention
export enum FeatureFlags {
  // Add your feature flags here
  // Example: NEW_DASHBOARD = 'new_dashboard',
  PINK_MODE = 'pink-mode',
}

// Feature flag configuration interface
export interface FeatureFlagConfig {
  name: FeatureFlags;
  description: string;
  defaultValue: boolean;
  rolloutPercentage?: number; // 0-100, for gradual rollouts
  enabledFor?: {
    userIds?: string[];
    userEmails?: string[];
    userProperties?: Record<string, unknown>;
  };
  disabledFor?: {
    userIds?: string[];
    userEmails?: string[];
    userProperties?: Record<string, unknown>;
  };
}

// Feature flag result interface
export interface FeatureFlagResult {
  enabled: boolean;
  payload?: unknown;
  source?: 'posthog' | 'fallback' | 'override' | 'local-override';
}

// Feature flag context for evaluation
export interface FeatureFlagContext {
  userId?: string;
  userEmail?: string;
  userProperties?: Record<string, unknown>;
  sessionId?: string;
  distinctId?: string;
  groups?: Record<string, string>;
}
