# Audit Logging Guide

## Overview

The audit logging system provides comprehensive tracking of all user actions and system events across the application. It automatically captures who performed what action, when, and with what context. This includes detailed permission and role management tracking as part of the RBAC system.

## Architecture

### Database Schema (`convex/schema.ts`)

```typescript
audit_logs: defineTable({
  action: v.string(),
  entityType: v.string(),
  entityId: v.string(),
  entityName: v.optional(v.string()),
  performedBy: v.string(),
  performedByName: v.optional(v.string()),
  organisationId: v.optional(v.id("organisations")),
  details: v.optional(v.string()),
  metadata: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  timestamp: v.float64(),
  severity: v.optional(v.string()),
});
```

### Core Components

1. Convex functions (`convex/audit.ts`) for create/list/stats
2. Server actions (`src/lib/actions/auditActions.ts`) helpers and convenience functions
3. UI components (`AuditLogsViewer`) and page `/admin/audit-logs`
4. Hook `src/hooks/useAuditLog.ts`

## Usage Examples

### Server Actions

```typescript
import {
  logUserCreated,
  logUserDeleted,
  logUserUpdated,
} from "@/lib/actions/auditActions";

await logUserCreated(userId, userEmail, "User created via admin interface");
await logUserDeleted(userId, userEmail, "User deleted by admin");
await logUserUpdated(
  userId,
  userEmail,
  { role: "admin" },
  "Role changed to admin",
);
```

### Direct Audit Event

```typescript
import { logAuditEvent } from "@/lib/actions/auditActions";

await logAuditEvent({
  action: "custom_action",
  entityType: "module",
  entityId: moduleId,
  entityName: moduleName,
  details: "Custom module operation performed",
  metadata: { customData: "value" },
  severity: "info",
});
```

## Viewing Audit Logs

- Admin UI: `/admin/audit-logs`
- Programmatic: `getAuditLogs`, `getAuditStats` in `auditActions.ts`

## Best Practices

- Be specific in details; prefer structured `metadata`
- Use appropriate `severity`
- Avoid sensitive data in details; use metadata judiciously

## Related Documentation

- Permissions: `docs/PERMISSIONS.md`
- User Management: `docs/USER_MANAGEMENT.md`

_Last updated: January 2025_
