import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Check if a user has a specific permission
 */
export const hasPermission = query({
  args: {
    userId: v.string(),
    permissionId: v.string(),
  },
  handler: async (ctx, { userId, permissionId }) => {
    // Get user details
    const user = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", userId))
      .first();

    if (!user) {
      return false;
    }

    // System admin bypasses all permission checks
    if (user.systemRole === "admin") {
      return true;
    }

    // Get user's role assignment
    const roleAssignment = await ctx.db
      .query("user_role_assignments")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", userId).eq("organisationId", user.organisationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!roleAssignment) {
      return false;
    }

    // Get the role
    const role = await ctx.db.get(roleAssignment.roleId);
    if (!role || !role.isActive) {
      return false;
    }

    // Check if permission is in the role's permissions array
    if (role.permissions.includes(permissionId)) {
      return true;
    }

    // Check system defaults for this permission
    const systemPermission = await ctx.db
      .query("system_permissions")
      .withIndex("by_permission_id", (q) => q.eq("id", permissionId))
      .first();

    if (!systemPermission || !systemPermission.isActive) {
      return false;
    }

    // Check if role name is in default roles for this permission
    return systemPermission.defaultRoles.includes(role.name);
  },
});

/**
 * Get the current user's organisation role
 */
export const getCurrentUserOrgRole = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", userId))
      .first();

    if (!user) {
      return null;
    }

    const roleAssignment = await ctx.db
      .query("user_role_assignments")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", userId).eq("organisationId", user.organisationId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!roleAssignment) {
      return null;
    }

    return await ctx.db.get(roleAssignment.roleId);
  },
});

/**
 * Get all permissions for a specific role
 */
export const getOrganisationPermissions = query({
  args: {
    roleId: v.id("user_roles"), // Using existing user_roles table for now
  },
  handler: async (ctx, { roleId }) => {
    const role = await ctx.db.get(roleId);
    if (!role) {
      return [];
    }

    // Get all system permissions
    const systemPermissions = await ctx.db.query("system_permissions").collect();

    // Build permission map
    const permissionMap = new Map();

    // Start with system defaults
    for (const perm of systemPermissions) {
      if (perm.isActive && perm.defaultRoles.includes(role.name)) {
        permissionMap.set(perm.id, {
          ...perm,
          isGranted: true,
          isOverride: false,
          source: "system_default",
        });
      }
    }

    // Add explicit role permissions
    for (const permissionId of role.permissions) {
      const systemPerm = systemPermissions.find((p) => p.id === permissionId);
      if (systemPerm) {
        permissionMap.set(permissionId, {
          ...systemPerm,
          isGranted: true,
          isOverride: true,
          source: "custom",
        });
      }
    }

    return Array.from(permissionMap.values());
  },
});

/**
 * Seed default roles and permissions for a new organisation
 */
