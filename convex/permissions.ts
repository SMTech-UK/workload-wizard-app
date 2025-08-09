import {
  query,
  mutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Id, type Doc } from "./_generated/dataModel";
import { writeAudit } from "./audit";

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

    // System roles bypass all permission checks
    if (user.systemRoles && user.systemRoles.length > 0) {
      const systemRoles = ["admin", "sysadmin", "developer"];
      if (user.systemRoles.some((role) => systemRoles.includes(role))) {
        return true;
      }
    }

    // Get user's active role assignments (support multiple)
    const roleAssignments = await ctx.db
      .query("user_role_assignments")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", userId).eq("organisationId", user.organisationId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (!roleAssignments || roleAssignments.length === 0) return false;

    const roles = (
      await Promise.all(roleAssignments.map((a) => ctx.db.get(a.roleId)))
    ).filter((r): r is Doc<"user_roles"> => Boolean(r));
    if (roles.length === 0) return false;

    // Check explicit permission across any role
    if (
      roles.some(
        (r) =>
          r.isActive &&
          Array.isArray(r.permissions) &&
          r.permissions.includes(permissionId),
      )
    )
      return true;

    // Check system defaults for this permission
    const systemPermission = await ctx.db
      .query("system_permissions")
      .withIndex("by_permission_id", (q) => q.eq("id", permissionId))
      .first();

    if (!systemPermission || !systemPermission.isActive) {
      return false;
    }

    // Check defaults across any role
    return roles.some((r) => systemPermission.defaultRoles.includes(r.name));
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
        q.eq("userId", userId).eq("organisationId", user.organisationId),
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
    const systemPermissions = await ctx.db
      .query("system_permissions")
      .collect();

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
            roleId: role.id as unknown as Id<"user_roles">,
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
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");

    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
      .first();
    if (!actor) throw new Error("User not found");

    return await ctx.db
      .query("user_roles")
      .filter((q) =>
        q.and(
          q.eq(q.field("organisationId"), actor.organisationId),
          q.eq(q.field("isActive"), true),
        ),
      )
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
    const grouped = permissions.reduce(
      (acc, permission) => {
        const key = permission.group as string;
        if (!acc[key]) {
          acc[key] = [] as typeof permissions;
        }
        (acc[key] as typeof permissions).push(permission);
        return acc;
      },
      {} as Record<string, typeof permissions>,
    );

    return grouped;
  },
});

/**
 * System Role Templates
 * Used to define default role names used when seeding new organisations
 */
export const listSystemRoleTemplates = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db
      .query("system_role_templates")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return templates;
  },
});

