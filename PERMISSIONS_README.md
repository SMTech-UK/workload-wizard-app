# Permission-Aware UI States

This document describes the comprehensive permission system implemented for the application, providing centralized gating utilities, automatic UI state management, and proper error handling.

## Overview

The permission system provides:

- **Centralized gating utilities** for org vs system roles
- **Automatic UI state management** (disable/hide forbidden actions)
- **Consistent error handling** with 403 redirects to `/unauthorised`
- **Toast notifications** for client-denied actions
- **Reusable components** for common permission scenarios

## Core Components

### 1. PermissionGate

The main component for conditionally rendering content based on permissions.

```tsx
import { PermissionGate, UsersViewGate, UsersCreateGate } from "@/components/common";

// Basic usage
<PermissionGate permission="users.view" organisationId="org123">
  <UserList />
</PermissionGate>

// Hide forbidden actions
<PermissionGate permission="users.delete" hide>
  <DeleteButton />
</PermissionGate>

// Disable forbidden actions
<PermissionGate permission="users.edit" disabled>
  <EditButton />
</PermissionGate>

// Custom fallback
<PermissionGate
  permission="users.create"
  fallback={<p>No permission to create users</p>}
>
  <CreateUserForm />
</PermissionGate>

// Convenience components
<UsersViewGate>
  <UserList />
</UsersViewGate>

<UsersCreateGate hide>
  <CreateUserButton />
</UsersCreateGate>
```

### 2. PermissionButton

Automatically handles permission gating for buttons with proper disabled states and tooltips.

```tsx
import {
  PermissionButton,
  CreateUserButton,
  EditUserButton
} from "@/components/common";

// Basic usage
<PermissionButton
  permission="users.create"
  onClick={handleCreate}
>
  Create User
</PermissionButton>

// Convenience components
<CreateUserButton onClick={handleCreate}>
  Create User
</CreateUserButton>

<EditUserButton
  variant="outline"
  onClick={handleEdit}
>
  Edit User
</EditUserButton>

// Custom disabled text
<DeleteUserButton
  disabledText="Only admins can delete users"
  onClick={handleDelete}
>
  Delete User
</DeleteUserButton>
```

### 3. PermissionPageWrapper

Wraps entire pages with permission checks and handles unauthorized access.

```tsx
import {
  PermissionPageWrapper,
  AdminPageWrapper,
  UsersPageWrapper,
} from "@/components/common";

// Wrap a page with permission check
export default function AdminDashboard() {
  return (
    <AdminPageWrapper organisationId="org123">
      <div>
        <h1>Admin Dashboard</h1>
        {/* Page content */}
      </div>
    </AdminPageWrapper>
  );
}

// Custom permission check
<PermissionPageWrapper
  permission="flags.manage"
  isSystemAction={true}
  fallback={<p>System admin access required</p>}
  redirectOnDenied={false}
>
  <FeatureFlagsPage />
</PermissionPageWrapper>;
```

## Hooks

### 1. usePermissions

Enhanced hook with centralized gating utilities.

```tsx
import { usePermissions } from "@/hooks/usePermissions";

function MyComponent() {
  const permissions = usePermissions("org123");

  // Basic permission checks
  const canCreate = permissions.canCreateUsers();
  const canEdit = permissions.canEditUsers();

  // Centralized gating utilities
  const uiState = permissions.gateUIState("users.create", {
    hideForbidden: true,
  });

  const buttonState = permissions.gateButtonState("users.edit", {
    disabledText: "Insufficient permissions",
  });

  const actionState = permissions.gateActionState("users.delete", {
    actionName: "delete users",
  });

  return (
    <div>
      {permissions.isSystemAdmin() && <SystemAdminPanel />}
      {permissions.isOrgAdmin() && <OrgAdminPanel />}
    </div>
  );
}
```

### 2. usePermissionActions

Hook for executing actions with permission checks and automatic error handling.

```tsx
import {
  usePermissionActions,
  useUserActions,
  useAdminActions,
} from "@/hooks/usePermissionActions";

function MyComponent() {
  const { executeWithPermission } = usePermissionActions();
  const userActions = useUserActions();
  const adminActions = useAdminActions();

  const handleCreateUser = async () => {
    const result = await executeWithPermission(
      "users.create",
      async () => {
        // Your action logic here
        return await createUser(userData);
      },
      {
        actionName: "create a new user",
        onDenied: () => console.log("Permission denied"),
        onError: (error) => console.error("Action failed:", error),
      },
    );

    if (result) {
      // Action succeeded
    }
  };

  // Convenience methods
  const handleEditUser = async () => {
    const result = await userActions.editUser(async () => {
      return await updateUser(userId, userData);
    });
  };

  const handleManagePermissions = async () => {
    const result = await adminActions.managePermissions(async () => {
      return await updatePermissions(roleId, permissions);
    });
  };

  return (
    <div>
      <button onClick={handleCreateUser}>Create User</button>
      <button onClick={handleEditUser}>Edit User</button>
      <button onClick={handleManagePermissions}>Manage Permissions</button>
    </div>
  );
}
```

## Server-Side Permission Checking

### 1. Basic Permission Checks

