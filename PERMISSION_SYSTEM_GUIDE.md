# Permission System Guide

## 🔐 Overview

The Workload Wizard app implements a comprehensive Role-Based Access Control (RBAC) system with granular permissions, audit logging, and multi-tenancy support. The system provides both system-level and organisation-level permission management.

## 🏗️ Architecture

### Core Components

1. **System Permissions** (`system_permissions` table)
   - Global permission definitions
   - Grouped by functional area (e.g., "users", "staff", "modules")
   - Default role assignments for new organisations

2. **User Roles** (`user_roles` table)
   - Organisation-specific roles
   - Contains arrays of permission IDs
   - Can inherit from system defaults or have custom permissions

3. **User Role Assignments** (`user_role_assignments` table)
   - Links users to roles within organisations
   - Tracks assignment history and audit trail

4. **System Roles** (Clerk metadata)
   - High-level administrative roles: `user`, `orgadmin`, `sysadmin`, `developer`
   - Bypass permission checks for system administrators

## 📊 Permission Hierarchy

```
System Roles (Highest)
├── sysadmin/developer -> Bypass all checks
├── admin -> Bypass organisation checks  
└── user -> Standard permission checks

Organisation Roles (Detailed)
├── Role permissions (Custom assignments)
└── System default permissions (Auto-assigned)
```

## 🔧 Permission Management

### 1. System Permission Registry (`/admin/permissions`)

**Features:**
- Create, edit, delete system permissions
- Group permissions by functional area
- Assign default roles for automatic distribution
- Push permissions to existing organisations
- Force delete with automatic cleanup

**Permission Structure:**
```typescript
{
  id: "users.edit",           // Unique permission identifier
  group: "users",             // Functional grouping
  description: "Edit users",  // Human-readable description
  defaultRoles: ["Admin"],    // Roles that get this permission automatically
  isActive: true              // Permission status
}
```

**Key Operations:**
- **Create**: Add new permissions with default role assignments
- **Edit**: Modify description, grouping, and default roles
- **Delete**: Safe deletion with usage checks, force delete option
- **Push to Orgs**: Propagate new permissions to existing organisations

### 2. Organisation Role Management (`/organisation/roles`)

**Features:**
- Create custom roles for organisation
- Manage role permissions (system defaults + custom overrides)
- Visual permission matrix showing source (system vs custom)
- Role deletion with safety checks

**Role Structure:**
```typescript
{
  name: "Department Head",
  description: "Manages department staff and resources",
  permissions: ["users.edit", "staff.create"],  // Array of permission IDs
  organisationId: "org_123",
  isDefault: false,          // Whether it's a default system role
  isActive: true
}
```

## 🚦 Permission Checking & Enforcement

### Permission Resolution Logic

```typescript
function hasPermission(userId: string, permissionId: string): boolean {
  // 1. Get user details
  const user = getUserBySubject(userId);
  
  // 2. System role bypass
  if (user.systemRole in ["sysadmin", "developer", "admin"]) {
    return true;
  }
  
  // 3. Get user's role assignment
  const assignment = getUserRoleAssignment(userId, user.organisationId);
  const role = getRole(assignment.roleId);
  
  // 4. Check permission
  if (role.permissions.includes(permissionId)) {
    return true;  // Custom assignment
  }
  
  // 5. Check system defaults
  const systemPerm = getSystemPermission(permissionId);
  return systemPerm.defaultRoles.includes(role.name);
}
```

### Enforcement Functions

```typescript
// Query function - returns boolean
await hasPermission({ userId, permissionId });

// Enforcement function - throws error if denied
await requirePermission(ctx, userId, permissionId);
```

### Usage in Mutations

```typescript
export const updateUser = mutation({
  handler: async (ctx, args) => {
    // Enforce permission before proceeding
    await requirePermission(ctx, args.currentUserId, "users.edit");
    
    // Proceed with protected operation
    await ctx.db.patch(args.userId, updates);
  }
});
```