export const upsertSystemRoleTemplate = mutation({
  args: {
    id: v.optional(v.id("system_role_templates")),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.id) {
      await ctx.db.patch(args.id, {
        name: args.name,
        description: args.description || "",
        isActive: args.isActive ?? true,
        updatedAt: now,
      });
      if (args.performedBy) {
        await writeAudit(ctx as MutationCtx, {
          action: "update",
          entityType: "system_role_template",
          entityId: String(args.id),
          entityName: args.name,
          performedBy: args.performedBy,
          ...(args.performedByName
            ? { performedByName: args.performedByName }
            : {}),
          details: `System role template updated: ${args.name}`,
          severity: "info",
        });
      }
      return args.id;
    }

    // Ensure name uniqueness (case-sensitive)
    const existing = await ctx.db
      .query("system_role_templates")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    if (existing) {
      // If an inactive template exists with same name, revive it; else update description
      await ctx.db.patch(existing._id, {
        description: args.description || existing.description || "",
        isActive: true,
        updatedAt: now,
      });
      if (args.performedBy) {
        await writeAudit(ctx as MutationCtx, {
          action: "update",
          entityType: "system_role_template",
          entityId: String(existing._id),
          entityName: args.name,
          performedBy: args.performedBy,
          ...(args.performedByName
            ? { performedByName: args.performedByName }
            : {}),
          details: `System role template revived/updated: ${args.name}`,
          severity: "info",
        });
      }
      return existing._id as Id<"system_role_templates">;
    }

    const newId = await ctx.db.insert("system_role_templates", {
      name: args.name,
      description: args.description || "",
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    if (args.performedBy) {
      await writeAudit(ctx as MutationCtx, {
        action: "create",
        entityType: "system_role_template",
        entityId: String(newId),
        entityName: args.name,
        performedBy: args.performedBy,
        ...(args.performedByName
          ? { performedByName: args.performedByName }
          : {}),
        details: `System role template created: ${args.name}`,
        severity: "info",
      });
    }
    return newId as Id<"system_role_templates">;
  },
});

export const deleteSystemRoleTemplate = mutation({
  args: {
    id: v.id("system_role_templates"),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const tpl = await ctx.db.get(args.id);
    if (!tpl) throw new Error("Template not found");
    const now = Date.now();
    await ctx.db.patch(args.id, { isActive: false, updatedAt: now });
    if (args.performedBy) {
      await writeAudit(ctx as MutationCtx, {
        action: "delete",
        entityType: "system_role_template",
        entityId: String(args.id),
        entityName: tpl.name,
        performedBy: args.performedBy,
        ...(args.performedByName
          ? { performedByName: args.performedByName }
          : {}),
        details: `System role template deleted: ${tpl.name}`,
        severity: "warning",
      });
    }
    return args.id;
  },
});

/**
 * Import or upsert system permissions from a JSON payload
 */
export const importSystemPermissions = mutation({
  args: {
    items: v.array(
      v.object({
        id: v.string(),
        group: v.string(),
        description: v.string(),
        defaultRoles: v.array(v.string()),
      }),
    ),
    upsert: v.optional(v.boolean()),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Deduplicate by id (last wins)
    const map = new Map<
      string,
      { id: string; group: string; description: string; defaultRoles: string[] }
    >();
    for (const item of args.items) {
      map.set(item.id, item);
    }

    for (const item of map.values()) {
      // Validate pattern: at least two segments separated by dots (e.g. group.action or group.subgroup.action)
      // Each segment must start with a letter and then any word chars
      const validId = /^[A-Za-z]\w*(?:\.[A-Za-z]\w*)+$/.test(item.id);
      if (!validId) {
        skipped++;
        continue;
      }

      const existing = await ctx.db
        .query("system_permissions")
        .withIndex("by_permission_id", (q) => q.eq("id", item.id))
        .first();

      if (!existing) {
        await ctx.db.insert("system_permissions", {
          id: item.id,
          group: item.group,
          description: item.description,
          defaultRoles: item.defaultRoles,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        created++;
        if (args.performedBy) {
          await writeAudit(ctx as MutationCtx, {
            action: "create",
            entityType: "permission",
            entityId: item.id,
            entityName: item.id,
            performedBy: args.performedBy,
            ...(args.performedByName
              ? { performedByName: args.performedByName }
              : {}),
            details: `Permission imported: ${item.id}`,
            metadata: JSON.stringify(item),
            severity: "info",
          });
        }
        continue;
      }

      if (args.upsert) {
        const oldValues = {
          group: existing.group,
          description: existing.description,
          defaultRoles: existing.defaultRoles,
        };
        await ctx.db.patch(existing._id, {
          group: item.group,
          description: item.description,
          defaultRoles: item.defaultRoles,
          isActive: true,
          updatedAt: now,
        });
        updated++;
        if (args.performedBy) {
          await writeAudit(ctx as MutationCtx, {
            action: "update",
            entityType: "permission",
            entityId: existing.id,
            entityName: existing.id,
            performedBy: args.performedBy,
            ...(args.performedByName
              ? { performedByName: args.performedByName }
              : {}),
            details: `Permission upserted via import: ${existing.id}`,
            metadata: JSON.stringify({ oldValues, newValues: item }),
            severity: "info",
          });
        }
      } else {
        skipped++;
      }
    }

    return { total: args.items.length, created, updated, skipped };
  },
});

/**
 * Seed planning MVP permissions for courses/modules/iterations/groups/allocations.
 */
export const seedPlanningMvpPermissions = mutation({
  args: {
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const items = [
      {
        id: "courses.view",
        group: "courses",
        description: "View courses",
        defaultRoles: ["Admin", "Manager", "Lecturer", "Viewer"],
      },
      {
        id: "courses.create",
        group: "courses",
        description: "Create courses",
        defaultRoles: ["Admin", "Manager"],
      },
      {
        id: "courses.edit",
        group: "courses",
        description: "Edit courses",
        defaultRoles: ["Admin", "Manager"],
      },
      {
        id: "courses.delete",
        group: "courses",
        description: "Delete courses",
        defaultRoles: ["Admin"],
      },
      {
        id: "courses.years.add",
        group: "courses",
        description: "Add course years",
        defaultRoles: ["Admin", "Manager"],
      },
      {
        id: "modules.view",
        group: "modules",
        description: "View modules",
        defaultRoles: ["Admin", "Manager", "Lecturer", "Viewer"],
      },
      {
        id: "modules.create",
        group: "modules",
        description: "Create modules",
        defaultRoles: ["Admin", "Manager"],
      },
      {
        id: "modules.edit",
        group: "modules",
        description: "Edit modules",
        defaultRoles: ["Admin", "Manager"],
      },
      {
        id: "modules.delete",
        group: "modules",
        description: "Delete modules",
        defaultRoles: ["Admin"],
      },
      {
        id: "modules.link",
        group: "modules",
        description: "Attach module to course year",
        defaultRoles: ["Admin", "Manager"],
      },
      {
        id: "modules.unlink",
        group: "modules",
        description: "Detach module from course year",
        defaultRoles: ["Admin", "Manager"],
      },
      {
        id: "iterations.create",
        group: "iterations",
        description: "Create module iterations for an academic year",
        defaultRoles: ["Admin", "Manager"],
      },
      {
        id: "groups.view",
        group: "groups",
        description: "View groups",
        defaultRoles: ["Admin", "Manager", "Lecturer", "Viewer"],
      },
      {
        id: "groups.create",
        group: "groups",
        description: "Create groups",
        defaultRoles: ["Admin", "Manager"],
      },
      {
        id: "groups.delete",
        group: "groups",
        description: "Delete groups",
        defaultRoles: ["Admin", "Manager"],
      },
      {
        id: "allocations.view",
        group: "allocations",
        description: "View allocations totals",
        defaultRoles: ["Admin", "Manager", "Lecturer"],
      },
      {
        id: "allocations.assign",
        group: "allocations",
        description: "Assign lecturer to group",
        defaultRoles: ["Admin", "Manager"],
      },
    ];

    const res = await (ctx as any).runMutation(
      {
        path: "permissions/importSystemPermissions",
      },
      {
        items,
        upsert: true,
        performedBy: args.performedBy,
        performedByName: args.performedByName,
      },
    );

    return res;
  },
});

/**
 * List staged organisation role permission changes for an organisation
 */
export const getStagedForOrganisation = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("organisation_role_permissions")
      .withIndex("by_organisation", (q) =>
        q.eq("organisationId", args.organisationId),
      )
      .filter((q) => q.eq(q.field("staged"), true))
      .collect();
    return rows;
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
      await writeAudit(ctx as MutationCtx, {
        action: "create",
        entityType: "permission",
        entityId: args.id,
        entityName: args.id,
        performedBy: args.performedBy,
        ...(args.performedByName
          ? { performedByName: args.performedByName }
          : {}),
        details: `System permission "${args.id}" created with default roles: ${args.defaultRoles.join(", ")}`,
        metadata: JSON.stringify({
          group: args.group,
          description: args.description,
          defaultRoles: args.defaultRoles,
        }),
        severity: "info",
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
      if (oldValues.group !== args.group)
        changes.push(`group: ${oldValues.group} → ${args.group}`);
      if (oldValues.description !== args.description)
        changes.push(
          `description: ${oldValues.description} → ${args.description}`,
        );
      if (
        JSON.stringify(oldValues.defaultRoles) !==
        JSON.stringify(args.defaultRoles)
      ) {
        changes.push(
          `defaultRoles: [${oldValues.defaultRoles.join(", ")}] → [${args.defaultRoles.join(", ")}]`,
        );
      }

      await writeAudit(ctx as MutationCtx, {
        action: "update",
        entityType: "permission",
        entityId: permission.id,
        entityName: permission.id,
        performedBy: args.performedBy,
        ...(args.performedByName
          ? { performedByName: args.performedByName }
          : {}),
        details: `System permission "${permission.id}" updated: ${changes.join(", ")}`,
        metadata: JSON.stringify({
          oldValues,
          newValues: {
            group: args.group,
            description: args.description,
            defaultRoles: args.defaultRoles,
          },
        }),
        severity: "info",
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
    const usedInUserRoles = userRoles.filter((role) =>
      role.permissions.includes(args.permissionId),
    );

    // Check if permission is used in organisation role permissions
    const orgRolePermissions = await ctx.db
      .query("organisation_role_permissions")
      .filter((q) => q.eq(q.field("permissionId"), args.permissionId))
      .collect();

    return {
      canDelete:
        usedInUserRoles.length === 0 && orgRolePermissions.length === 0,
      userRolesCount: usedInUserRoles.length,
      userRoleNames: usedInUserRoles.map((role) => role.name),
      orgRolePermissionsCount: orgRolePermissions.length,
      usageDetails: {
        userRoles: usedInUserRoles.map((role) => ({
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
      const rolesWithPermission = userRoles.filter((role) =>
        role.permissions.includes(permission.id),
      );

      for (const role of rolesWithPermission) {
        const updatedPermissions = role.permissions.filter(
          (p) => p !== permission.id,
        );
        await ctx.db.patch(role._id, {
          permissions: updatedPermissions,
          updatedAt: now,
        });
        removedFromRoles++;

        // Log permission revocation
        if (args.performedBy) {
          await writeAudit(ctx, {
            action: "permission.revoked",
            entityType: "permission",
            entityId: permission.id,
            entityName: permission.id,
            performedBy: args.performedBy,
            ...(args.performedByName
              ? { performedByName: args.performedByName }
              : {}),
            organisationId: role.organisationId,
            details: `Permission "${permission.id}" revoked from role "${role.name}" during force delete`,
            metadata: JSON.stringify({
              roleId: role._id,
              roleName: role.name,
              organisationId: role.organisationId,
              viaForceDelete: true,
            }),
            severity: "warning",
          });
        }
      }

      // Remove from organisation_role_permissions
      const orgRolePermissions = await ctx.db
        .query("organisation_role_permissions")
        .filter((q) => q.eq(q.field("permissionId"), permission.id))
        .collect();

      for (const orgRolePerm of orgRolePermissions) {
        await ctx.db.delete(orgRolePerm._id);
        removedFromOrgRoles++;

        // Log permission revocation
        if (args.performedBy) {
          await writeAudit(ctx, {
            action: "permission.revoked",
            entityType: "permission",
            entityId: permission.id,
            entityName: permission.id,
            performedBy: args.performedBy,
            ...(args.performedByName
              ? { performedByName: args.performedByName }
              : {}),
            organisationId: orgRolePerm.organisationId,
            details: `Permission "${permission.id}" revoked from organisation role assignment during force delete`,
            metadata: JSON.stringify({
              orgRolePermissionId: orgRolePerm._id,
              organisationId: orgRolePerm.organisationId,
              viaForceDelete: true,
            }),
            severity: "warning",
          });
        }
      }
    } else {
      // Normal delete: Check for usage and block if found

      // Check if permission is used in any user roles
      const userRoles = await ctx.db.query("user_roles").collect();
      const usedInUserRoles = userRoles.filter((role) =>
        role.permissions.includes(permission.id),
      );

      if (usedInUserRoles.length > 0) {
        const roleNames = usedInUserRoles
          .map((role) => `${role.name}`)
          .join(", ");
        throw new Error(
          `Cannot delete permission "${permission.id}". It is currently assigned to ${usedInUserRoles.length} role(s): ${roleNames}. Use Force Delete to automatically remove it from all roles.`,
        );
      }

      // Check if permission is used in organisation role permissions
      const orgRolePermissions = await ctx.db
        .query("organisation_role_permissions")
        .filter((q) => q.eq(q.field("permissionId"), permission.id))
        .collect();

      if (orgRolePermissions.length > 0) {
        throw new Error(
          `Cannot delete permission "${permission.id}". It is currently assigned to ${orgRolePermissions.length} organisation role(s). Use Force Delete to automatically remove it from all roles.`,
        );
      }
    }

    // Safe to delete - mark as inactive
    await ctx.db.patch(args.permissionId, {
      isActive: false,
      updatedAt: now,
    });

    // Log audit event
    if (args.performedBy) {
      await writeAudit(ctx as MutationCtx, {
        action: "delete",
        entityType: "permission",
        entityId: permission.id,
        entityName: permission.id,
        performedBy: args.performedBy,
        ...(args.performedByName
          ? { performedByName: args.performedByName }
          : {}),
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
        severity: "warning",
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

/** Seed core academic year permissions */
export const seedAcademicYearPermissions = mutation({
  args: {
    upsert: v.optional(v.boolean()),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const defaults = [
      {
        id: "year.view.live",
        group: "academic_years",
        description: "View live (published) academic years",
        defaultRoles: [
          "Admin",
          "Organisation Admin",
          "orgadmin",
          "Manager",
          "Lecturer",
          "Viewer",
        ],
      },
      {
        id: "year.view.staging",
        group: "academic_years",
        description: "View staged/draft academic years",
        defaultRoles: ["Admin", "Organisation Admin", "orgadmin", "Manager"],
      },
      {
        id: "year.view.archived",
        group: "academic_years",
        description: "View archived academic years",
        defaultRoles: ["Admin", "Organisation Admin", "orgadmin"],
      },
      {
        id: "year.edit.live",
        group: "academic_years",
        description:
          "Edit live (published) academic years (e.g. set default, rename, dates)",
        defaultRoles: ["Admin", "Organisation Admin", "orgadmin"],
      },
      {
        id: "year.edit.staging",
        group: "academic_years",
        description:
          "Edit staged/draft academic years (create, modify before publish)",
        defaultRoles: ["Admin", "Organisation Admin", "orgadmin", "Manager"],
      },
      {
        id: "year.edit.archived",
        group: "academic_years",
        description: "Edit archived academic years (e.g. rename, notes)",
        defaultRoles: ["Admin", "Organisation Admin", "orgadmin"],
      },
    ];

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of defaults) {
      const existing = await ctx.db
        .query("system_permissions")
        .withIndex("by_permission_id", (q) => q.eq("id", item.id))
        .first();
      if (!existing) {
        await ctx.db.insert("system_permissions", {
          id: item.id,
          group: item.group,
          description: item.description,
          defaultRoles: item.defaultRoles,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        created++;
        if (args.performedBy) {
          await writeAudit(ctx as MutationCtx, {
            action: "create",
            entityType: "permission",
            entityId: item.id,
            entityName: item.id,
            performedBy: args.performedBy,
            ...(args.performedByName
              ? { performedByName: args.performedByName }
              : {}),
            details: `Academic year permission created: ${item.id}`,
            metadata: JSON.stringify(item),
            severity: "info",
          });
        }
        continue;
      }
      if (args.upsert ?? true) {
        const oldValues = {
          group: existing.group,
          description: existing.description,
          defaultRoles: existing.defaultRoles,
        };
        await ctx.db.patch(existing._id, {
          group: item.group,
          description: item.description,
          defaultRoles: item.defaultRoles,
          isActive: true,
          updatedAt: now,
        });
        updated++;
        if (args.performedBy) {
          await writeAudit(ctx as MutationCtx, {
            action: "update",
            entityType: "permission",
            entityId: existing.id,
            entityName: existing.id,
            performedBy: args.performedBy,
            ...(args.performedByName
              ? { performedByName: args.performedByName }
              : {}),
            details: `Academic year permission upserted: ${existing.id}`,
            metadata: JSON.stringify({ oldValues, newValues: item }),
            severity: "info",
          });
        }
      } else {
        skipped++;
      }
    }

    return { total: defaults.length, created, updated, skipped };
  },
});

/**
 * Debug function to check what organizations and roles exist
 */
export const debugOrganisationsAndRoles = query({
  handler: async (ctx) => {
    const organisations = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const result = [];
    for (const org of organisations) {
      const roles = await ctx.db
        .query("user_roles")
        .filter((q) =>
          q.and(
            q.eq(q.field("organisationId"), org._id),
            q.eq(q.field("isActive"), true),
          ),
        )
        .collect();

      result.push({
        org: {
          name: org.name,
          code: org.code,
          id: org._id,
        },
        roles: roles.map((role) => ({
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
    forceApply: v.optional(v.boolean()), // if true, apply immediately; else stage
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
        .filter((q) =>
          q.and(
            q.eq(q.field("organisationId"), org._id),
            q.eq(q.field("isActive"), true),
          ),
        )
        .collect();

      totalRolesChecked += roles.length;

      // Add permission to roles that match defaultRoles
      for (const role of roles) {
        if (permission.defaultRoles.includes(role.name)) {
          matchingRoles++;
          // If forceApply, write to user_roles immediately; else stage into organisation_role_permissions
          if (args.forceApply) {
            if (!role.permissions.includes(permission.id)) {
              const updatedPermissions = [...role.permissions, permission.id];
              await ctx.db.patch(role._id, {
                permissions: updatedPermissions,
                updatedAt: now,
              });
              assignmentsCreated++;
            }
          } else {
            // Stage if not already present in role and not already staged
            if (!role.permissions.includes(permission.id)) {
              const existingStage = await ctx.db
                .query("organisation_role_permissions")
                .filter((q) =>
                  q.and(
                    q.eq(q.field("organisationId"), org._id),
                    q.eq(q.field("roleId"), role._id),
                    q.eq(q.field("permissionId"), permission.id),
                  ),
                )
                .first();
              if (!existingStage) {
                await ctx.db.insert("organisation_role_permissions", {
                  organisationId: org._id,
                  roleId: role._id,
                  permissionId: permission.id,
                  isGranted: true,
                  isOverride: true,
                  staged: true,
                  createdAt: now,
                  updatedAt: now,
                });
                assignmentsCreated++;
              }
            }
          }
        }
      }
    }

    // Log audit event
    if (args.performedBy) {
      await writeAudit(ctx as MutationCtx, {
        action: "permission.pushed",
        entityType: "permission",
        entityId: permission.id,
        entityName: permission.id,
        performedBy: args.performedBy,
        ...(args.performedByName
          ? { performedByName: args.performedByName }
          : {}),
        details: `Permission "${permission.id}" pushed to ${organisations.length} organisation(s), creating ${assignmentsCreated} new assignment(s)`,
        metadata: JSON.stringify({
          organisationsUpdated: organisations.length,
          assignmentsCreated,
          totalRolesChecked,
          matchingRoles,
          alreadyAssigned: matchingRoles - assignmentsCreated,
          defaultRoles: permission.defaultRoles,
        }),
        severity: "info",
      });

      // Log individual permission assignments
      for (const org of organisations) {
        const roles = await ctx.db
          .query("user_roles")
          .filter((q) =>
            q.and(
              q.eq(q.field("organisationId"), org._id),
              q.eq(q.field("isActive"), true),
            ),
          )
          .collect();

        for (const role of roles) {
          const isApplied = role.permissions.includes(permission.id);
          const isStaged =
            !isApplied &&
            (await ctx.db
              .query("organisation_role_permissions")
              .filter((q) =>
                q.and(
                  q.eq(q.field("organisationId"), org._id),
                  q.eq(q.field("roleId"), role._id),
                  q.eq(q.field("permissionId"), permission.id),
                  q.eq(q.field("staged"), true),
                ),
              )
              .first());
          if (
            permission.defaultRoles.includes(role.name) &&
            (isApplied || isStaged)
          ) {
            await writeAudit(ctx as MutationCtx, {
              action: args.forceApply
                ? "permission.assigned"
                : "permission.staged",
              entityType: "permission",
              entityId: permission.id,
              entityName: permission.id,
              performedBy: args.performedBy,
              ...(args.performedByName
                ? { performedByName: args.performedByName }
                : {}),
              organisationId: org._id,
              details: args.forceApply
                ? `Permission "${permission.id}" assigned to role "${role.name}" in organisation "${org.name}"`
                : `Permission "${permission.id}" staged for role "${role.name}" in organisation "${org.name}"`,
              metadata: JSON.stringify({
                roleId: role._id,
                roleName: role.name,
                organisationId: org._id,
                organisationName: org.name,
                viaDefaultRoles: true,
                staged: !args.forceApply,
              }),
              severity: args.forceApply ? "info" : "warning",
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

    // Find or create test organisation
    let testOrg = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("code"), "TEST"))
      .first();
    if (!testOrg) {
      const newOrgId = await ctx.db.insert("organisations", {
        name: "Test University",
        code: "TEST",
        contactEmail: "test@university.edu",
        isActive: true,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      testOrg = await ctx.db.get(newOrgId);
    }
    const orgId = (testOrg as { _id: Id<"organisations"> })._id;

    // Pull templates; fallback to classic set if none exist
    const templates = await ctx.db
      .query("system_role_templates")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    const roleNames =
      templates.length > 0
        ? templates.map((t) => t.name)
        : ["Admin", "Manager", "Lecturer", "Viewer"];

    // Load active system permissions
    const systemPermissions = await ctx.db
      .query("system_permissions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Create roles based on templates and assign permissions from defaultRoles membership
    const existingRoles = await ctx.db
      .query("user_roles")
      .filter((q) =>
        q.and(
          q.eq(q.field("organisationId"), orgId),
          q.eq(q.field("isActive"), true),
        ),
      )
      .collect();
    const existingRoleNames = new Set(existingRoles.map((r) => r.name));
    const createdRoles: {
      name: string;
      id: Id<"user_roles">;
      permissions: string[];
    }[] = [];
    for (const roleName of roleNames) {
      if (!existingRoleNames.has(roleName)) {
        const permissionsForRole = systemPermissions
          .filter(
            (p) =>
              Array.isArray(p.defaultRoles) &&
              p.defaultRoles.includes(roleName),
          )
          .map((p) => p.id);
        const roleId = await ctx.db.insert("user_roles", {
          name: roleName,
          description: `${roleName} (test)`,
          isDefault: true,
          isSystem: false,
          permissions: permissionsForRole,
          organisationId: orgId,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        createdRoles.push({
          name: roleName,
          id: roleId,
          permissions: permissionsForRole,
        });
      }
    }

    return {
      organisationId: orgId,
      roles: createdRoles.length ? createdRoles : existingRoles,
      permissions: systemPermissions,
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
      throw new Error(
        "Test organisation not found. Run createTestOrgWithRoles first.",
      );
    }

    // Get roles in test org
    const roles = await ctx.db
      .query("user_roles")
      .filter((q) => q.eq(q.field("organisationId"), testOrg._id))
      .collect();

    // helper to slug
    const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    const createdUsers: { subject: string; id: Id<"users">; role: string }[] =
      [];
    const roleAssignments: { userId: string; roleId: Id<"user_roles"> }[] = [];

    // One test user per role
    for (const role of roles) {
      const subject = `test_${toSlug(role.name)}_user`;
      let userDoc = await ctx.db
        .query("users")
        .withIndex("by_subject", (q) => q.eq("subject", subject))
        .first();
      if (!userDoc) {
        const userId = await ctx.db.insert("users", {
          email: `${toSlug(role.name)}@test.edu`,
          givenName: role.name,
          familyName: "User",
          fullName: `${role.name} User`,
          systemRoles: [],
          organisationId: testOrg._id,
          subject,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        userDoc = {
          _id: userId,
          subject,
          organisationId: testOrg._id,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          email: `${toSlug(role.name)}@test.edu`,
          givenName: role.name,
          familyName: "User",
          fullName: `${role.name} User`,
          systemRoles: [],
        } as unknown as Doc<"users">;
      }
      createdUsers.push({
        subject,
        id: (userDoc as { _id: Id<"users"> })._id,
        role: role.name,
      });

      const existingAssignment = await ctx.db
        .query("user_role_assignments")
        .withIndex("by_user_org", (q) =>
          q.eq("userId", subject).eq("organisationId", testOrg._id),
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      if (!existingAssignment) {
        await ctx.db.insert("user_role_assignments", {
          userId: subject,
          roleId: role._id,
          organisationId: testOrg._id,
          assignedBy: "test_system",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
      roleAssignments.push({ userId: subject, roleId: role._id });
    }

    // Add a system admin test user
    const sysSubject = "test_sysadmin_user";
    const sysId = await ctx.db.insert("users", {
      email: "sysadmin@test.edu",
      givenName: "System",
      familyName: "Admin",
      fullName: "System Admin",
      systemRoles: ["admin"],
      organisationId: testOrg._id,
      subject: sysSubject,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    createdUsers.push({ subject: sysSubject, id: sysId, role: "System Admin" });

    return { users: createdUsers, roleAssignments };
  },
});

/** Create or ensure a single test user with a specific role in TEST org */
export const createTestUserWithRole = mutation({
  args: { roleName: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const testOrg = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("code"), "TEST"))
      .first();
    if (!testOrg)
      throw new Error("TEST org not found. Run createTestOrgWithRoles first.");
    const role = await ctx.db
      .query("user_roles")
      .filter((q) =>
        q.and(
          q.eq(q.field("organisationId"), testOrg._id),
          q.eq(q.field("name"), args.roleName),
        ),
      )
      .first();
    if (!role) throw new Error(`Role not found: ${args.roleName}`);
    const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const subject = `test_${toSlug(args.roleName)}_user`;
    let userDoc = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();
    if (!userDoc) {
      const userId = await ctx.db.insert("users", {
        email: `${toSlug(args.roleName)}@test.edu`,
        givenName: args.roleName,
        familyName: "User",
        fullName: `${args.roleName} User`,
        systemRoles: [],
        organisationId: testOrg._id,
        subject,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      userDoc = await ctx.db.get(userId);
    }
    const existingAssignment = await ctx.db
      .query("user_role_assignments")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", subject).eq("organisationId", testOrg._id),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!existingAssignment) {
      await ctx.db.insert("user_role_assignments", {
        userId: subject,
        roleId: role._id,
        organisationId: testOrg._id,
        assignedBy: "test_system",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { subject };
  },
});

/**
 * TESTING: Run comprehensive permission tests
 */
export const runPermissionTests = query({
  args: { nonce: v.optional(v.float64()) },
  handler: async (ctx) => {
    // derive test users (created by createTestUsers)
    const testOrg = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("code"), "TEST"))
      .first();
    if (!testOrg)
      return {
        testResults: [],
        summary: { totalTests: 0, passedTests: 0, failedTests: 0 },
      };

    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("organisationId"), testOrg._id),
          q.eq(q.field("isActive"), true),
        ),
      )
      .collect();

    const systemPermissions = await ctx.db
      .query("system_permissions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    type PermissionTest = {
      permission: string;
      expected: boolean;
      actual: boolean;
      passed: boolean;
    };
    type UserPermissionTestResult = {
      userId: string;
      results: PermissionTest[];
      allPassed: boolean;
    };
    const results: UserPermissionTestResult[] = [];

    for (const user of users) {
      const isSystem =
        Array.isArray(user.systemRoles) &&
        user.systemRoles.some((r: string) =>
          ["admin", "sysadmin", "developer"].includes(r),
        );
      const roleAssignment = await ctx.db
        .query("user_role_assignments")
        .withIndex("by_user_org", (q) =>
          q
            .eq("userId", user.subject)
            .eq("organisationId", user.organisationId),
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      const role = roleAssignment
        ? await ctx.db.get(roleAssignment.roleId)
        : null;

      const userResults: PermissionTest[] = [];
      for (const perm of systemPermissions) {
        const expected = isSystem
          ? true
          : !!role &&
            (role.permissions.includes(perm.id) ||
              perm.defaultRoles.includes(role.name));

        // compute actual using same logic as hasPermission
        let actual = false;
        if (isSystem) {
          actual = true;
        } else if (role) {
          if (role.permissions.includes(perm.id)) actual = true;
          else actual = perm.defaultRoles.includes(role.name);
        }
        userResults.push({
          permission: perm.id,
          expected,
          actual,
          passed: expected === actual,
        });
      }
      results.push({
        userId: user.subject,
        results: userResults,
        allPassed: userResults.every((r) => r.passed),
      });
    }

    return {
      testResults: results,
      summary: {
        totalTests: results.reduce((sum, r) => sum + r.results.length, 0),
        passedTests: results.reduce(
          (sum, r) => sum + r.results.filter((t) => t.passed).length,
          0,
        ),
        failedTests: results.reduce(
          (sum, r) => sum + r.results.filter((t) => !t.passed).length,
          0,
        ),
      },
    };
  },
});

/** List test users in the TEST org */
export const listTestUsers = query({
  args: {},
  handler: async (ctx) => {
    const testOrg = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("code"), "TEST"))
      .first();
    if (!testOrg) return [];
    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.eq(q.field("organisationId"), testOrg._id),
          q.eq(q.field("isActive"), true),
        ),
      )
      .collect();
    return users.map((u) => ({
      subject: u.subject,
      fullName: u.fullName,
      systemRoles: u.systemRoles,
    }));
  },
});

/**
 * Create a new organisation role
 */
export const createOrganisationRole = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string()),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Determine organisation from actor (performedBy or authenticated identity)
    const identity = await ctx.auth.getUserIdentity();
    const subject = args.performedBy ?? identity?.subject;
    if (!subject) throw new Error("Unauthenticated");
    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();
    if (!actor) throw new Error("User not found");

    const roleId = await ctx.db.insert("user_roles", {
      name: args.name,
      description: args.description || "",
      isDefault: false,
      isSystem: false,
      permissions: args.permissions,
      organisationId: actor.organisationId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Log audit event
    if (subject) {
      await writeAudit(ctx as MutationCtx, {
        action: "role.created",
        entityType: "role",
        entityId: String(roleId),
        entityName: args.name,
        performedBy: subject,
        ...(args.performedByName
          ? { performedByName: args.performedByName }
          : {}),
        organisationId: actor.organisationId,
        details: `Role "${args.name}" created with ${args.permissions.length} permission(s)`,
        metadata: JSON.stringify({
          description: args.description,
          permissions: args.permissions,
          organisationId: actor.organisationId,
        }),
        severity: "info",
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
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Authorization: only system admins or members of the same organisation can modify
    const identity = await ctx.auth.getUserIdentity();
    const subject = args.performedBy ?? identity?.subject;
    if (!subject) throw new Error("Unauthenticated");
    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();
    if (actor) {
      const isSystem =
        Array.isArray(actor.systemRoles) &&
        actor.systemRoles.some((r: string) =>
          ["admin", "sysadmin", "developer"].includes(r),
        );
      if (
        !isSystem &&
        String(actor.organisationId) !== String(role.organisationId)
      ) {
        throw new Error(
          "Unauthorized: Cannot modify roles outside your organisation",
        );
      }
    }

    const updates = {
      updatedAt: Date.now(),
      name: args.name,
      description: args.description || "",
      permissions: args.permissions,
    };

    await ctx.db.patch(args.roleId, updates);

    // Audit
    if (subject) {
      await writeAudit(ctx as MutationCtx, {
        action: "role.updated",
        entityType: "role",
        entityId: String(args.roleId),
        entityName: args.name,
        performedBy: subject,
        ...(args.performedByName
          ? { performedByName: args.performedByName }
          : {}),
        organisationId: role.organisationId,
        details: `Role updated: ${args.name}`,
        metadata: JSON.stringify({
          previous: {
            name: role.name,
            description: role.description,
            permissions: role.permissions,
          },
          updates: {
            name: args.name,
            description: args.description,
            permissions: args.permissions,
          },
        }),
        severity: "info",
      });
    }

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
      .filter((q) =>
        q.and(
          q.eq(q.field("roleId"), args.roleId),
          q.eq(q.field("isActive"), true),
        ),
      )
      .collect();

    if (roleAssignments.length > 0) {
      throw new Error("Cannot delete role that has assigned users");
    }

    // Authorization: only system admins or members of the same organisation can delete
    const identity = await ctx.auth.getUserIdentity();
    const subject = args.performedBy ?? identity?.subject;
    if (!subject) throw new Error("Unauthenticated");
    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();
    if (actor) {
      const isSystem =
        Array.isArray(actor.systemRoles) &&
        actor.systemRoles.some((r: string) =>
          ["admin", "sysadmin", "developer"].includes(r),
        );
      if (
        !isSystem &&
        String(actor.organisationId) !== String(role.organisationId)
      ) {
        throw new Error(
          "Unauthorized: Cannot delete roles outside your organisation",
        );
      }
    }

    const now = Date.now();
    await ctx.db.patch(args.roleId, {
      isActive: false,
      updatedAt: now,
    });

    // Log audit event
    if (subject) {
      await writeAudit(ctx as MutationCtx, {
        action: "role.deleted",
        entityType: "role",
        entityId: String(args.roleId),
        entityName: role.name,
        performedBy: subject,
        ...(args.performedByName
          ? { performedByName: args.performedByName }
          : {}),
        organisationId: role.organisationId,
        details: `Role "${role.name}" deleted`,
        metadata: JSON.stringify({
          description: role.description,
          permissions: role.permissions,
          organisationId: role.organisationId,
          wasDefault: role.isDefault,
        }),
        severity: "warning",
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
    acceptStaged: v.optional(v.boolean()), // if true and staged exists, apply it
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Authorization: only system admins or members of the same organisation
    const identity = await ctx.auth.getUserIdentity();
    const subject = args.performedBy ?? identity?.subject;
    if (!subject) throw new Error("Unauthenticated");
    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();
    if (actor) {
      const isSystem =
        Array.isArray(actor.systemRoles) &&
        actor.systemRoles.some((r: string) =>
          ["admin", "sysadmin", "developer"].includes(r),
        );
      if (
        !isSystem &&
        String(actor.organisationId) !== String(role.organisationId)
      ) {
        throw new Error(
          "Unauthorized: Cannot modify roles outside your organisation",
        );
      }
    }

    let permissions = [...role.permissions];

    if (args.isGranted) {
      // If there is a staged permission for this role, accept it (remove staged) when acceptStaged=true
      if (args.acceptStaged) {
        const staged = await ctx.db
          .query("organisation_role_permissions")
          .filter((q) =>
            q.and(
              q.eq(q.field("organisationId"), role.organisationId),
              q.eq(q.field("roleId"), role._id),
              q.eq(q.field("permissionId"), args.permissionId),
              q.eq(q.field("staged"), true),
            ),
          )
          .first();
        if (staged) {
          await ctx.db.delete(staged._id);
        }
      }
      if (!permissions.includes(args.permissionId)) {
        permissions.push(args.permissionId);
      }
    } else {
      permissions = permissions.filter((p) => p !== args.permissionId);
    }

    await ctx.db.patch(args.roleId, {
      permissions,
      updatedAt: Date.now(),
    });

    // Audit
    if (subject) {
      const systemPerm = await ctx.db
        .query("system_permissions")
        .withIndex("by_permission_id", (q) => q.eq("id", args.permissionId))
        .first();

      await writeAudit(ctx as MutationCtx, {
        action: args.isGranted
          ? args.acceptStaged
            ? "permission.assigned"
            : "permission.assigned"
          : "permission.revoked",
        entityType: "permission",
        entityId: args.permissionId,
        entityName: systemPerm?.id || args.permissionId,
        performedBy: subject,
        ...(args.performedByName
          ? { performedByName: args.performedByName }
          : {}),
        organisationId: role.organisationId,
        details: `${args.isGranted ? "Assigned" : "Revoked"} permission ${args.permissionId} ${args.isGranted ? "to" : "from"} role ${role.name}`,
        metadata: JSON.stringify({
          roleId: role._id,
          roleName: role.name,
          permissionId: args.permissionId,
          acceptedFromStaged: !!args.acceptStaged,
        }),
        severity: args.isGranted ? "info" : "warning",
      });
    }

    return args.roleId;
  },
});

/**
 * Permission enforcement wrapper
 * Throws an error if user doesn't have the required permission
 */
export const requirePermission = async (
  ctx: QueryCtx | MutationCtx,
  userId: string,
  permissionId: string,
) => {
  const hasPermission = await ctx.db
    .query("users")
    .withIndex("by_subject", (q) => q.eq("subject", userId))
    .first()
    .then(async (user: Doc<"users"> | null) => {
      if (!user) {
        return false;
      }

      // System roles bypass all permission checks
      if (user.systemRoles && user.systemRoles.length > 0) {
        const systemRoles: ReadonlyArray<string> = [
          "admin",
          "sysadmin",
          "developer",
        ] as const;
        if (
          user.systemRoles.some((role: string) => systemRoles.includes(role))
        ) {
          return true;
        }
      }

      // Get user's role assignment
      const roleAssignment = await ctx.db
        .query("user_role_assignments")
        .withIndex("by_user_org", (q) =>
          q.eq("userId", userId).eq("organisationId", user.organisationId),
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
    });

  if (!hasPermission) {
    throw new Error(`Permission denied: ${permissionId}`);
  }

  return true;
};

/**
 * Org-scoped permission enforcement wrapper
 * Ensures the actor is operating within the specified organisation
 * and has the required permission (or is sysadmin/developer).
 */
export const requireOrgPermission = async (
  ctx: QueryCtx | MutationCtx,
  userId: string,
  permissionId: string,
  organisationId: string,
) => {
  const user = await ctx.db
    .query("users")
    .withIndex("by_subject", (q) => q.eq("subject", userId))
    .first();

  if (!user) {
    throw new Error("Permission denied: user not found");
  }

  // System roles bypass checks
  if (user.systemRoles && user.systemRoles.length > 0) {
    const systemRoles = ["admin", "sysadmin", "developer"];
    if (user.systemRoles.some((role: string) => systemRoles.includes(role))) {
      return true;
    }
  }

  // Must be operating within their own organisation
  if (String(user.organisationId) !== String(organisationId)) {
    throw new Error("Permission denied: cross-organisation access not allowed");
  }

  // Organisation admins are allowed for org-scoped permissions within their org
  if (
    Array.isArray(user.systemRoles) &&
    user.systemRoles.some((r: string) => r === "orgadmin")
  ) {
    return true;
  }

  // Then enforce the permission
  return requirePermission(ctx, userId, permissionId);
};

/**
 * Ensure default roles exist for an organisation.
 * Creates missing roles in `user_roles` and assigns permissions based on
 * `system_permissions.defaultRoles` membership.
 */
export async function ensureDefaultsForOrg(
  ctx: MutationCtx,
  organisationId: Id<"organisations">,
  options?: {
    performedBy?: string;
    performedByName?: string;
    roleNames?: string[];
  },
) {
  const now = Date.now();

  // Fetch existing roles for org
  const existingRoles = await ctx.db
    .query("user_roles")
    .filter((q) =>
      q.and(
        q.eq(q.field("organisationId"), organisationId),
        q.eq(q.field("isActive"), true),
      ),
    )
    .collect();

  const existingRoleNames = new Set(existingRoles.map((r) => r.name));

  let defaultRoleNames = options?.roleNames;
  if (!defaultRoleNames) {
    const templates = await ctx.db
      .query("system_role_templates")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    defaultRoleNames =
      templates.length > 0
        ? templates.map((t) => t.name)
        : ["Admin", "Manager", "Lecturer", "Viewer"];
  }

  // Load active system permissions once
  const systemPermissions = await ctx.db
    .query("system_permissions")
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  const ensureRole = async (roleName: string) => {
    if (!existingRoleNames.has(roleName)) {
      const permissionsForRole = systemPermissions
        .filter(
          (p) =>
            Array.isArray(p.defaultRoles) && p.defaultRoles.includes(roleName),
        )
        .map((p) => p.id);

      const newRoleId = await ctx.db.insert("user_roles", {
        name: roleName,
        description: `${roleName} role (default)`,
        isDefault: true,
        isSystem: false,
        permissions: permissionsForRole,
        organisationId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      if (options?.performedBy) {
        await ctx.db.insert("audit_logs", {
          action: "role.created",
          entityType: "role",
          entityId: String(newRoleId),
          entityName: roleName,
          performedBy: options.performedBy!,
          ...(options.performedByName
            ? { performedByName: options.performedByName }
            : {}),
          organisationId,
          details: `Default role \"${roleName}\" created with ${permissionsForRole.length} permission(s)`,
          metadata: JSON.stringify({ permissions: permissionsForRole }),
          timestamp: now,
          severity: "info",
        });
      }
      return { created: true };
    }
    return { created: false };
  };

  let createdCount = 0;
  for (const rn of defaultRoleNames ?? []) {
    const r = await ensureRole(rn);
    if (r.created) createdCount += 1;
  }

  return { created: createdCount };
}

export const ensureDefaultRolesForOrganisation = mutation({
  args: {
    organisationId: v.id("organisations"),
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
    roleNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return ensureDefaultsForOrg(ctx, args.organisationId, {
      ...(args.performedBy ? { performedBy: args.performedBy } : {}),
      ...(args.performedByName
        ? { performedByName: args.performedByName }
        : {}),
      ...(args.roleNames ? { roleNames: args.roleNames } : {}),
    });
  },
});

/**
 * Ensure default roles exist for all active organisations.
 */
export const ensureDefaultRolesAcrossOrganisations = mutation({
  args: {
    performedBy: v.optional(v.string()),
    performedByName: v.optional(v.string()),
    roleNames: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const orgs = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let totalCreated = 0;
    for (const org of orgs) {
      const result = await ensureDefaultsForOrg(
        ctx as MutationCtx,
        org._id as Id<"organisations">,
        {
          ...(args.performedBy ? { performedBy: args.performedBy } : {}),
          ...(args.performedByName
            ? { performedByName: args.performedByName }
            : {}),
          ...(args.roleNames ? { roleNames: args.roleNames } : {}),
        },
      );
      totalCreated += result.created;
    }

    return { organisationsProcessed: orgs.length, rolesCreated: totalCreated };
  },
});
