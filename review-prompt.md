**Harden Foundations of WorkloadWizard (dev branch)**

You are acting as a senior full-stack engineer. Review and **refactor/improve** the repo below to make a rock-solid foundation for upcoming features (workloads, modules, allocations). Apply UK English spelling in comments/docs.

**Repo:** `https://github.com/SMTech-UK/workload-wizard-app` (branch: `dev`)
**Stack context:** Next.js App Router, TypeScript, Tailwind + shadcn/ui, Clerk auth, Convex backend, PostHog (via proxy & direct with env variable), Resend/email, RBAC, multi-tenant (organisationId).

## Objectives

- Enforce **best practices** end-to-end (security, tenancy, permissions, validation, testing, CI).
- Reduce tech debt; consolidate duplicate docs; remove dead code.
- Create **one canonical path** for: permissions, authz checks, feature flags, analytics, email.
- Ship a **repeatable CI** with quality gates.
- Leave clear **docs + ADRs**.

## Non-negotiables

- **Authorisation on the server** (zero trust of client-supplied org IDs).
- **Typed permission registry** + default role seeding.
- **Audit logging** on every security-relevant mutation (success & failure).
- **All analytics via PostHog proxy** with PII scrub.
- **Zod validation** at boundaries (Convex & server actions).
- **TypeScript strict** configuration.
- **Accessible UI** and consistent error/loading UX.

---

## Action Plan (do in this order)

1. **Project Hygiene & Tooling**

- Add `.nvmrc` (pin Node LTS). Standardise on `pnpm`.
- Update `package.json` scripts: `typecheck`, `lint`, `format`, `test`, `build`, `ci`.
- Add `husky` + `lint-staged` pre-commit (typecheck, eslint, prettier).
- Run `depcheck` and remove unused deps; ensure runtime deps vs devDeps are correct.
- Add `changesets` (or `release-please`) for semver bumping.

2. **TypeScript Hardening**