export const seedDefaultOrgRolesAndPermissions = mutation({
  args: {
    organisationId: v.id("organisations"),
  },
  handler: async (ctx, { organisationId }) => {
    const now = Date.now();

    // Create default roles
    const defaultRoles = [
      {
        name: "Admin",
        description: "Full administrative access",
        isDefault: true,
      },
      {
        name: "Manager",
        description: "Management level access",
        isDefault: true,
      },
      {
        name: "Lecturer",
        description: "Standard lecturer access",
        isDefault: true,
      },
      {
        name: "Viewer",
        description: "Read-only access",
        isDefault: true,
      },
    ];

    const createdRoles = [];
    for (const roleData of defaultRoles) {
      const roleId = await ctx.db.insert("organisation_roles", {
        ...roleData,
        organisationId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      createdRoles.push({ ...roleData, id: roleId });
    }

    // Get all active system permissions
    const systemPermissions = await ctx.db
      .query("system_permissions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Assign permissions based on role defaults
    for (const role of createdRoles) {
      for (const perm of systemPermissions) {
        if (perm.defaultRoles.includes(role.name)) {
          await ctx.db.insert("organisation_role_permissions", {
            organisationId,
            roleId: role.id,
            permissionId: perm.id,
            isGranted: true,
            isOverride: false,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    return {
      rolesCreated: createdRoles.length,
      permissionsAssigned: systemPermissions.length,
    };
  },
});

/**
 * Get all roles for an organisation
 */
export const getOrganisationRoles = query({
  args: {
    organisationId: v.id("organisations"),
  },
  handler: async (ctx, { organisationId }) => {
    return await ctx.db
      .query("organisation_roles")
      .withIndex("by_organisation", (q) => q.eq("organisationId", organisationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get all system permissions (for admin UI)
 */
export const getSystemPermissions = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("system_permissions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Get all system permissions grouped by group
 */
export const getSystemPermissionsGrouped = query({
  handler: async (ctx) => {
    const permissions = await ctx.db
      .query("system_permissions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Group by permission group
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.group]) {
        acc[permission.group] = [];
      }
      acc[permission.group].push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return grouped;
  },
});

/**
 * Create a new system permission
 */
export const createSystemPermission = mutation({
  args: {
    id: v.string(),
    group: v.string(),
    description: v.string(),
    defaultRoles: v.array(v.string()),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if permission already exists
    const existing = await ctx.db
      .query("system_permissions")
      .withIndex("by_permission_id", (q) => q.eq("id", args.id))
      .first();
    
    if (existing) {
      throw new Error("Permission with this ID already exists");
    }

    const permissionId = await ctx.db.insert("system_permissions", {
      id: args.id,
      group: args.group,
      description: args.description,
      defaultRoles: args.defaultRoles,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Log audit event
    if (args.performedBy) {
      await ctx.db.insert("audit_logs", {
        action: 'create',
        entityType: 'permission',
        entityId: args.id,
        entityName: args.id,
        performedBy: args.performedBy,
        performedByName: args.performedByName,
        details: `System permission "${args.id}" created with default roles: ${args.defaultRoles.join(', ')}`,
        metadata: JSON.stringify({
          group: args.group,
          description: args.description,
          defaultRoles: args.defaultRoles,
        }),
        timestamp: now,
        severity: 'info',
      });
    }

    return permissionId;
  },
});

/**
 * Update a system permission
 */
export const updateSystemPermission = mutation({
  args: {
    permissionId: v.id("system_permissions"),
    group: v.string(),
    description: v.string(),
    defaultRoles: v.array(v.string()),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const permission = await ctx.db.get(args.permissionId);
    if (!permission) {
      throw new Error("Permission not found");
    }

    const now = Date.now();
    const oldValues = {
      group: permission.group,
      description: permission.description,
      defaultRoles: permission.defaultRoles,
    };

    await ctx.db.patch(args.permissionId, {
      group: args.group,
      description: args.description,
      defaultRoles: args.defaultRoles,
      updatedAt: now,
    });

    // Log audit event
    if (args.performedBy) {
      const changes = [];
      if (oldValues.group !== args.group) changes.push(`group: ${oldValues.group} → ${args.group}`);
      if (oldValues.description !== args.description) changes.push(`description: ${oldValues.description} → ${args.description}`);
      if (JSON.stringify(oldValues.defaultRoles) !== JSON.stringify(args.defaultRoles)) {
        changes.push(`defaultRoles: [${oldValues.defaultRoles.join(', ')}] → [${args.defaultRoles.join(', ')}]`);
      }

      await ctx.db.insert("audit_logs", {
        action: 'update',
        entityType: 'permission',
        entityId: permission.id,
        entityName: permission.id,
        performedBy: args.performedBy,
        performedByName: args.performedByName,
        details: `System permission "${permission.id}" updated: ${changes.join(', ')}`,
        metadata: JSON.stringify({
          oldValues,
          newValues: {
            group: args.group,
            description: args.description,
            defaultRoles: args.defaultRoles,
          },
        }),
        timestamp: now,
        severity: 'info',
      });
    }

    return args.permissionId;
  },
});

/**
 * Check permission usage before deletion
 */
export const checkPermissionUsage = query({
  args: {
    permissionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if permission is used in any user roles
    const userRoles = await ctx.db.query("user_roles").collect();
    const usedInUserRoles = userRoles.filter(role => role.permissions.includes(args.permissionId));
    
    // Check if permission is used in organisation role permissions
    const orgRolePermissions = await ctx.db
      .query("organisation_role_permissions")
      .filter((q: any) => q.eq(q.field("permissionId"), args.permissionId))
      .collect();
    
    return {
      canDelete: usedInUserRoles.length === 0 && orgRolePermissions.length === 0,
      userRolesCount: usedInUserRoles.length,
      userRoleNames: usedInUserRoles.map(role => role.name),
      orgRolePermissionsCount: orgRolePermissions.length,
      usageDetails: {
        userRoles: usedInUserRoles.map(role => ({
          id: role._id,
          name: role.name,
          organisationId: role.organisationId,
        })),
        orgRolePermissions: orgRolePermissions.length,
      },
    };
  },
});

/**
 * Delete a system permission
 */
export const deleteSystemPermission = mutation({
  args: {
    permissionId: v.id("system_permissions"),
    forceDelete: v.optional(v.boolean()),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const permission = await ctx.db.get(args.permissionId);
    if (!permission) {
      throw new Error("Permission not found");
    }

    const now = Date.now();
    let removedFromRoles = 0;
    let removedFromOrgRoles = 0;

    if (args.forceDelete) {
      // Force delete: Remove permission from all roles first
      
      // Remove from user_roles
      const userRoles = await ctx.db.query("user_roles").collect();
      const rolesWithPermission = userRoles.filter(role => role.permissions.includes(permission.id));
      
      for (const role of rolesWithPermission) {
        const updatedPermissions = role.permissions.filter(p => p !== permission.id);
        await ctx.db.patch(role._id, {
          permissions: updatedPermissions,
          updatedAt: now,
        });
        removedFromRoles++;

        // Log permission revocation
        if (args.performedBy) {
          await ctx.db.insert("audit_logs", {
            action: 'permission.revoked',
            entityType: 'permission',
            entityId: permission.id,
            entityName: permission.id,
            performedBy: args.performedBy,
            performedByName: args.performedByName,
            organisationId: role.organisationId,
            details: `Permission "${permission.id}" revoked from role "${role.name}" during force delete`,
            metadata: JSON.stringify({
              roleId: role._id,
              roleName: role.name,
              organisationId: role.organisationId,
              viaForceDelete: true,
            }),
            timestamp: now,
            severity: 'warning',
          });
        }
      }

      // Remove from organisation_role_permissions
      const orgRolePermissions = await ctx.db
        .query("organisation_role_permissions")
        .filter((q: any) => q.eq(q.field("permissionId"), permission.id))
        .collect();
      
      for (const orgRolePerm of orgRolePermissions) {
        await ctx.db.delete(orgRolePerm._id);
        removedFromOrgRoles++;

        // Log permission revocation
        if (args.performedBy) {
          await ctx.db.insert("audit_logs", {
            action: 'permission.revoked',
            entityType: 'permission',
            entityId: permission.id,
            entityName: permission.id,
            performedBy: args.performedBy,
            performedByName: args.performedByName,
            organisationId: orgRolePerm.organisationId,
            details: `Permission "${permission.id}" revoked from organisation role assignment during force delete`,
            metadata: JSON.stringify({
              orgRolePermissionId: orgRolePerm._id,
              organisationId: orgRolePerm.organisationId,
              viaForceDelete: true,
            }),
            timestamp: now,
            severity: 'warning',
          });
        }
      }
    } else {
      // Normal delete: Check for usage and block if found
      
      // Check if permission is used in any user roles
      const userRoles = await ctx.db.query("user_roles").collect();
      const usedInUserRoles = userRoles.filter(role => role.permissions.includes(permission.id));
      
      if (usedInUserRoles.length > 0) {
        const roleNames = usedInUserRoles.map(role => `${role.name}`).join(', ');
        throw new Error(`Cannot delete permission "${permission.id}". It is currently assigned to ${usedInUserRoles.length} role(s): ${roleNames}. Use Force Delete to automatically remove it from all roles.`);
      }

      // Check if permission is used in organisation role permissions
      const orgRolePermissions = await ctx.db
        .query("organisation_role_permissions")
        .filter((q: any) => q.eq(q.field("permissionId"), permission.id))
        .collect();
      
      if (orgRolePermissions.length > 0) {
        throw new Error(`Cannot delete permission "${permission.id}". It is currently assigned to ${orgRolePermissions.length} organisation role(s). Use Force Delete to automatically remove it from all roles.`);
      }
    }

    // Safe to delete - mark as inactive
    await ctx.db.patch(args.permissionId, {
      isActive: false,
      updatedAt: now,
    });

    // Log audit event
    if (args.performedBy) {
      await ctx.db.insert("audit_logs", {
        action: 'delete',
        entityType: 'permission',
        entityId: permission.id,
        entityName: permission.id,
        performedBy: args.performedBy,
        performedByName: args.performedByName,
        details: args.forceDelete 
          ? `System permission "${permission.id}" force deleted. Removed from ${removedFromRoles} user role(s) and ${removedFromOrgRoles} organisation role assignment(s).`
          : `System permission "${permission.id}" deleted.`,
        metadata: JSON.stringify({
          forceDelete: !!args.forceDelete,
          removedFromRoles,
          removedFromOrgRoles,
          group: permission.group,
          description: permission.description,
        }),
        timestamp: now,
        severity: 'warning',
      });
    }

    return {
      permissionId: args.permissionId,
      deletedPermission: permission.id,
      message: args.forceDelete 
        ? `Permission "${permission.id}" has been force deleted. Removed from ${removedFromRoles} user role(s) and ${removedFromOrgRoles} organisation role assignment(s).`
        : `Permission "${permission.id}" has been successfully deleted.`,
      removedFromRoles,
      removedFromOrgRoles,
      wasForceDeleted: !!args.forceDelete,
    };
  },
});

/**
 * Debug function to check what organizations and roles exist
 */
export const debugOrganisationsAndRoles = query({
  handler: async (ctx) => {
    const organisations = await ctx.db
      .query("organisations")
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    const result = [];
    for (const org of organisations) {
      const roles = await ctx.db
        .query("user_roles")
        .filter((q: any) => 
          q.and(
            q.eq(q.field("organisationId"), org._id),
            q.eq(q.field("isActive"), true)
          )
        )
        .collect();

      result.push({
        org: {
          name: org.name,
          code: org.code,
          id: org._id,
        },
        roles: roles.map(role => ({
          name: role.name,
          id: role._id,
          permissions: role.permissions,
        })),
      });
    }

    return result;
  },
});

/**
 * Push new permissions to all organisations
 * This creates default role assignments for newly added permissions
 */
export const pushPermissionsToOrganisations = mutation({
  args: {
    permissionId: v.string(),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get the permission
    const permission = await ctx.db
      .query("system_permissions")
      .withIndex("by_permission_id", (q) => q.eq("id", args.permissionId))
      .first();
    
    if (!permission) {
      throw new Error("Permission not found");
    }

    // Get all active organisations
    const organisations = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let assignmentsCreated = 0;
    let totalRolesChecked = 0;
    let matchingRoles = 0;

    for (const org of organisations) {
      // Get user_roles for this organisation
      const roles = await ctx.db
        .query("user_roles")
        .filter((q: any) => 
          q.and(
            q.eq(q.field("organisationId"), org._id),
            q.eq(q.field("isActive"), true)
          )
        )
        .collect();

      totalRolesChecked += roles.length;

      // Add permission to roles that match defaultRoles
      for (const role of roles) {
        if (permission.defaultRoles.includes(role.name)) {
          matchingRoles++;
          // Check if permission is already in the role's permissions array
          if (!role.permissions.includes(permission.id)) {
            // Add permission to the role
            const updatedPermissions = [...role.permissions, permission.id];
            await ctx.db.patch(role._id, {
              permissions: updatedPermissions,
              updatedAt: now,
            });
            assignmentsCreated++;
          }
        }
      }
    }

    // Log audit event
    if (args.performedBy) {
      await ctx.db.insert("audit_logs", {
        action: 'permission.pushed',
        entityType: 'permission',
        entityId: permission.id,
        entityName: permission.id,
        performedBy: args.performedBy,
        performedByName: args.performedByName,
        details: `Permission "${permission.id}" pushed to ${organisations.length} organisation(s), creating ${assignmentsCreated} new assignment(s)`,
        metadata: JSON.stringify({
          organisationsUpdated: organisations.length,
          assignmentsCreated,
          totalRolesChecked,
          matchingRoles,
          alreadyAssigned: matchingRoles - assignmentsCreated,
          defaultRoles: permission.defaultRoles,
        }),
        timestamp: now,
        severity: 'info',
      });

      // Log individual permission assignments
      for (const org of organisations) {
        const roles = await ctx.db
          .query("user_roles")
          .filter((q: any) => 
            q.and(
              q.eq(q.field("organisationId"), org._id),
              q.eq(q.field("isActive"), true)
            )
          )
          .collect();

        for (const role of roles) {
          if (permission.defaultRoles.includes(role.name) && role.permissions.includes(permission.id)) {
            await ctx.db.insert("audit_logs", {
              action: 'permission.assigned',
              entityType: 'permission',
              entityId: permission.id,
              entityName: permission.id,
              performedBy: args.performedBy,
              performedByName: args.performedByName,
              organisationId: org._id,
              details: `Permission "${permission.id}" assigned to role "${role.name}" in organisation "${org.name}"`,
              metadata: JSON.stringify({
                roleId: role._id,
                roleName: role.name,
                organisationId: org._id,
                organisationName: org.name,
                viaDefaultRoles: true,
              }),
              timestamp: now,
              severity: 'info',
            });
          }
        }
      }
    }

    return {
      organisationsUpdated: organisations.length,
      assignmentsCreated,
      permissionId: permission.id,
      defaultRoles: permission.defaultRoles,
      totalRolesChecked,
      matchingRoles,
      alreadyAssigned: matchingRoles - assignmentsCreated,
    };
  },
});

/**
 * TESTING: Create test organisation with roles and permissions
 */
export const createTestOrgWithRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Create test organisation
    const orgId = await ctx.db.insert("organisations", {
      name: "Test University",
      code: "TEST",
      contactEmail: "test@university.edu",
      isActive: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Create test system permissions if they don't exist
    const testPermissions = [
      {
        id: "staff.create",
        group: "staff",
        description: "Create new staff members",
        defaultRoles: ["Admin", "Manager"],
        isActive: true,
      },
      {
        id: "staff.edit",
        group: "staff", 
        description: "Edit staff members",
        defaultRoles: ["Admin", "Manager"],
        isActive: true,
      },
      {
        id: "users.invite",
        group: "users",
        description: "Invite new users",
        defaultRoles: ["Admin"],
        isActive: true,
      },
      {
        id: "users.edit",
        group: "users",
        description: "Edit user details",
        defaultRoles: ["Admin", "Manager"],
        isActive: true,
      },
    ];

    for (const perm of testPermissions) {
      const existing = await ctx.db
        .query("system_permissions")
        .filter((q) => q.eq(q.field("id"), perm.id))
        .first();
      
      if (!existing) {
        await ctx.db.insert("system_permissions", {
          ...perm,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Create test roles
    const testRoles = [
      {
        name: "Admin",
        description: "Full administrative access",
        isDefault: true,
        isSystem: false,
        permissions: ["staff.create", "staff.edit", "users.invite", "users.edit"],
        organisationId: orgId,
        isActive: true,
      },
      {
        name: "Manager",
        description: "Management level access",
        isDefault: true,
        isSystem: false,
        permissions: ["staff.create", "staff.edit", "users.edit"],
        organisationId: orgId,
        isActive: true,
      },
      {
        name: "Lecturer",
        description: "Standard lecturer access",
        isDefault: true,
        isSystem: false,
        permissions: [],
        organisationId: orgId,
        isActive: true,
      },
    ];

    const createdRoles = [];
    for (const roleData of testRoles) {
      const roleId = await ctx.db.insert("user_roles", {
        ...roleData,
        createdAt: now,
        updatedAt: now,
      });
      createdRoles.push({ ...roleData, id: roleId });
    }

    return {
      organisationId: orgId,
      roles: createdRoles,
      permissions: testPermissions,
    };
  },
});

/**
 * TESTING: Create test users with different roles
 */
export const createTestUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get test organisation
    const testOrg = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("code"), "TEST"))
      .first();

    if (!testOrg) {
      throw new Error("Test organisation not found. Run createTestOrgWithRoles first.");
    }

    // Get test roles
    const adminRole = await ctx.db
      .query("user_roles")
      .filter((q) => 
        q.and(
          q.eq(q.field("name"), "Admin"),
          q.eq(q.field("organisationId"), testOrg._id)
        )
      )
      .first();

    const managerRole = await ctx.db
      .query("user_roles")
      .filter((q) => 
        q.and(
          q.eq(q.field("name"), "Manager"),
          q.eq(q.field("organisationId"), testOrg._id)
        )
      )
      .first();

    const lecturerRole = await ctx.db
      .query("user_roles")
      .filter((q) => 
        q.and(
          q.eq(q.field("name"), "Lecturer"),
          q.eq(q.field("organisationId"), testOrg._id)
        )
      )
      .first();

    // Create test users
    const testUsers = [
      {
        email: "admin@test.edu",
        givenName: "Admin",
        familyName: "User",
        fullName: "Admin User",
        systemRole: "user", // Not system admin
        organisationId: testOrg._id,
        subject: "test_admin_user",
        isActive: true,
      },
      {
        email: "manager@test.edu",
        givenName: "Manager",
        familyName: "User",
        fullName: "Manager User",
        systemRole: "user",
        organisationId: testOrg._id,
        subject: "test_manager_user",
        isActive: true,
      },
      {
        email: "lecturer@test.edu",
        givenName: "Lecturer",
        familyName: "User",
        fullName: "Lecturer User",
        systemRole: "user",
        organisationId: testOrg._id,
        subject: "test_lecturer_user",
        isActive: true,
      },
      {
        email: "sysadmin@test.edu",
        givenName: "System",
        familyName: "Admin",
        fullName: "System Admin",
        systemRole: "admin", // System admin - bypasses all checks
        organisationId: testOrg._id,
        subject: "test_sysadmin_user",
        isActive: true,
      },
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      const userId = await ctx.db.insert("users", {
        ...userData,
        createdAt: now,
        updatedAt: now,
      });
      createdUsers.push({ ...userData, id: userId });
    }

    // Assign roles to users
    const roleAssignments = [
      { userId: "test_admin_user", roleId: adminRole!._id },
      { userId: "test_manager_user", roleId: managerRole!._id },
      { userId: "test_lecturer_user", roleId: lecturerRole!._id },
      // Sysadmin doesn't need role assignment - bypasses all checks
    ];

    for (const assignment of roleAssignments) {
      await ctx.db.insert("user_role_assignments", {
        userId: assignment.userId,
        roleId: assignment.roleId,
        organisationId: testOrg._id,
        assignedBy: "test_system",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      users: createdUsers,
      roleAssignments,
    };
  },
});

/**
 * TESTING: Run comprehensive permission tests
 */
export const runPermissionTests = query({
  args: {},
  handler: async (ctx) => {
    const testCases = [
      {
        userId: "test_admin_user",
        permissions: [
          { id: "staff.create", expected: true },
          { id: "staff.edit", expected: true },
          { id: "users.invite", expected: true },
          { id: "users.edit", expected: true },
        ],
      },
      {
        userId: "test_manager_user",
        permissions: [
          { id: "staff.create", expected: true },
          { id: "staff.edit", expected: true },
          { id: "users.invite", expected: false },
          { id: "users.edit", expected: true },
        ],
      },
      {
        userId: "test_lecturer_user",
        permissions: [
          { id: "staff.create", expected: false },
          { id: "staff.edit", expected: false },
          { id: "users.invite", expected: false },
          { id: "users.edit", expected: false },
        ],
      },
      {
        userId: "test_sysadmin_user",
        permissions: [
          { id: "staff.create", expected: true },
          { id: "staff.edit", expected: true },
          { id: "users.invite", expected: true },
          { id: "users.edit", expected: true },
          { id: "non.existent.permission", expected: true }, // Sysadmin bypasses all
        ],
      },
    ];

    const results = [];

    for (const testCase of testCases) {
      const userResults = [];
      
      for (const permission of testCase.permissions) {
        const hasPermission = await ctx.db
          .query("users")
          .withIndex("by_subject", (q: any) => q.eq("subject", testCase.userId))
          .first()
          .then(async (user: any) => {
            if (!user) {
              return false;
            }

            // System admin bypasses all permission checks
            if (user.systemRole === "admin") {
              return true;
            }

            // Get user's role assignment
            const roleAssignment = await ctx.db
              .query("user_role_assignments")
              .withIndex("by_user_org", (q: any) =>
                q.eq("userId", testCase.userId).eq("organisationId", user.organisationId)
              )
              .filter((q: any) => q.eq(q.field("isActive"), true))
              .first();

            if (!roleAssignment) {
              return false;
            }

            // Get the role
            const role = await ctx.db.get(roleAssignment.roleId);
            if (!role || !role.isActive) {
              return false;
            }

            // Check if permission is in the role's permissions array
            if (role.permissions.includes(permission.id)) {
              return true;
            }

            // Check system defaults for this permission
            const systemPermission = await ctx.db
              .query("system_permissions")
              .withIndex("by_permission_id", (q: any) => q.eq("id", permission.id))
              .first();

            if (!systemPermission || !systemPermission.isActive) {
              return false;
            }

            // Check if role name is in default roles for this permission
            return systemPermission.defaultRoles.includes(role.name);
          });

        userResults.push({
          permission: permission.id,
          expected: permission.expected,
          actual: hasPermission,
          passed: hasPermission === permission.expected,
        });
      }

      results.push({
        userId: testCase.userId,
        results: userResults,
        allPassed: userResults.every(r => r.passed),
      });
    }

    return {
      testResults: results,
      summary: {
        totalTests: results.reduce((sum, r) => sum + r.results.length, 0),
        passedTests: results.reduce((sum, r) => sum + r.results.filter(t => t.passed).length, 0),
        failedTests: results.reduce((sum, r) => sum + r.results.filter(t => !t.passed).length, 0),
      },
    };
  },
});

/**
 * Create a new organisation role
 */
export const createOrganisationRole = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    organisationId: v.id("organisations"),
    permissions: v.array(v.string()),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const roleId = await ctx.db.insert("user_roles", {
      name: args.name,
      description: args.description || "",
      isDefault: false,
      isSystem: false,
      permissions: args.permissions,
      organisationId: args.organisationId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Log audit event
    if (args.performedBy) {
      await ctx.db.insert("audit_logs", {
        action: 'role.created',
        entityType: 'role',
        entityId: roleId,
        entityName: args.name,
        performedBy: args.performedBy,
        performedByName: args.performedByName,
        organisationId: args.organisationId,
        details: `Role "${args.name}" created with ${args.permissions.length} permission(s)`,
        metadata: JSON.stringify({
          description: args.description,
          permissions: args.permissions,
          organisationId: args.organisationId,
        }),
        timestamp: now,
        severity: 'info',
      });
    }

    return roleId;
  },
});

/**
 * Update an organisation role
 */
export const updateOrganisationRole = mutation({
  args: {
    roleId: v.id("user_roles"),
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    const updates: any = { 
      updatedAt: Date.now(),
      name: args.name,
      description: args.description || "",
      permissions: args.permissions,
    };

    await ctx.db.patch(args.roleId, updates);
    return args.roleId;
  },
});

/**
 * Delete an organisation role
 */
export const deleteOrganisationRole = mutation({
  args: {
    roleId: v.id("user_roles"),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    if (role.isDefault) {
      throw new Error("Cannot delete default roles");
    }

    // Check if any users are assigned to this role
    const roleAssignments = await ctx.db
      .query("user_role_assignments")
      .filter((q: any) => 
        q.and(
          q.eq(q.field("roleId"), args.roleId),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    if (roleAssignments.length > 0) {
      throw new Error("Cannot delete role that has assigned users");
    }

    const now = Date.now();
    await ctx.db.patch(args.roleId, { 
      isActive: false,
      updatedAt: now,
    });

    // Log audit event
    if (args.performedBy) {
      await ctx.db.insert("audit_logs", {
        action: 'role.deleted',
        entityType: 'role',
        entityId: args.roleId,
        entityName: role.name,
        performedBy: args.performedBy,
        performedByName: args.performedByName,
        organisationId: role.organisationId,
        details: `Role "${role.name}" deleted`,
        metadata: JSON.stringify({
          description: role.description,
          permissions: role.permissions,
          organisationId: role.organisationId,
          wasDefault: role.isDefault,
        }),
        timestamp: now,
        severity: 'warning',
      });
    }

    return args.roleId;
  },
});

/**
 * Update role permissions
 */
export const updateRolePermissions = mutation({
  args: {
    roleId: v.id("user_roles"),
    permissionId: v.string(),
    isGranted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    let permissions = [...role.permissions];
    
    if (args.isGranted) {
      if (!permissions.includes(args.permissionId)) {
        permissions.push(args.permissionId);
      }
    } else {
      permissions = permissions.filter(p => p !== args.permissionId);
    }

    await ctx.db.patch(args.roleId, {
      permissions,
      updatedAt: Date.now(),
    });

    return args.roleId;
  },
});

/**
 * Permission enforcement wrapper
 * Throws an error if user doesn't have the required permission
 */
export const requirePermission = async (
  ctx: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  userId: string,
  permissionId: string
) => {
  const hasPermission = await ctx.db
    .query("users")
    .withIndex("by_subject", (q: any) => q.eq("subject", userId))
    .first()
    .then(async (user: any) => {
      if (!user) {
        return false;
      }

      // System admin and developers bypass all permission checks
      if (user.systemRole === "admin" || user.systemRole === "sysadmin" || user.systemRole === "developer") {
        return true;
      }

      // Get user's role assignment
      const roleAssignment = await ctx.db
        .query("user_role_assignments")
        .withIndex("by_user_org", (q: any) =>
          q.eq("userId", userId).eq("organisationId", user.organisationId)
        )
        .filter((q: any) => q.eq(q.field("isActive"), true))
        .first();

      if (!roleAssignment) {
        return false;
      }

      // Get the role
      const role = await ctx.db.get(roleAssignment.roleId);
      if (!role || !role.isActive) {
        return false;
      }

      // Check if permission is in the role's permissions array
      if (role.permissions.includes(permissionId)) {
        return true;
      }

      // Check system defaults for this permission
      const systemPermission = await ctx.db
        .query("system_permissions")
        .withIndex("by_permission_id", (q: any) => q.eq("id", permissionId))
        .first();

      if (!systemPermission || !systemPermission.isActive) {
        return false;
      }

      // Check if role name is in default roles for this permission
      return systemPermission.defaultRoles.includes(role.name);
    });

  if (!hasPermission) {
    throw new Error(`Permission denied: ${permissionId}`);
  }

  return true;
}; 