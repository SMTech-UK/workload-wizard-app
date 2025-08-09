# Feature Flags (Canonical)

This is the canonical feature flags guide for `workload-wizard-app`.

## Principles

- Single enum of flag names in `src/lib/feature-flags/types.ts`
- Prefer PostHog flags; provide fallbacks
- Never use flags as auth; flags are UX/rollout only

## Env

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
# dev only override; prod goes via /e proxy automatically
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

## Usage (client)

```tsx
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { FeatureFlags } from "@/lib/feature-flags/types";

export function Example() {
  const { enabled, loading } = useFeatureFlag(FeatureFlags.BETA_FEATURES);
  if (loading) return null;
  return enabled ? <NewUI /> : <OldUI />;
}
```

## Usage (server)

```ts
import { getServerFeatureFlag } from "@/lib/feature-flags";
import { FeatureFlags } from "@/lib/feature-flags/types";

const flag = await getServerFeatureFlag(FeatureFlags.BETA_FEATURES, {
  distinctId: userId,
});
if (flag.enabled) {
  /* serve new thing */
}
```

## Debug

- Dev-only panel: `FeatureFlagDebug`
- Test pages: `/dev/feature-flags-test`, `/dev/posthog-test`

## Adding a flag

1. Add to enum `src/lib/feature-flags/types.ts`
2. Add config in `src/lib/feature-flags/config.ts`
3. Create the flag in PostHog with the same key
4. Use via hooks/components and log key decisions via audit when appropriate

## Auditing

- Admin toggles should record audit events; see `src/lib/audit.ts`

## References

- See `docs/POSTHOG.md` for proxy/setup details
