# Feature Flags Guide

This guide covers the feature flag system implementation using PostHog, designed for easy implementation and best practices.

## Overview

The feature flag system provides:
- **PostHog Integration**: Primary flag management through PostHog
- **Fallback System**: Local configuration when PostHog is unavailable
- **Type Safety**: Full TypeScript support with enum-based flag names
- **React Hooks**: Easy-to-use hooks for components
- **Server-Side Support**: API routes and server-side flag checking
- **Caching**: Client-side caching to reduce API calls
- **Debug Tools**: Development-only debug panel

## Quick Start

### 1. Environment Setup

Add these environment variables to your `.env.local`:

```bash
# PostHog Configuration
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
POSTHOG_API_KEY=your_posthog_project_api_key
POSTHOG_HOST=https://eu.i.posthog.com
```

### 2. Basic Usage in Components

```tsx
import { useFeatureFlag, FeatureFlags } from '@/hooks/useFeatureFlag';
import { FeatureFlag, FeatureFlagSwitch } from '@/components/feature-flags/FeatureFlag';

// Using hooks
function MyComponent() {
  const { enabled, loading, error } = useFeatureFlag(FeatureFlags.NEW_DASHBOARD_UI);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading feature flag</div>;
  
  return enabled ? <NewDashboard /> : <OldDashboard />;
}

// Using components
function MyComponent() {
  return (
    <FeatureFlag flag={FeatureFlags.NEW_DASHBOARD_UI}>
      <NewDashboard />
    </FeatureFlag>
  );
}

// Using switch component
function MyComponent() {
  return (
    <FeatureFlagSwitch
      flag={FeatureFlags.NEW_DASHBOARD_UI}
      enabled={<NewDashboard />}
      disabled={<OldDashboard />}
    />
  );
}
```

### 3. Server-Side Usage

```tsx
// In API routes or server components
import { getServerFeatureFlag, FeatureFlags } from '@/lib/feature-flags';

export async function GET(request: Request) {
  const flag = await getServerFeatureFlag(FeatureFlags.NEW_DASHBOARD_UI, {
    userId: 'user123',
    distinctId: 'user123',
  });
  
  if (flag.enabled) {
    // Return new feature
  } else {
    // Return old feature
  }
}
```

## Adding New Feature Flags

### 1. Define the Flag

Add your flag to the `FeatureFlags` enum in `src/lib/feature-flags/types.ts`:

```typescript
export enum FeatureFlags {
  // ... existing flags
  MY_NEW_FEATURE = 'my_new_feature',
}
```

### 2. Configure the Flag

Add configuration in `src/lib/feature-flags/config.ts`:

```typescript
export const FEATURE_FLAG_CONFIGS: Record<FeatureFlags, FeatureFlagConfig> = {
  // ... existing configs
  [FeatureFlags.MY_NEW_FEATURE]: {
    name: FeatureFlags.MY_NEW_FEATURE,
    description: 'Enables my new feature with improved functionality',
    defaultValue: false,
    rolloutPercentage: 25, // 25% rollout initially
    enabledFor: {
      userEmails: ['admin@example.com'], // Enable for specific users
    },
  },
};
```

### 3. Use the Flag

```tsx
import { useFeatureFlag, FeatureFlags } from '@/hooks/useFeatureFlag';

function MyComponent() {
  const { enabled } = useFeatureFlag(FeatureFlags.MY_NEW_FEATURE);
  
  return enabled ? <NewFeature /> : <OldFeature />;
}
```

## Advanced Usage

### Multiple Flags

```tsx
import { useFeatureFlags, useAnyFeatureFlag, useAllFeatureFlags } from '@/hooks/useFeatureFlag';

function MyComponent() {
  // Check multiple flags
  const { flags } = useFeatureFlags([
    FeatureFlags.NEW_DASHBOARD_UI,
    FeatureFlags.ADVANCED_ANALYTICS,
  ]);
  
  // Check if any flag is enabled
  const { enabled: anyEnabled } = useAnyFeatureFlag([
    FeatureFlags.BETA_FEATURES,
    FeatureFlags.ADVANCED_ANALYTICS,
  ]);
  
  // Check if all flags are enabled
  const { enabled: allEnabled } = useAllFeatureFlags([
    FeatureFlags.EMAIL_NOTIFICATIONS,
    FeatureFlags.REAL_TIME_UPDATES,
  ]);
}
```

