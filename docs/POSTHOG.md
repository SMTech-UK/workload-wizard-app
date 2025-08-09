# PostHog Integration (Proxy, Flags, Early Access)

This is the canonical PostHog guide for `workload-wizard-app`.

## Overview

- Uses a reverse proxy at `/e` in production to avoid tracking blockers
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
// Avoid direct posthog.init in production
if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  console.warn("PostHog key not found in environment variables");
}
```

## Environment variables

Add to `.env.local` as needed:

```bash
# Required for Convex
NEXT_PUBLIC_CONVEX_URL=https://your_convex_url.convex.cloud

# Clerk (required for auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key

# PostHog (optional; enables flags and analytics)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
# In dev only you can override; prod goes via /e proxy automatically
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
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

## Testing the proxy

- Dev direct connection: default `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`
- Force proxy in dev: run `node test-proxy.js` and check Network requests to `/e/*`
- Production uses `/e` automatically via rewrites

## Security considerations

- The proxy only forwards requests to official PostHog endpoints
- Do not depend on flags for security controls; use server-side authz for enforcement

## References

- [PostHog proxy](https://posthog.com/docs/advanced/proxy)
- [Next.js rewrites](https://nextjs.org/docs/app/api-reference/next-config-js/rewrites)
- [posthog-js](https://posthog.com/docs/libraries/js)
