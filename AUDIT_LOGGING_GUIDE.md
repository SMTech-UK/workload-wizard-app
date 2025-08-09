# 🔍 Audit Logging System Guide

## Overview

The audit logging system provides comprehensive tracking of all user actions and system events across the application. It automatically captures who performed what action, when, and with what context. This includes detailed permission and role management tracking as part of the RBAC system.

## 🏗️ Architecture

### Database Schema (`convex/schema.ts`)

```typescript
audit_logs: defineTable({
  action: v.string(), // 'create', 'update', 'delete', 'login', etc.
  entityType: v.string(), // 'user', 'organisation', 'module', etc.
  entityId: v.string(), // ID of the affected entity
  entityName: v.optional(v.string()), // Human-readable name
  performedBy: v.string(), // User ID who performed the action
  performedByName: v.optional(v.string()), // Human-readable name
  organisationId: v.optional(v.id("organisations")), // Organisation context
  details: v.optional(v.string()), // Additional details
  metadata: v.optional(v.string()), // JSON string for structured data
  ipAddress: v.optional(v.string()), // IP address of the request
  userAgent: v.optional(v.string()), // User agent of the request
  timestamp: v.float64(),
  severity: v.optional(v.string()), // 'info', 'warning', 'error', 'critical'
});
```

### Core Components

1. **Convex Functions** (`convex/audit.ts`)
   - `create` - Create audit log entries
   - `list` - Query audit logs with filters
   - `getEntityLogs` - Get logs for specific entity
   - `getUserActivity` - Get user activity logs
   - `getRecentLogs` - Get recent logs for dashboard
   - `getStats` - Get audit statistics

2. **Server Actions** (`src/lib/actions/auditActions.ts`)
   - `logAuditEvent` - Main logging function
   - Convenience functions for common events
   - Admin functions for viewing logs

3. **UI Components**
   - `AuditLogsViewer` - Admin interface for viewing logs
   - Admin page at `/admin/audit-logs`

4. **Custom Hook** (`src/hooks/useAuditLog.ts`)
   - Easy-to-use hook for components

## 🚀 Usage Examples

### 1. Server Actions (Recommended for backend operations)

```typescript
import {
  logUserCreated,
  logUserDeleted,
  logUserUpdated,
} from "@/lib/actions/auditActions";

// User creation
await logUserCreated(userId, userEmail, "User created via admin interface");

// User deletion
await logUserDeleted(userId, userEmail, "User deleted by admin");

// User update
await logUserUpdated(
  userId,
  userEmail,
  { role: "admin", isActive: true },
  "Role changed to admin",
);
```

### 2. Custom Hook (For component-level logging)

```typescript
import { useAuditLog } from '@/hooks/useAuditLog';

function UserProfile({ userId, userEmail }) {
  const { logUpdate, logError } = useAuditLog({
    entityType: 'user',
    entityId: userId,
    entityName: userEmail,
  });

  const handleUpdateProfile = async (changes) => {
    try {
      // Update user logic here
      await updateUser(userId, changes);

      // Log the update
      await logUpdate(changes, 'Profile updated via user interface');
    } catch (error) {
      await logError(error, 'Profile update');
    }
  };

  return <div>...</div>;
}
```

### 3. Direct Audit Event Logging

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

## 📊 Available Convenience Functions

### User Operations

- `logUserCreated(userId, userEmail, details?)`
- `logUserDeleted(userId, userEmail, details?)`
- `logUserUpdated(userId, userEmail, changes, details?)`
- `logUserLogin(userId, userEmail, details?)`
- `logUserLogout(userId, userEmail, details?)`
- `logPermissionChange(userId, userEmail, oldRole, newRole, details?)`

### Organisation Operations

- `logOrganisationCreated(orgId, orgName, details?)`
- `logOrganisationUpdated(orgId, orgName, changes, details?)`

### Module Operations

- `logModuleCreated(moduleId, moduleName, details?)`
- `logModuleUpdated(moduleId, moduleName, changes, details?)`
- `logModuleDeleted(moduleId, moduleName, details?)`

### Academic Year Operations

- `logAcademicYearCreated(yearId, yearName, details?)`
- `logAcademicYearUpdated(yearId, yearName, changes, details?)`

### Error Logging

- `logError(error, context, entityType?, entityId?)`

## 🔍 Viewing Audit Logs

### Admin Interface

Navigate to `/admin/audit-logs` to view the audit logs interface with:

- Real-time statistics
- Advanced filtering
- Detailed log entries
- Export capabilities

### Programmatic Access

```typescript
import { getAuditLogs, getAuditStats } from "@/lib/actions/auditActions";

// Get filtered logs
const logs = await getAuditLogs({
  entityType: "user",
  action: "create",
  limit: 100,
});

// Get statistics
const stats = await getAuditStats({
  startDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
});
```

## 🎯 Integration Points

### Already Integrated

- ✅ User creation (`createUser`)
- ✅ User deletion (`deleteUser`)
- ✅ User updates (`updateUser`)

### To Integrate (Examples)

```typescript
// In organisation actions
await logOrganisationCreated(orgId, orgName);

// In module actions
await logModuleCreated(moduleId, moduleName);

// In error handlers
try {
  // Your logic
} catch (error) {
  await logError(error, "Module creation");
}
```

## 🔧 Configuration

### Environment Variables

No additional environment variables required - uses existing Clerk and Convex setup.

### Permissions

- **Viewing logs**: Admin role required
- **Creating logs**: Automatic for authenticated users
- **IP tracking**: Automatic via request headers

### Customization

You can extend the system by:

1. Adding new convenience functions in `auditActions.ts`
2. Creating new entity types in the schema
3. Adding custom severity levels
4. Extending the metadata structure

## 📈 Best Practices

1. **Be Specific**: Include meaningful details in audit logs
2. **Use Metadata**: Store structured data in metadata field
3. **Appropriate Severity**: Use correct severity levels
4. **Error Handling**: Always log errors with context
5. **Performance**: Audit logging is async and won't block operations
6. **Privacy**: Be mindful of sensitive data in logs

## 🚨 Security Considerations

- Audit logs are immutable once created
- Only admins can view audit logs
- IP addresses and user agents are automatically captured
- Sensitive data should be in metadata, not details
- Logs are stored in Convex with proper access controls

## 🔄 Maintenance

### Log Retention

- Logs are stored indefinitely in Convex
- Consider implementing log rotation for performance
- Monitor log volume and adjust limits as needed

### Performance

- Audit logging is asynchronous and non-blocking
- Large log volumes may impact query performance
- Use appropriate limits when querying logs

### Monitoring

- Monitor audit log creation failures
- Set up alerts for critical severity events
- Regular review of audit statistics

## 🔗 Related Documentation

- [Permission System Guide](./PERMISSION_SYSTEM_GUIDE.md) - Complete RBAC system with permission audit logging
- [User Management Features](./USER_MANAGEMENT_FEATURES.md) - User management capabilities
- [User Management Setup](./USER_MANAGEMENT_SETUP.md) - Configuration guide

---

_Last updated: January 2025_