## 📋 Permission Assignment Process

### 1. System Permission Creation
1. Admin creates system permission via `/admin/permissions`
2. Permission stored in `system_permissions` table
3. Default roles specified for automatic assignment

### 2. Organisation Setup
1. New organisation created
2. Default roles automatically created (`Admin`, `Manager`, `Lecturer`, `Viewer`)
3. System permissions pushed to roles based on `defaultRoles` configuration

### 3. Custom Role Management
1. Organisation admins create custom roles via `/organisation/roles`
2. Permissions assigned manually or inherited from system defaults
3. Visual indicators show permission source (system vs custom)

### 4. User Assignment
**⚠️ Currently Missing - Implementation Needed:**
- User → Role assignment interface
- Bulk role assignment tools
- User permission overview

### 5. Permission Checking
1. User attempts protected operation
2. `requirePermission()` called in mutation/query
3. Permission resolution logic executed
4. Operation proceeds or access denied

## 🔍 Audit Logging

### Tracked Events

**Permission Events:**
- `permission.assigned` - Permission granted to role
- `permission.revoked` - Permission removed from role
- `permission.pushed` - Bulk permission distribution

**Role Events:**
- `role.created` - New role creation
- `role.updated` - Role modification
- `role.deleted` - Role deletion

**System Events:**
- `create`, `update`, `delete` - Permission CRUD operations

### Audit Data Structure

```typescript
{
  action: "permission.assigned",
  entityType: "permission",
  entityId: "users.edit",
  entityName: "users.edit",
  performedBy: "user_123",
  performedByName: "John Doe",
  organisationId: "org_456",
  details: "Permission 'users.edit' assigned to role 'Manager'",
  metadata: {
    roleId: "role_789",
    roleName: "Manager",
    viaDefaultRoles: true
  },
  timestamp: 1640995200000,
  severity: "info"
}
```

## 📁 Database Schema

### Core Tables

```sql
-- System permission definitions
system_permissions {
  id: string,              -- "users.edit"
  group: string,           -- "users"
  description: string,     -- "Edit user accounts"
  defaultRoles: string[],  -- ["Admin", "Manager"]
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}

-- Organisation-specific roles
user_roles {
  name: string,           -- "Department Head"
  description: string,    -- Role description
  permissions: string[],  -- ["users.edit", "staff.create"]
  organisationId: Id,     -- Links to organisation
  isDefault: boolean,     -- System-created role
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}

-- User → Role assignments
user_role_assignments {
  userId: string,         -- Clerk user ID
  roleId: Id,            -- Links to user_roles
  organisationId: Id,     -- Organisation context
  assignedBy: string,     -- Who made the assignment
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}

-- Users table (includes system role)
users {
  subject: string,        -- Clerk user ID
  systemRole: string,     -- "user", "orgadmin", "sysadmin"
  organisationId: Id,     -- User's organisation
  // ... other user fields
}
```

## 🛠️ Implementation Examples

### Creating a Protected Mutation

```typescript
export const createStaffMember = mutation({
  args: {
    userId: v.string(),
    staffData: v.object({...}),
  },
  handler: async (ctx, args) => {
    // Enforce permission
    await requirePermission(ctx, args.userId, "staff.create");
    
    // Protected operation
    const staffId = await ctx.db.insert("staff", args.staffData);
    
    // Audit logging (automatic via audit system)
    return staffId;
  }
});
```

### Checking Permissions in Frontend

```typescript
// Using the hasPermission query
const canEditUsers = useQuery(api.permissions.hasPermission, {
  userId: user?.id || "",
  permissionId: "users.edit"
});

// Conditional rendering
{canEditUsers && (
  <Button onClick={handleEditUser}>
    Edit User
  </Button>
)}
```

### Adding New System Permission

