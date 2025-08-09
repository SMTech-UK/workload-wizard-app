# Permissions & Roles (RBAC)

Canonical reference for the RBAC system and permission registry.

## Registry

- Canonical permission metadata in `src/lib/permissions.ts`
- Admin UI: `/admin/permissions` (system registry) and `/organisation/roles`

## Key Tables (Convex)

- `system_permissions`, `user_roles`, `user_role_assignments`

## Auditing

- All permission and role changes are logged in `audit_logs`

_Last updated: January 2025_