```tsx
import { requireOrgPermission, requireSystemPermission } from "@/lib/authz";

// Organization-level permission
export async function POST(request: Request) {
  await requireOrgPermission("users.create");

  // Your API logic here
  return Response.json({ success: true });
}

// System-level permission
export async function GET(request: Request) {
  await requireSystemPermission("flags.manage");

  // Your API logic here
  return Response.json({ flags: [] });
}
```

### 2. Enhanced Permission Checking with Redirects

```tsx
import { requirePermissionWithRedirect } from "@/lib/authz";

export async function POST(request: Request) {
  await requirePermissionWithRedirect("users.delete", {
    organisationId: "org123",
    redirectTo: "/unauthorised",
  });

  // Your API logic here
  return Response.json({ success: true });
}
```

## Permission Utilities

### 1. Direct Permission Functions

```tsx
import {
  hasPermission,
  gateUIState,
  gateButtonState,
  gateActionState,
} from "@/lib/permissions";

// Check permission directly
const canDelete = hasPermission(userRole, "users.delete", orgId);

// Get UI state
const uiState = gateUIState(userRole, "users.create", {
  organisationId: orgId,
  hideForbidden: true,
});

// Get button state
const buttonState = gateButtonState(userRole, "users.edit", {
  organisationId: orgId,
  disabledText: "Insufficient permissions",
});

// Get action state
const actionState = gateActionState(userRole, "users.delete", {
  organisationId: orgId,
  actionName: "delete users",
});
```

### 2. Client-Side Permission Checker

```tsx
import { createClientPermissionChecker } from "@/lib/authz";

function MyComponent({ userRole, organisationId }) {
  const permissionChecker = createClientPermissionChecker(
    userRole,
    organisationId,
  );

  const handleAction = () => {
    try {
      permissionChecker.requirePermission("users.create");
      // Execute action
    } catch (error) {
      // Handle permission denied
      console.log("Permission denied:", error.message);
    }
  };

  return <button onClick={handleAction}>Create User</button>;
}
```

## Error Handling

### 1. Automatic 403 Redirects

The system automatically redirects users to `/unauthorised` when:

- Server-side permission checks fail
- API routes return 403 status
- Page-level permission checks fail

### 2. Toast Notifications

Client-side permission denials show toast notifications:

- **Access Denied**: When trying to access forbidden content
- **Error**: When actions fail due to permissions
- **Custom messages**: Configurable through action options

### 3. Fallback Content

Components can show fallback content when permissions are denied:

- Custom error messages
- Alternative UI elements
- Loading states during redirects

## Best Practices

### 1. Component Organization

```tsx
// Use PermissionGate for conditional rendering
<PermissionGate permission="users.view">
  <UserList />
</PermissionGate>

// Use PermissionButton for interactive elements
<PermissionButton permission="users.create" onClick={handleCreate}>
  Create User
</PermissionButton>

// Use PermissionPageWrapper for entire pages
<AdminPageWrapper>
  <AdminDashboard />
</AdminPageWrapper>
```

### 2. Hook Usage

```tsx
// Use usePermissions for UI state management
const permissions = usePermissions(orgId);
const canCreate = permissions.canCreateUsers();

// Use usePermissionActions for executing actions
const { executeWithPermission } = usePermissionActions();
const result = await executeWithPermission("users.create", createUserAction);
```

### 3. Error Handling

```tsx
// Always provide fallbacks for better UX
<PermissionGate
  permission="users.delete"
  fallback={<p>Delete action not available</p>}
>
  <DeleteButton />
</PermissionGate>;

// Handle permission denials gracefully
const result = await executeWithPermission("users.create", action, {
  onDenied: () => {
    // Custom handling for permission denied
  },
  onError: (error) => {
    // Custom error handling
  },
});
```

## Migration Guide

### From Old Permission System

1. **Replace direct permission checks**:

   ```tsx
   // Old
   if (hasPermission(userRole, "users.create")) {
     return <CreateButton />;
   }

   // New
   <PermissionGate permission="users.create">
     <CreateButton />
   </PermissionGate>;
   ```

2. **Replace conditional rendering**:

   ```tsx
   // Old
   {
     canEditUsers && <EditButton />;
   }

   // New
   <UsersEditGate>
     <EditButton />
   </UsersEditGate>;
   ```

3. **Replace manual error handling**:

   ```tsx
   // Old
   try {
     if (!hasPermission(userRole, "users.delete")) {
       throw new Error("Permission denied");
     }
     // Action logic
   } catch (error) {
     // Handle error
   }

   // New
   const result = await executeWithPermission("users.delete", action);
   ```

## Examples

See `src/components/common/PermissionExamples.tsx` for comprehensive examples of all components and utilities.

## Troubleshooting

### Common Issues

1. **Permission checks not working**: Ensure `organisationId` is passed correctly
2. **Redirects not working**: Check that `/unauthorised` route exists
3. **Toast not showing**: Verify toast provider is set up in your app
4. **Server-side errors**: Use `requirePermissionWithRedirect` for automatic redirects

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG_PERMISSIONS=true
```

This will log all permission checks and decisions to the console.
