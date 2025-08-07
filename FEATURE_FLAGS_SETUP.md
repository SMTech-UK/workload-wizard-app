# 🚀 Feature Flags Setup Guide

## Quick Setup

### 1. PostHog Configuration

Add these environment variables to your `.env.local` file:

```bash
# PostHog Configuration (Required for feature flags)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com  # Optional, defaults to eu.i.posthog.com
```

### 2. Create Feature Flag in PostHog

1. Go to your PostHog dashboard
2. Navigate to **Feature Flags**
3. Click **New feature flag**
4. Set the flag key to: `beta_features`
5. Set the flag name to: `BETA_FEATURES`
6. Choose **Boolean** as the flag type
7. Set the default value to **False**
8. Click **Save**

### 3. Test the Feature Flag

1. Visit `/feature-flag-test` in your app
2. Check the **PostHog Configuration** section to ensure everything is set up
3. Enable the `BETA_FEATURES` flag in PostHog dashboard
4. Refresh the page - you should see:
   - Purple banner at the top: "🚀 BETA FEATURES ENABLED!"
   - Blue "BETA MODE" indicator in the sidebar
   - Status showing "ENABLED" in the test page

## How It Works

### Current Feature Flags

- **BETA_FEATURES**: Controls beta features visibility
  - When enabled: Shows purple banner and sidebar indicator
  - When disabled: No special indicators shown

### Components

- `FeatureFlagTestBanner`: Purple banner at top of page
- `FeatureFlagTestSidebar`: Blue indicator in sidebar
- `FeatureFlagDebug`: Debug panel (development only)
- `FeatureFlagToggle`: Interactive toggle component

### Testing

1. **Enable in PostHog**: Go to PostHog dashboard → Feature Flags → BETA_FEATURES → Enable
2. **Check persistence**: Refresh page or navigate away and back
3. **Test components**: Look for purple banner and sidebar indicator
4. **Debug**: Use the debug panel in bottom-right corner

## Troubleshooting

### Browser Crashes
- ✅ Fixed: Simplified feature flag system to only use BETA_FEATURES
- ✅ Fixed: Added proper error handling and fallbacks
- ✅ Fixed: Removed references to non-existent flags

### Feature Flag Not Working
1. Check PostHog configuration in `/feature-flag-test`
2. Ensure `NEXT_PUBLIC_POSTHOG_KEY` is set correctly
3. Verify the flag is enabled in PostHog dashboard
4. Check browser console for errors

### Missing Banner/Sidebar Indicator
1. Ensure you're authenticated (feature flags require user context)
2. Check that the flag is enabled in PostHog
3. Try refreshing the page
4. Check the debug panel for flag status

## Development

### Adding New Feature Flags

1. Add to `src/lib/feature-flags/types.ts`:
```typescript
export enum FeatureFlags {
  BETA_FEATURES = 'beta_features',
  NEW_FEATURE = 'new_feature', // Add new flags here
}
```

2. Add configuration to `src/lib/feature-flags/config.ts`:
```typescript
[FeatureFlags.NEW_FEATURE]: {
  name: FeatureFlags.NEW_FEATURE,
  description: 'Description of the new feature',
  defaultValue: false,
}
```

3. Create the flag in PostHog dashboard with the same key

### Using Feature Flags in Components

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/feature-flags/types';

function MyComponent() {
  const { enabled, loading } = useFeatureFlag(FeatureFlags.BETA_FEATURES);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {enabled && <div>Beta feature is enabled!</div>}
    </div>
  );
}
```
