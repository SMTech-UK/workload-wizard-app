// Client analytics is routed via our proxy wrapper; avoid direct posthog.init in production
// This file intentionally does not initialise posthog-js in prod.
// In development, you may temporarily instrument via the proxy-only wrapper in src/lib/analytics.ts
if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  console.warn('PostHog key not found in environment variables');
}