1. **Backend**: Add to system via `/admin/permissions`
2. **Frontend**: Use permission checks in components
3. **Enforcement**: Add `requirePermission()` calls to mutations

```typescript
// In protected mutation
await requirePermission(ctx, args.userId, "modules.create");
```

## 🔄 Permission Workflow

### Adding a New Feature with Permissions

1. **Define Permission**
   ```typescript
   // Add via admin interface or directly
   {
     id: "modules.create",
     group: "modules",
     description: "Create new academic modules",
     defaultRoles: ["Admin", "Manager"]
   }
   ```

2. **Protect Backend Functions**
   ```typescript
   export const createModule = mutation({
     handler: async (ctx, args) => {
       await requirePermission(ctx, args.userId, "modules.create");
       // ... protected logic
     }
   });
   ```

3. **Conditional Frontend Access**
   ```typescript
   const canCreate = useQuery(api.permissions.hasPermission, {
     userId: user?.id || "",
     permissionId: "modules.create"
   });
   ```

4. **Push to Organisations**
   - Use "Push to Orgs" button in admin interface
   - Automatically assigns to roles based on `defaultRoles`

## 🚨 Security Considerations

### Permission Best Practices

1. **Principle of Least Privilege**
   - Users get minimal permissions needed for their role
   - System admins bypass checks but operations are logged

2. **Defense in Depth**
   - Frontend checks for UX (can be bypassed)
   - Backend enforcement is authoritative
   - All permission changes are audited

3. **Fail Secure**
   - Missing permissions default to denied
   - System errors don't grant access
   - Inactive permissions/roles are ignored

### System Role Hierarchy

```
developer/sysadmin -> Full system access, bypasses all checks
admin -> Organisation admin, bypasses org-level checks  
orgadmin -> Organisation admin role
user -> Standard user, subject to all permission checks
```

## 📈 Current Status

### ✅ Implemented Features

- ✅ System permission registry with admin interface
- ✅ Organisation role management interface
- ✅ Permission checking and enforcement functions
- ✅ Comprehensive audit logging
- ✅ Default permission distribution system
- ✅ Force delete with automatic cleanup
- ✅ Permission grouping and organisation
- ✅ System role bypass logic

### ⚠️ Missing Implementation

- ❌ User → Role assignment interface
- ❌ Bulk role assignment tools  
- ❌ User permission overview page
- ❌ Permission history/audit UI
- ❌ Role template system
- ❌ Permission inheritance visualization

### 🎯 Next Steps

1. **User Role Assignment Interface**
   - Page to assign users to organisation roles
   - Bulk assignment capabilities
   - Assignment history tracking

2. **Enhanced Management Tools**
   - User permission overview dashboard
   - Permission conflict resolution
   - Role usage analytics

3. **Advanced Features**
   - Time-based permissions
   - Conditional permissions
   - Permission delegation

## 🔗 Related Documentation

- [Audit Logging Guide](./AUDIT_LOGGING_GUIDE.md)
- [User Management Setup](./USER_MANAGEMENT_SETUP.md)
- [User Management Features](./USER_MANAGEMENT_FEATURES.md)

## 🏃‍♂️ Quick Start

### For Developers

1. **Add new permission**:
   ```bash
   # Via admin interface at /admin/permissions
   # Or directly in database/migrations
   ```

2. **Protect a function**:
   ```typescript
   await requirePermission(ctx, userId, "your.permission");
   ```

3. **Check in frontend**:
   ```typescript
   const hasAccess = useQuery(api.permissions.hasPermission, {
     userId: user?.id || "",
     permissionId: "your.permission"
   });
   ```

### For Administrators

1. **Access admin interface**: `/admin/permissions`
2. **Manage organisation roles**: `/organisation/roles`
3. **View audit logs**: [Audit system interface needed]
4. **Assign user roles**: [Interface needed - coming soon]

---

*Last updated: January 2025*
*Version: 1.0*