### Context and User Properties

```tsx
function MyComponent() {
  const { enabled } = useFeatureFlag(FeatureFlags.BETA_FEATURES, {
    userProperties: {
      plan: 'premium',
      region: 'us',
    },
  });
}
```

### API Usage

```typescript
// Get all flags
const response = await fetch('/api/feature-flags');
const { flags } = await response.json();

// Get specific flags
const response = await fetch('/api/feature-flags?flags=new_dashboard_ui,beta_features');
const { flags } = await response.json();
```

## Best Practices

### 1. Flag Naming

- Use `UPPERCASE_WITH_UNDERSCORE` convention
- Be descriptive and specific
- Include the feature name and version if applicable

```typescript
// Good
NEW_DASHBOARD_UI = 'new_dashboard_ui'
USER_MANAGEMENT_V2 = 'user_management_v2'

// Avoid
NEW_UI = 'new_ui'
V2 = 'v2'
```

### 2. Flag Lifecycle

1. **Development**: Create flag with `defaultValue: false`
2. **Testing**: Enable for specific users or small percentage
3. **Rollout**: Gradually increase rollout percentage
4. **Cleanup**: Remove flag after full rollout

### 3. Fallback Strategy

Always provide fallback behavior:

```tsx
<FeatureFlag flag={FeatureFlags.NEW_FEATURE}>
  <NewFeature />
  <OldFeature /> {/* fallback */}
</FeatureFlag>
```

### 4. Performance

- Use caching (built-in)
- Check flags early in component tree
- Avoid checking flags in render loops

### 5. Testing

```tsx
// Test with specific context
const { enabled } = useFeatureFlag(FeatureFlags.BETA_FEATURES, {
  userProperties: { testUser: true },
});
```

## Debug Tools

### Development Debug Panel

The `FeatureFlagDebug` component is automatically available in development:

```tsx
import { FeatureFlagDebug } from '@/components/feature-flags/FeatureFlagDebug';

// Add to your layout or page
<FeatureFlagDebug />
```

This provides:
- Real-time flag status
- Cache management
- Flag refresh capabilities
- Source information (PostHog vs fallback)

### Cache Management

```tsx
import { useClearFeatureFlagCache } from '@/hooks/useFeatureFlag';

function MyComponent() {
  const clearCache = useClearFeatureFlagCache();
  
  return (
    <button onClick={clearCache}>
      Clear Feature Flag Cache
    </button>
  );
}
```

## PostHog Integration

### Setting Up Flags in PostHog

1. Go to your PostHog dashboard
2. Navigate to Feature Flags
3. Create a new flag with the same name as your enum
4. Configure targeting rules
5. Set rollout percentages

### Flag Types

- **Boolean flags**: Simple on/off
- **String flags**: With payload data
- **JSON flags**: Complex configuration

### Targeting

- **User properties**: Target based on user attributes
- **Rollout percentages**: Gradual feature rollouts
- **Specific users**: Enable for specific user IDs or emails

## Troubleshooting

### Common Issues

1. **Flag not working**: Check PostHog configuration and API keys
2. **Cache issues**: Use debug panel to clear cache
3. **Type errors**: Ensure flag name exists in enum
4. **Server/client mismatch**: Use appropriate client/server functions

### Debug Steps

1. Check browser console for errors
2. Use debug panel to verify flag status
3. Verify PostHog configuration
4. Check environment variables
5. Test with fallback values

## Migration Guide

### From Other Systems

1. **LaunchDarkly**: Replace `useFlags()` with `useFeatureFlag()`
2. **ConfigCat**: Replace `useFeatureFlag()` with our implementation
3. **Custom**: Migrate flag names to enum format

### Flag Cleanup

When removing flags:

1. Remove from enum
2. Remove from config
3. Update components to remove flag checks
4. Remove from PostHog dashboard

## Security Considerations

- Feature flags are client-side and can be manipulated
- Don't use flags for security controls
- Use server-side validation for sensitive features
- Consider flag values in audit logs

## Performance Impact

- Client-side caching reduces API calls
- PostHog calls are batched when possible
- Fallback system ensures functionality during outages
- Minimal bundle size impact

## Support

For issues or questions:
1. Check this documentation
2. Review PostHog documentation
3. Use debug tools in development
4. Check console for error messages
