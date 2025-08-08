# Cursor Prompt — **WorkloadWizard Foundations Hardening (Lean)**

You are a senior full-stack engineer working in **WorkloadWizard**.

**Repo:** `https://github.com/SMTech-UK/workload-wizard-app`
**Branch to work from:** `release/v0.3.0`
**Package manager:** `pnpm`
**Spelling:** UK English

## Mission

Make the codebase “MVP-ready and safe to build on” by implementing a **lean** set of foundations. Keep changes minimal, incremental, and in scope.

## Guardrails

- Work in **small PRs** (5–10 files, <400 lines diff where possible).
- Use **Conventional Commits** in each PR.
- Prefer **server-side authz** and **typed boundaries**.
- **Do not** introduce big new dependencies unless specified.
- If something already exists, **refactor** rather than duplicate.

---

## PR 1 — Project Hygiene (runtime, scripts, CI, hooks)

**Create a branch:** `chore/foundations-hygiene`

**Tasks**

1. Add `.nvmrc` with Node LTS (v20.x).
2. Remove `package-lock.json` if present; standardise on `pnpm`.
3. Add Husky + lint-staged:
   - Pre-commit: `pnpm typecheck && pnpm eslint . && pnpm prettier --check .`

4. Add CI: `.github/workflows/ci.yml` to run `typecheck`, `eslint`, `prettier --check`, `vitest`, `build`.
5. Ensure `package.json` has scripts: `typecheck`, `lint`, `format`, `test`, `build`, `ci`.

**Snippets**
`.nvmrc`

```
v20
```

`package.json` (add/merge)

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --check .",
    "test": "vitest run",
    "build": "next build",
    "ci": "pnpm typecheck && pnpm lint && pnpm format && pnpm test && pnpm build"
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0",
    "vitest": "^2.0.0",
    "prettier": "^3.3.0",
    "eslint": "^9.0.0"
  }
}
```

`.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
pnpm typecheck && pnpm lint && pnpm format
```

`.lintstagedrc.json`

```json
{
  "*.{ts,tsx,js,jsx}": ["eslint --fix"],
  "*.{json,md,css,scss}": ["prettier --write"]
}
```

`.github/workflows/ci.yml`

```yaml
name: CI
on:
  pull_request:
    branches: [dev, main]
  push:
    branches: [dev]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version-file: ".nvmrc"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm ci
