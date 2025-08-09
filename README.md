# Workload Wizard App

A comprehensive academic workload management system built with Next.js, Convex, and Clerk authentication.

## Quick Start

```bash
pnpm install
cp .env.example .env.local # or create and fill from the Env section below
pnpm dev
# App: http://localhost:3000
```

### Required environment

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_url

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key

# PostHog (optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Email (recommended)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=system@workload-wiz.xyz

# App URLs (for emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLERK_SIGN_IN_URL=http://localhost:3000/sign-in
```

## Role matrix (default)

Derived from `src/lib/permissions.ts`.

- systemadmin: all permissions
- orgadmin: `users.view`, `users.create`, `users.edit`, `permissions.manage`, `flags.manage`
- lecturer: `users.view`

See `src/lib/permissions.ts` for the canonical `PERMISSIONS` and `DEFAULT_ROLES`.

## Canonical docs

- Permissions: `./docs/PERMISSIONS.md`
- Audit: `./docs/AUDIT.md`
- Email: `./docs/EMAIL.md`
- Feature Flags: `./docs/FEATURE_FLAGS.md`
- PostHog: `./docs/POSTHOG.md`

## Scripts

```json
{
  "dev": "concurrently \"next dev --turbopack\" \"convex dev\" \"ngrok http 3000\"",
  "typecheck": "tsc --noEmit",
  "lint": "eslint .",
  "format": "prettier --check .",
  "test": "vitest run",
  "build": "next build",
  "ci": "pnpm typecheck && pnpm lint && pnpm format && pnpm test && pnpm build"
}
```

## Notes

- AuthZ helpers live in `src/lib/authz.ts` (`getOrganisationIdFromSession()` etc.)
- Avoid reading `organisationId` from clients in server routes; derive from session
- Analytics must go via the proxy wrapper `src/lib/analytics.ts`
