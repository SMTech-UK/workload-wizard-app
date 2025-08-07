# PostHog Early Access Features Setup Guide

This guide explains how to set up PostHog's Early Access Features system so users can opt-in to beta features like `beta_features`.

## Overview

Early Access Features allow users to voluntarily opt-in to beta features. This is different from regular feature flags because:
- **User Control**: Users choose to enable/disable features themselves
- **Persistent**: User choices persist across sessions and devices
- **Self-Service**: No admin intervention required for individual users
- **Beta Testing**: Perfect for testing new features with interested users

## Step 1: Create Early Access Feature in PostHog Dashboard

### 1.1 Navigate to Early Access Features
1. Go to your PostHog dashboard
2. Navigate to **Feature Flags** → **Early Access Features**
3. Click **"Create early access feature"**

### 1.2 Configure the Feature
Fill in the following details:

**Basic Information:**
- **Name**: `Beta Features`
- **Description**: `Enable beta features and experimental functionality`
- **Flag key**: `beta_features` (must match exactly)
- **Stage**: `Beta` (or `Concept` for earlier stages)

**Advanced Settings:**
- **Documentation URL**: (optional) Link to beta features documentation
- **Release notes**: (optional) What's new in this beta

### 1.3 Save the Feature
Click **"Create early access feature"** to save.

## Step 2: Verify the Setup

### 2.1 Check the Test Dashboard
1. Visit `/dev/posthog-test` in your app
2. Look for the **"Early Access Features"** section
3. You should see your `Beta Features` feature listed
4. The toggle should be functional

### 2.2 Test User Opt-in
1. Click the toggle to opt-in to the beta feature
2. Check the browser console for confirmation messages
3. The feature flag status should update to show "Enabled"
4. Refresh the page - the choice should persist

## Step 3: Integration with Your App

### 3.1 Using the Feature Flag
The `beta_features` flag will now work with your existing feature flag system:

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/feature-flags/types';

function MyComponent() {
  const { enabled, loading } = useFeatureFlag(FeatureFlags.BETA_FEATURES);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {enabled && (
        <div className="bg-purple-100 p-4 rounded">
          🚀 Beta Features Enabled!
        </div>
      )}
    </div>
  );
}
```

### 3.2 Programmatic Control
You can also control early access features programmatically:

```typescript
import { 
  updateEarlyAccessFeatureEnrollment,
  getEarlyAccessFeatures 
} from '@/lib/feature-flags/client';

// Opt-in to beta features
await updateEarlyAccessFeatureEnrollment('beta_features', true);

// Opt-out of beta features
await updateEarlyAccessFeatureEnrollment('beta_features', false);

// Get all available early access features
const features = await getEarlyAccessFeatures();
```

## Step 4: User Experience

### 4.1 First-Time Users
When a user first visits your app:
1. They see beta features as disabled by default
2. They can opt-in through the test dashboard or your UI
3. Their choice is stored in PostHog and persists

### 4.2 Returning Users
When a user returns:
1. Their previous opt-in/opt-out choice is automatically applied
2. The feature flag reflects their choice
3. No additional setup required

## Step 5: Monitoring and Analytics

### 5.1 Track Usage
PostHog automatically tracks:
- Who opts into early access features
- When they opt-in/opt-out
- Usage patterns of beta features

### 5.2 View Analytics
1. Go to **Feature Flags** → **Early Access Features**
2. Click on your feature to see:
   - Enrollment statistics
   - User list
   - Usage analytics

## Troubleshooting

### Issue: Early Access Feature Not Found
**Symptoms:**
- "No early access features found" message
- Toggle not appearing

**Solutions:**
1. Verify the flag key is exactly `beta_features`
2. Check that the feature is in "Beta" or "Concept" stage
3. Ensure PostHog is properly initialized
4. Check browser console for errors

### Issue: Toggle Not Working
**Symptoms:**
- Toggle doesn't change state
- Feature flag doesn't update

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify user is properly identified in PostHog
3. Check network tab for failed requests
4. Ensure PostHog API key is correct

### Issue: Choice Doesn't Persist
**Symptoms:**
- Opt-in choice resets on page refresh
- Feature flag reverts to disabled

**Solutions:**
1. Check that user identification is working
2. Verify PostHog person profiles are enabled
3. Check browser console for identification errors
4. Ensure PostHog is properly initialized before making changes

## Best Practices

### 1. Clear Communication
- Explain what beta features do
- Set expectations about stability
- Provide feedback channels

### 2. Gradual Rollout
- Start with internal users
- Monitor for issues
- Gradually expand to more users

### 3. Easy Opt-out
- Make it easy for users to disable beta features
- Don't hide the opt-out option
- Respect user preferences

### 4. Monitor Usage
- Track which features are popular
- Monitor for bugs or issues
- Use feedback to improve features

## Example Implementation

Here's a complete example of how to implement a beta features banner:

```typescript
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/feature-flags/types';
import { Button } from '@/components/ui/button';

export function BetaFeaturesBanner() {
  const { enabled, loading } = useFeatureFlag(FeatureFlags.BETA_FEATURES);
  
  if (loading || !enabled) return null;
  
  return (
    <div className="bg-purple-100 border border-purple-200 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-purple-800">🚀 Beta Features Enabled</h3>
          <p className="text-sm text-purple-700">
            You're seeing experimental features. Some may be unstable.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.href = '/dev/posthog-test'}
        >
          Manage Beta Features
        </Button>
      </div>
    </div>
  );
}
```

## Next Steps

1. **Create the early access feature** in PostHog dashboard
2. **Test the opt-in flow** using the test dashboard
3. **Integrate into your app** using the feature flag hook
4. **Monitor usage** and gather feedback
5. **Iterate and improve** based on user feedback

The early access features system is now ready to provide a great user experience for beta feature testing!
