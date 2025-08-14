# PostHog Integration (Proxy, Flags, Early Access, Session Replays & Heatmaps)

This is the canonical PostHog guide for `workload-wizard-app`.

## Overview

- Uses a reverse proxy at `/e` in production to avoid tracking blockers
- **Session recordings** with privacy-focused settings (no text input recording, masked sensitive fields)
- **Heatmaps** for click, scroll, and mouse movement tracking
- **Advanced analytics** with autocapture, performance tracking, and custom events
- **Enhanced user identification** with comprehensive property tracking
- No direct `posthog.init` in production; instrumentation is routed via our wrapper
- Supports feature flags and Early Access Features (EAF)

## Next.js rewrites (`next.config.ts`)

Ensure these rewrites exist (already present):

```ts
async rewrites() {
  return [
    { source: "/e/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
    { source: "/e/:path*", destination: "https://eu.i.posthog.com/:path*" },
    { source: "/ingest/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
    { source: "/ingest/:path*", destination: "https://eu.i.posthog.com/:path*" },
    { source: "/ingest/flags", destination: "https://eu.i.posthog.com/flags" },
  ];
}
```

## Client instrumentation policy (`instrumentation-client.ts`)

We intentionally do not initialise `posthog-js` in production here. All analytics calls should go through `src/lib/analytics.ts` proxy wrapper.

```ts
// instrumentation-client.ts (excerpt)
// PostHog configuration with advanced features
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  import("posthog-js").then((posthog) => {
    posthog.default.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      // Session recordings with privacy settings
      session_recording: {
        recordCanvas: true,
        recordCrossOriginIframes: false,
        recordNetwork: true,
        recordPerformance: true,
        recordResourceTimings: true,
        recordScreen: false, // Disable for privacy
        recordTextInputs: false, // Disable for privacy
        recordVideo: false, // Disable for privacy
        maskAllInputs: true, // Mask sensitive fields
        maskInputOptions: {
          password: true,
          email: true,
          phone: true,
          creditCard: true,
        },
      },
      // Heatmaps
      heatmaps: {
        capture_click: true,
        capture_scroll: true,
        capture_mouse: true,
        capture_keystroke: false, // Disable for privacy
      },
      // Advanced analytics
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      performance_tracking: true,
    });
  });
}
```

## Enhanced Analytics Service (`src/lib/analytics.ts`)

Our enhanced analytics service provides comprehensive tracking capabilities:

```ts
import { analytics } from "@/lib/analytics";

// User identification
analytics.identify("user-123", {
  name: "John Doe",
  email: "john@example.com",
  role: "admin",
});

// Custom event tracking with enhanced context
analytics.track("button_clicked", {
  button_name: "create_course",
  page_location: "courses",
  user_role: "admin",
});

// Page view tracking
analytics.trackPageView("Course Creation Page");

// Form tracking
analytics.trackFormStart("course_form");
analytics.trackFormSubmit("course_form", true, {
  course_type: "undergraduate",
});

// Performance tracking
analytics.trackPerformance("page_load_time", 1500);

// User action tracking
analytics.trackUserAction("search", "search_input", { query_length: 10 });

// Session tracking
analytics.trackSessionStart();
analytics.trackSessionEnd();
```

## Environment variables

Add to `.env.local` as needed:

```bash
# Required for Convex
NEXT_PUBLIC_CONVEX_URL=https://your_convex_url.convex.cloud

# Clerk (required for auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key

# PostHog (optional; enables flags, analytics, session replays, and heatmaps)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
# In dev only you can override; prod goes via /e proxy automatically
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# App version for tracking
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Feature flags

- Use hooks/components under `src/hooks/useFeatureFlag.ts` and `src/components/feature-flags/*`.
- The canonical enum of flag names is under `src/lib/feature-flags/types.ts`.
- The debug panel is available in development: `FeatureFlagDebug`.

Quick test page: `/dev/feature-flags-test`

## Early Access Features (EAF)

Create an EAF in PostHog with key `beta_features`. The dev page `/dev/posthog-test` can help verify.

Minimal usage:

```tsx
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { FeatureFlags } from "@/lib/feature-flags/types";

export function BetaBanner() {
  const { enabled } = useFeatureFlag(FeatureFlags.BETA_FEATURES);
  return enabled ? <div>🚀 Beta Features Enabled</div> : null;
}
```

## Session Recordings & Heatmaps

### Session Recordings

- **Enabled by default** with privacy-focused settings
- **No text input recording** for user privacy
- **Masked sensitive fields** (passwords, emails, etc.)
- **Performance metrics** included
- **Network requests** tracked for debugging

### Heatmaps

- **Click tracking** for user interaction analysis
- **Scroll tracking** for content engagement
- **Mouse movement** for user behavior insights
- **No keystroke capture** for privacy

### Privacy Settings

```ts
session_recording: {
  recordTextInputs: false,     // No text input recording
  recordScreen: false,         // No screen recording
  recordVideo: false,          // No video recording
  maskAllInputs: true,         // Mask all input fields
  maskInputOptions: {
    password: true,            // Always mask passwords
    email: true,               // Always mask emails
    phone: true,               // Always mask phone numbers
    creditCard: true,          // Always mask credit cards
  },
}
```

## Testing the integration

### PostHog Test Dashboard

Visit `/dev/posthog-test` for comprehensive testing of:

- Session replays
- Heatmaps
- Autocapture
- Performance tracking
- Feature flags
- User identification
- Custom events

### Sentry Test Dashboard

Visit `/sentry-example-page` for comprehensive testing of:

- Error reporting
- Performance monitoring
- Session replay
- User feedback
- Custom metrics
- Breadcrumbs and context

### Testing the proxy

- Dev direct connection: default `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`
- Force proxy in dev: check Network requests to `/e/*` (see steps below)
- Production uses `/e` automatically via rewrites

### Optional developer proxy test steps

1. Start the dev server (`pnpm dev`).
2. Visit any page, then verify:
   - `/e/capture/` responds (proxy endpoint)
   - `/e/static/` serves assets (static proxy)
3. In DevTools Network tab, confirm analytics requests go to `/e/*`.

## Security considerations

- The proxy only forwards requests to official PostHog endpoints
- **No sensitive data** is recorded in session replays
- **All input fields** are masked by default
- **Text input recording** is disabled for privacy
- Do not depend on flags for security controls; use server-side authz for enforcement

## Performance considerations

- Session recordings are **sampled** (10% of sessions, 100% of error sessions)
- Heatmaps have minimal performance impact
- Analytics service includes performance metrics
- Custom metrics are lightweight and efficient

## References

- [PostHog Session Recordings](https://posthog.com/docs/session-recordings)
- [PostHog Heatmaps](https://posthog.com/docs/heatmaps)
- [PostHog Privacy](https://posthog.com/docs/privacy)
- [PostHog Feature Flags](https://posthog.com/docs/feature-flags)
- [PostHog Early Access Features](https://posthog.com/docs/early-access-features)
