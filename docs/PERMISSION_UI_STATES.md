# Permission-Aware UI States

This document describes the implementation of permission-aware UI states in the workload-wizard-app, including centralized gating utilities for organization vs system roles.

## Overview

The permission system provides comprehensive UI state management that automatically disables, hides, or modifies UI elements based on user permissions. It handles both organization-level and system-level permissions with consistent behavior across the application.

## Key Features

✅ **Centralized gating util for org vs system roles** - `PermissionGatingUtil` class
✅ **Disable/hide forbidden actions** - Automatic UI state management
✅ **403 routes redirect to `/unauthorised`** - Built-in error handling
✅ **Toast on client-denied actions** - User feedback for permission errors

## Core Components

### 1. PermissionGatingUtil Class

Located in `src/lib/permission-gating.ts`, this class provides the main gating functionality:

```typescript
import { createPermissionGating } from "@/lib/permission-gating";

const gating = createPermissionGating(userRole, organisationId);

// Gate UI elements
const elementState = gating.gateElement("users.create", {
  hideForbidden: true,
  isSystemAction: false,
});

// Gate buttons
const buttonState = gating.gateButton("users.edit", {
  isSystemAction: false,
  disabledText: "Insufficient permissions",
});

// Gate form fields
const fieldState = gating.gateField("users.delete", {
  isSystemAction: false,
  readonly: false,
});
```

### 2. usePermissionGating Hook

Located in `src/hooks/usePermissionGating.ts`, this hook provides easy access to gating functionality in React components:

```typescript
import { usePermissionGating } from "@/hooks/usePermissionGating";

function MyComponent({ organisationId }) {
  const { gateButton, gateField, hasPermission } = usePermissionGating(organisationId);

  const buttonState = gateButton("users.create");

  return (
    <Button disabled={buttonState.disabled} title={buttonState.disabledText}>
      Create User
    </Button>
  );
}
```

### 3. PermissionGatingExample Component

Located in `src/components/common/PermissionGatingExample.tsx`, this component demonstrates all the gating patterns:

```typescript
import { PermissionGatingExample } from "@/components/common";

// Use in your components
<PermissionGatingExample organisationId={orgId} />
```

## Permission Scopes

The system supports three permission scopes:

- **`system`** - System-level permissions (e.g., managing organizations)
- **`org`** - Organization-level permissions (e.g., managing users within an org)
- **`both`** - Permissions that work at both levels

## Usage Patterns

### Gating Buttons

```typescript
const { gateButton } = usePermissionGating(organisationId);

const buttonState = gateButton("users.create", {
  isSystemAction: false,
  disabledText: "Only admins can create users"
});

<Button disabled={buttonState.disabled} title={buttonState.disabledText}>
  Create User
</Button>
```

### Gating Form Fields

```typescript
const { gateField } = usePermissionGating(organisationId);

const fieldState = gateField("users.edit", {
  isSystemAction: false,
  readonly: false
});

<Input
  readOnly={fieldState.readonly}
  disabled={fieldState.disabled}
/>
```

### Gating Entire Elements

```typescript
const { gateElement } = usePermissionGating(organisationId);

const elementState = gateElement("flags.manage", {
  hideForbidden: true,
  isSystemAction: true
});

{elementState.visible && (
  <FeatureFlagManager />
)}
```

## Error Handling

### 403 Redirects

The system automatically handles 403 responses:

- **API routes**: Return 403 with redirect information
- **Page routes**: Redirect to `/unauthorised` page
- **Client actions**: Show toast notifications and optionally redirect

### Toast Notifications

Permission errors automatically show user-friendly toast messages:

```typescript
import { usePermissionActions } from "@/hooks/usePermissionActions";

const { executeWithPermission } = usePermissionActions({
  showToastOnDenied: true,
  redirectOnDenied: false,
});

await executeWithPermission(
  "users.create",
  async () => {
    // Action logic here
  },
  {
    actionName: "create user",
    onDenied: () => console.log("Permission denied"),
  },
);
```

## Middleware Integration

The middleware automatically catches 403 responses and handles them appropriately:

```typescript
// Enhanced middleware handles 403 responses
export async function enhancedMiddleware(request: Request) {
  const response = await NextResponse.next();

  if (response.status === 403) {
    if (request.url.includes("/api/")) {
      return NextResponse.json(
        {
          error: "Forbidden",
          redirectTo: "/unauthorised",
          message: "You don't have permission to access this resource",
        },
        { status: 403 },
      );
    }

    return NextResponse.redirect(new URL("/unauthorised", request.url));
  }

  return response;
}
```

## Best Practices

1. **Use the centralized gating utilities** instead of manual permission checks
2. **Always specify `isSystemAction`** for system-level permissions
3. **Provide meaningful `disabledText`** for better UX
4. **Use `hideForbidden: true`** for sensitive operations
5. **Handle permission errors gracefully** with toast notifications

## Migration Guide

If you have existing permission checks, you can migrate them to use the new gating utilities:

### Before (Manual checks)

```typescript
const canCreate = hasPermission(userRole, "users.create", orgId);
return canCreate ? <Button>Create</Button> : null;
```

### After (Gating utilities)

```typescript
const { gateElement } = usePermissionGating(orgId);
const elementState = gateElement("users.create", { hideForbidden: true });

return elementState.visible ? <Button>Create</Button> : null;
```

## Testing

The `PermissionGatingExample` component provides a visual way to test different permission scenarios. You can use it in development to verify that gating works correctly for different user roles and permission combinations.
