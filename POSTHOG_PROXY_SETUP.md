# PostHog Proxy Setup Guide

This guide explains the PostHog reverse proxy configuration for the workload-wizard-app, following [PostHog's best practices](https://posthog.com/docs/advanced/proxy).

## Overview

We've implemented a reverse proxy that:
- **Development**: Uses direct connection to PostHog for easier debugging
- **Production**: Uses a reverse proxy through `/e` path to avoid tracking blockers
- **Backward Compatibility**: Maintains old `/ingest` path during transition

## Configuration

### Next.js Rewrites (`next.config.ts`)

```typescript
async rewrites() {
  return [
    // PostHog reverse proxy - using a non-obvious path to avoid blocking
    {
      source: "/e/static/:path*",
      destination: "https://eu-assets.i.posthog.com/static/:path*",
    },
    {
      source: "/e/:path*",
      destination: "https://eu.i.posthog.com/:path*",
    },
    // Keep the old /ingest path for backward compatibility during transition
    {
      source: "/ingest/static/:path*",
      destination: "https://eu-assets.i.posthog.com/static/:path*",
    },
    {
      source: "/ingest/:path*",
      destination: "https://eu.i.posthog.com/:path*",
    },
    {
      source: "/ingest/flags",
      destination: "https://eu.i.posthog.com/flags",
    },
  ];
}
```

### PostHog Initialization (`instrumentation-client.ts`)

```typescript
import posthog from 'posthog-js'

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    // Use proxy in production, direct connection in development
    const apiHost = process.env.NODE_ENV === 'production' 
        ? `${window.location.origin}/e`  // Use our proxy
        : process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'; // Direct connection in dev
    
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: apiHost,
        ui_host: 'https://eu.posthog.com', // Always use direct UI host for toolbar/auth
        defaults: '2025-05-24'
    });
}
```

## Environment Variables

### Development (`.env.local`)
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com  # Optional, defaults to eu.i.posthog.com
```

### Production
```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
# No need for NEXT_PUBLIC_POSTHOG_HOST in production - uses proxy automatically
```

## How It Works

### Development Mode
- **API Host**: `https://eu.i.posthog.com` (direct connection)
- **UI Host**: `https://eu.posthog.com` (for toolbar authentication)
- **Benefits**: Easier debugging, faster development iteration

### Production Mode
- **API Host**: `https://yourdomain.com/e` (proxy through your domain)
- **UI Host**: `https://eu.posthog.com` (direct for toolbar)
- **Benefits**: Avoids tracking blockers, better data collection

## Best Practices Followed

1. **Non-obvious Path**: Using `/e` instead of `/analytics`, `/tracking`, or `/posthog`
2. **Proper Host Headers**: Next.js rewrites handle this automatically
3. **UI Host Separation**: Always use direct PostHog UI for toolbar authentication
4. **Environment Detection**: Automatic switching between dev/prod modes
5. **Backward Compatibility**: Maintains old paths during transition

## Testing

### Development Testing (Direct Connection)
1. Visit `/feature-flag-test` page
2. Check browser console for PostHog debug info
3. Verify "Direct Connection" status
4. Test feature flags work correctly

### Development Testing (Proxy Mode)
1. Add to your `.env.local`:
   ```bash
   NEXT_PUBLIC_TEST_PROXY=true
   ```
2. Restart your dev server
3. Visit `/feature-flag-test` page
4. Check browser console for PostHog configuration logs
5. Verify "Enabled (/e)" proxy status appears
6. Check browser Network tab for `/e/*` requests

### Automated Proxy Testing
Run the test script to verify proxy configuration:
```bash
node test-proxy.js
```

### Production Testing
1. Deploy to production
2. Visit `/feature-flag-test` page
3. Check browser console for PostHog debug info
4. Verify "Enabled (/e)" proxy status
5. Test feature flags work correctly

## Migration from Old Setup

The configuration maintains backward compatibility with the old `/ingest` path. To complete the migration:

1. **Phase 1**: Deploy with both paths (current setup)
2. **Phase 2**: Update any hardcoded `/ingest` references to `/e`
3. **Phase 3**: Remove old `/ingest` rewrites after confirming everything works

## Troubleshooting

### Common Issues

1. **Events not reaching PostHog**
   - Check browser network tab for requests to `/e/*`
   - Verify `NEXT_PUBLIC_POSTHOG_KEY` is set
   - Check for ad blockers in development

2. **Feature flags not working**
   - Verify PostHog project has the correct flag key (`beta_features`)
   - Check browser console for PostHog initialization errors
   - Ensure user identification is working

3. **Toolbar not authenticating**
   - Verify `ui_host` is set to `https://eu.posthog.com`
   - Check PostHog project settings for toolbar configuration

### Debug Information

The `/feature-flag-test` page shows:
- Environment (development/production)
- Proxy status (enabled/disabled)
- API host being used
- PostHog key configuration status

Check browser console for detailed PostHog debugging information.

## Security Considerations

- The proxy only forwards requests to PostHog's official endpoints
- No sensitive data is stored or processed by the proxy
- All authentication happens directly with PostHog's UI host
- The proxy path `/e` is non-obvious and less likely to be blocked

## References

- [PostHog Proxy Documentation](https://posthog.com/docs/advanced/proxy)
- [Next.js Rewrites Documentation](https://nextjs.org/docs/app/api-reference/next-config-js/rewrites)
- [PostHog JavaScript SDK](https://posthog.com/docs/libraries/js)
