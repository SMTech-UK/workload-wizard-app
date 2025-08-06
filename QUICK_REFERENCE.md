# 🚀 Quick Reference Guide

## Permission System Cheat Sheet

### Adding New Permissions

1. **Add via Admin UI**: `/admin/permissions`
2. **Protect Backend Function**:
   ```typescript
   await requirePermission(ctx, args.userId, "your.permission");
   ```
3. **Check in Frontend**:
   ```typescript
   const canAccess = useQuery(api.permissions.hasPermission, {
     userId: user?.id || "",
     permissionId: "your.permission"
   });
   ```

### Common Permission Patterns

```typescript
// Module permissions
"modules.create", "modules.edit", "modules.delete", "modules.view"

// User permissions  
"users.create", "users.edit", "users.delete", "users.view"

// Staff permissions
"staff.create", "staff.edit", "staff.delete", "staff.view"

// Admin permissions
"admin.users", "admin.organisations", "admin.system"
```

### System Roles Hierarchy

```
developer/sysadmin -> Bypass all permission checks
admin -> Organisation admin level
orgadmin -> Organisation admin 
user -> Standard permissions apply
```

### Key Endpoints

- **Admin Permissions**: `/admin/permissions`
- **Role Management**: `/organisation/roles`  
- **User Management**: `/admin/users`
- **Audit Logs**: [Interface needed]

### Database Tables

```
system_permissions -> Global permission definitions
user_roles -> Organisation-specific roles  
user_role_assignments -> User ↔ Role mappings
audit_logs -> All permission changes tracked
```

### Quick Commands

```typescript
// Check permission
const hasPermission = useQuery(api.permissions.hasPermission, { userId, permissionId });

// Enforce permission  
await requirePermission(ctx, userId, permissionId);

// Create role
await createRole({ name, description, organisationId, permissions });

// Log audit event
await logAuditEvent({ action, entityType, entityId, details });
```

## Documentation Links

- [📖 Permission System Guide](./PERMISSION_SYSTEM_GUIDE.md) - Complete documentation
- [🔍 Audit Logging Guide](./AUDIT_LOGGING_GUIDE.md) - Audit system
- [👥 User Management](./USER_MANAGEMENT_FEATURES.md) - User features
- [⚙️ Setup Guide](./USER_MANAGEMENT_SETUP.md) - Configuration

---

*Last updated: January 2025*