```

**Acceptance**

- CI runs on PRs to `dev`/`main` and passes locally with `pnpm ci`.

---

## PR 2 — TypeScript Hardening (no `any` in core paths)

**Branch:** `chore/ts-hardening`

**Tasks**

- Remove `any` in `src/lib/*` and **Convex handlers** (`convex/*.ts`), especially:
  - `src/lib/actions/auditActions.ts`
  - `convex/audit.ts`
  - `convex/permissions.ts`

- Keep `strict` flags; **don’t** silence with broad casts—use precise types.

**Acceptance**

- `pnpm typecheck` passes; no `any` in the files above.

---

## PR 3 — Canonical AuthZ Library

**Branch:** `feat/authz-canonical`

**Add:** `src/lib/authz.ts`

**Implement**

```ts
// src/lib/authz.ts
import { auth } from "@clerk/nextjs/server";

export type SessionUser = {
  userId: string;
  organisationId: string;
  role: string;
};

export async function getSessionUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthenticated");
  const organisationId =
    (session?.sessionClaims as any)?.organisationId ||
    (session?.user?.publicMetadata as any)?.organisationId;
  const role =
    (session?.sessionClaims as any)?.role ||
    (session?.user?.publicMetadata as any)?.role ||
    "user";
  if (!organisationId) throw new Error("Missing organisationId");
  return { userId: session.userId, organisationId, role };
}

export async function getOrganisationIdFromSession(): Promise<string> {
  return (await getSessionUser()).organisationId;
}

export async function requireSystemPermission(perm: string) {
  const { role } = await getSessionUser();
  if (role !== "systemadmin") throw new Error("Forbidden");
  return true;
}

export async function requireOrgPermission(perm: string) {
  // Replace with real RBAC once permissions.ts is wired in
  const { role } = await getSessionUser();
  if (role === "systemadmin" || role === "orgadmin") return true;
  throw new Error("Forbidden");
}
```

**Refactor** a handful of server routes and **Convex** mutations to call `getOrganisationIdFromSession()` instead of reading `organisationId` from request/body/args.

**Acceptance**

- Grep shows no endpoints relying on client-provided `organisationId` in touched files.

---

## PR 4 — Permissions Registry + Seeding

**Branch:** `feat/permissions-registry`

**Add:** `src/lib/permissions.ts`

```ts
export type PermissionId = `${string}.${string}`;

export const PERMISSIONS: Record<
  PermissionId,
  { group: string; description: string }
> = {
  "users.view": {
    group: "users",
    description: "View users in your organisation",
  },
  "users.create": {
    group: "users",
    description: "Create users in your organisation",
  },
  "users.edit": {
    group: "users",
    description: "Edit users in your organisation",
  },
  "users.delete": {
    group: "users",
    description: "Delete users in your organisation",
  },
  "permissions.manage": {
    group: "admin",
    description: "Manage roles and permissions",
  },
  "flags.manage": { group: "admin", description: "Toggle feature flags" },
  // Add more as needed…
};

export const DEFAULT_ROLES: Record<string, PermissionId[]> = {
  systemadmin: Object.keys(PERMISSIONS) as PermissionId[],
  orgadmin: [
    "users.view",
    "users.create",
    "users.edit",
    "permissions.manage",
    "flags.manage",
  ],
  lecturer: ["users.view"],
};

export async function seedDefaultOrgRoles(organisationId: string) {
  // TODO: write to Convex/DB; idempotent upsert for roles & their permissions
  return { organisationId, roles: Object.keys(DEFAULT_ROLES) };
}
```

**Wire** `/admin/permissions` to **read** from this registry for display. Future PRs can move write ops behind it.

**Acceptance**

- `/admin/permissions` renders from `PERMISSIONS` and `DEFAULT_ROLES`.
- `seedDefaultOrgRoles()` is callable from a seed script or org-create path.

---

## PR 5 — Audit Wrapper & Coverage

**Branch:** `feat/audit-wrapper`

**Actions**

- Create `src/lib/audit.ts` and **move/merge** logic from `src/lib/actions/auditActions.ts`.

`src/lib/audit.ts`

```ts
export type AuditAction =
  | "user.invited"
  | "user.role_changed"
  | "permissions.updated"
  | "flags.updated";

export type AuditEvent = {
  action: AuditAction;
  actorId: string;
  organisationId: string;
  success: boolean;
  meta?: Record<string, unknown>;
  ts?: number;
};

export async function recordAudit(evt: AuditEvent) {
  const payload = { ...evt, ts: evt.ts ?? Date.now() };
  // TODO: persist via Convex mutation
  return payload;
}
```

- **Call `recordAudit`** from sensitive Convex mutations (role/perm edits, flag changes, invites).
- Remove old audit action file when fully replaced.

**Acceptance**

- Feature flag and permission changes now emit audit entries.

---

## PR 6 — Feature Flags (lean)

**Branch:** `feat/flags-lean`

**Add:** `src/lib/flags.ts`

```ts
import { z } from "zod";
export const FlagsSchema = z.object({
  NEW_ALLOCATION_UI: z.boolean().default(false),
});
export type Flags = z.infer<typeof FlagsSchema>;

export async function getFlags(): Promise<Flags> {
  // TODO: fetch from DB/Convex; fall back to defaults
  return FlagsSchema.parse({});
}
```

- Build a simple **sysadmin-only** `/admin/flags` page to toggle flags (can be in-memory/Convex table). Each toggle **calls `recordAudit`**.

**Acceptance**

- `/admin/flags` exists, gated by `requireSystemPermission('flags.manage')`, and emits audit entries.

---

## PR 7 — Analytics via Proxy + PII Scrub

**Branch:** `feat/analytics-proxy-wrapper`

**Add:** `src/lib/analytics.ts`

```ts
type SafeProps = Record<string, string | number | boolean | null | undefined>;

function scrubPII(props: Record<string, unknown>): SafeProps {
  const block = ["email", "name", "firstName", "lastName"];
  const out: SafeProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (block.includes(k)) continue;
    if (
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean" ||
      v == null
    ) {
      out[k] = v as any;
    } else {
      out[k] = undefined;
    }
  }
  return out;
}

export async function track(
  event: string,
  props: Record<string, unknown> = {},
) {
  const safe = scrubPII(props);
  // Call your PostHog proxy endpoint here; no direct posthog-js init in prod
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      body: JSON.stringify({ event, props: safe }),
    });
  } catch {
    // swallow
  }
}
```

**Update** `instrumentation-client.ts` to **only** call `track()` from this wrapper. Remove/directly block any `posthog-js` initialisation in production.

**Acceptance**

- Grep shows no direct `posthog.init` usage paths in prod.
- Unit test for `scrubPII` exists.

---

## PR 8 — Convex Discipline (lean pass)

**Branch:** `refactor/convex-authz-zod`

**Tasks**

- Stop accepting `organisationId` in Convex mutations/queries you touched; use `getOrganisationIdFromSession()` on the server.
- Add simple Zod validation on inputs in those mutations.
- Ensure audit logging is called on security-relevant ones.
- Add or verify basic indexes for `orgId`/`userId` in `convex/schema.ts`.

**Acceptance**

- Touched Convex functions compile; org scoping enforced; audit on sensitive paths.

---

## PR 9 — Routing & UX polish (essentials)

**Branch:** `feat/route-ux-basics`

**Tasks**

- Add `error.tsx`, `not-found.tsx`, `loading.tsx` to major route groups (e.g., top-level `app`, `(organisation)`, `(admin)`).
- Replace plain “Loading…” with basic skeletons for list pages (keep it minimal).

**Acceptance**

- Navigating slow pages shows skeletons; errors route to friendly error screens.

---

## PR 10 — Security (lean)

**Branch:** `feat/rate-limit-env-validate`

**Tasks**

- Add simple rate limiting middleware for sensitive routes (invites, permission changes, analytics proxy). A tiny token bucket per IP is fine.
- Add runtime env validation with `zod`/`envalid`. Fail fast on missing required envs.

**Acceptance**

- Env parsing runs at boot; missing envs fail the app start.
- Sensitive routes are rate-limited (basic happy path tested).

---

## PR 11 — Tests (targeted)

**Branch:** `test/essentials`

**Tasks**

- **Vitest unit tests**:
  - `authz` guards (allow/deny).
  - Permission registry invariants (ids unique, roles map to existing permissions).
  - Analytics scrubber drops PII keys.

- Snapshot the permission registry to catch accidental changes.

**Acceptance**

- `pnpm test` passes locally and in CI.

---

## PR 12 — Docs (single pass)

**Branch:** `docs/quick-start-and-canonical-guides`

**Tasks**

- README “Quick Start”: envs, seeding, test users, role matrix (from `DEFAULT_ROLES`).
- Merge duplicate guides into one each for: **PostHog**, **Email**, **Flags**.
- Keep UK English.

**Acceptance**

- Setup is copy-paste runnable; newcomers can seed an org and sign in.

---

## Definition of Done (global)

- CI is green across all PRs.
- No direct `organisationId` reads from clients in touched paths.
- `/admin/permissions` reads from canonical registry; `/admin/flags` exists and is audited.
- Core mutations log audit events.
- Basic skeleton/error pages are in place.
- Tests cover authz, permissions registry invariants, analytics scrubber.
- Docs reflect reality.

If something blocks progress (missing file, different layout), explain briefly and propose the smallest viable change that achieves the intent.