- In `tsconfig.json`, enable:
  `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- Add path aliases in `compilerOptions.paths` for `@/lib/*`, `@/components/*`, `@/server/*`.
- Fix resulting type errors (do not silence with `any`).

3. **Canonical Libraries (create if missing)**
   Create these single sources of truth in `src/lib/`:

- `authz.ts`
  - `getSessionUser()` (server-only)
  - `getOrganisationIdFromSession()`
  - `requireSystemPermission(perm)`
  - `requireOrgPermission(perm)`
  - Never accept `organisationId` from client.

- `permissions.ts`
  - Export **typed permission registry** (group.action, description).
  - Export **default role → permission mappings**.
  - Provide `seedDefaultOrgRoles(organisationId)` for new orgs.

- `audit.ts`
  - `recordAudit({ actorId, organisationId, action, meta, success })`.
  - Thin wrapper used by all security-sensitive mutations.

- `flags.ts`
  - Typed feature flags with Zod validation.
  - Server-resolved; kill-switch defaults; no direct client env reads.

- `email.ts`
  - One transport abstraction (Resend).
  - Typed templates; retries; errors surface to UI.
  - Per-org branding (logo/colour) read from org settings.

- `analytics.ts`
  - Single `track(event, props)` wrapper that **routes to the proxy**, strips PII, and tags `organisationId`/role safely. Block direct PostHog initialisation in prod.

4. **Convex Server Discipline**

- In **every** query/mutation: derive `organisationId` server-side (via `authz.getOrganisationIdFromSession()`), never from args.
- Validate inputs with Zod schemas.
- Add indexes for common filters (`by organisationId`, `by userId`).
- Idempotency keys where relevant (invites, role assignment).
- Consider `deletedAt` soft-delete with filters excluding deleted.

5. **Admin UIs (wire to the libs)**

- `/admin/permissions`: read from `permissions.ts`; edit roles/permissions; all changes audited.
- `/admin/flags`: system admin only; toggle flags; audited.
- `/admin/audit`: filterable audit viewer (date, actor, org, action, success).

6. **Routing & UX polish**

- Route groups reflecting auth boundaries: `(public)`, `(organisation)`, `(admin)`.
- Add `error.tsx`, `not-found.tsx`, `loading.tsx` for each major group.
- Use skeletons for list pages. Stream heavy SSR lists.
- Standardise toast helper for success/error messaging.

7. **Security & Compliance**

- Rate-limit sensitive routes (invites, permission changes, analytics proxy).
- Runtime env validation with `zod`/`envalid`; fail fast if missing.
- Document PII policy; ensure analytics payload scrubbing has tests.
- Document audit log retention & export (SAR) path.

8. **Testing**

- **Vitest** unit tests:
  - Authz guards (`requireOrgPermission`, `requireSystemPermission`)
  - Permission registry invariants
  - Convex mutations happy/denied paths
  - Analytics scrubber

- **Playwright** integration flows:
  - Login → invite user → assign role → change permission → verify audit entry visible
  - Org scoping: user cannot access other org resources

- Snapshot the permission registry to catch accidental changes.

9. **CI**

- `.github/workflows/ci.yml` to run: typecheck, eslint, prettier check, vitest, build.
- `depcheck` to fail on unused deps.
- `madge` (or `dependency-cruiser`) to fail on circular deps.
- Optional: per-route bundle budget checks.

10. **Docs**

- Expand README “Quick Start”: envs, seeding, test users, role matrix.
- Consolidate overlapping guides (PostHog, Email, Flags) → one canonical doc each.
- Add `docs/adr/` for RBAC model, tenancy, analytics proxy, email provider.

---

## Concrete Changes to Apply (create/modify files)

> If a file exists, amend it; if not, create it. Use **Conventional Commits**. Add comments where the intent isn’t obvious.

### 1) `.nvmrc`

Pin Node LTS (e.g. `v20.x`).

### 2) `package.json` (scripts – examples)

```json
{
  "scripts": {
    "dev": "concurrently \"next dev --turbopack\" \"convex dev\" \"ngrok http 3000\"",
    "dev:next": "next dev --turbopack",
    "dev:convex": "convex dev",
    "dev:tunnel": "ngrok http 3000",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --check .",
    "test": "vitest run",
    "test:ui": "playwright test",
    "depcheck": "depcheck --ignore-bin-package=true",
    "depgraph": "madge --circular --extensions ts,tsx src",
    "ci": "pnpm typecheck && pnpm lint && pnpm format && pnpm test && pnpm build && pnpm depcheck && pnpm depgraph"
  }
}
```

### 3) `tsconfig.json`

- Ensure strict flags from the plan are enabled.
- Add path aliases for `@/lib/*`, `@/components/*`, `@/server/*`.

### 4) `src/lib/authz.ts`

- Implement helpers (`getSessionUser`, `getOrganisationIdFromSession`, `require*Permission`).
- SSR-only; no client import.

### 5) `src/lib/permissions.ts`

- Export **permission registry** (id, group, description).
- Export **default roles** with permission sets.
- Add seed utility used during org creation or a dedicated `pnpm seed`.

### 6) `src/lib/audit.ts`

- Wrapper to persist audit entries.
- Provide typed actions enum.
- Ensure both **success and failure** paths can be logged.

### 7) `src/lib/flags.ts`

- Zod schema for flags, default values, SSR resolver, audit on change.

### 8) `src/lib/email.ts`

- One send entrypoint with transport selection (Resend).
- Templating helper with org branding.
- Retries & surfaced errors.

### 9) `src/lib/analytics.ts`

- `track(event, props)` that calls **your proxy endpoint**, strips PII, appends safe org/role context.

### 10) Convex functions

- For each query/mutation:
  - Derive `organisationId` → forbid passing from client.
  - Validate input with Zod.
  - Call `audit.record()` where relevant.

### 11) Admin UIs

- `/admin/permissions` wired to `permissions.ts`, not hand-rolled arrays.
- `/admin/flags` gated by `requireSystemPermission('flags.manage')`.
- `/admin/audit` table with filters, pagination, and export.

### 12) Route UX

- Add `error.tsx`, `not-found.tsx`, `loading.tsx` per group.
- Replace global spinners with skeleton loaders.

### 13) Rate limiting

- Add a tiny limiter middleware for sensitive routes (invite, permission change, analytics proxy).

### 14) Tests

- **Vitest** for libs + Convex mutations (mock session context).
- **Playwright** for the two critical flows above.

### 15) CI

- Add GitHub Actions workflow that runs `pnpm ci`.
- Set branch protections (`dev`, `main`) to require passing checks.

### 16) Docs

- Update README Quick Start (envs, seeding, roles).
- Add ADRs.
- Merge/trim duplicate guides.

---

## Acceptance Criteria (tick in PR description)

- [ ] No unused deps; no circular deps; CI green.
- [ ] TS strict passes; zero `any` in `src/lib/*` and Convex handlers.
- [ ] Permission registry is the **single source of truth**; new orgs auto-seeded.
- [ ] All security-relevant mutations write audit entries (success & failure).
- [ ] Flags resolved server-side; audited edits; gated to system admin.
- [ ] All analytics travel through proxy; PII scrub tested.
- [ ] Convex never trusts client org IDs; Zod validation everywhere.
- [ ] Error/not-found/loading implemented consistently; skeletons on list pages.
- [ ] Playwright flow: invite → assign role → change permission → audit visible (passes).
- [ ] README updated; ADRs added; duplicate docs consolidated.

---

## House Style

- Conventional Commits (e.g., `feat(authz): add server-side org guards`).
- Keep functions small; prefer pure units with tests.
- Avoid magic numbers; centralise design tokens.
- A11y: keyboard support, focus states, ARIA where appropriate.
- Keep comments sharp and minimal; write ADRs for decisions.
- All errors and success messages to be handled in toasts.

---

## When you’re ready, start by:

1. Running an audit (`depcheck`, `madge`) and posting a short report in a new comment.
2. Proposing the `src/lib/*` scaffolding with minimal stubs and tests.
3. Opening a single “Foundations Hardening” PR with the checklist above; then branch into small follow-ups if needed.

If anything in the repo structure contradicts this plan, **propose the adjustment first**, then implement.
