import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrgPermission } from "./permissions";
import { writeAudit } from "./audit";

// Get all roles for an organisation
export const listByOrganisation = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    // Validate that the organisation exists
    const organisation = await ctx.db.get(args.organisationId);
    if (!organisation || !organisation.isActive) {
      // Return empty array instead of throwing error for better UX
      return [];
    }

    const roles = await ctx.db
      .query("user_roles")
      .filter((q) => q.eq(q.field("organisationId"), args.organisationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("asc")
      .collect();

    return roles;
  },
});

// Get a specific role by ID
export const getById = query({
  args: { roleId: v.id("user_roles") },
  handler: async (ctx, args) => {
    const role = await ctx.db.get(args.roleId);
    return role;
  },
});

// Create a new organisational role
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    permissions: v.array(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    const subject = identity?.subject;
    if (!subject) throw new Error("Unauthenticated");

    // Derive organisation from actor
    const actorUser = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();
    if (!actorUser) throw new Error("User not found");

    // Authorise actor within derived org
    await requireOrgPermission(
      ctx,
      subject,
      "permissions.manage",
      String(actorUser.organisationId),
    );

    const roleId = await ctx.db.insert("user_roles", {
      name: args.name,
      description: args.description,
      organisationId: actorUser.organisationId,
      permissions: args.permissions,
      isDefault: args.isDefault || false,
      isSystem: false, // Organisational roles are never system roles
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Audit create
    await writeAudit(ctx, {
      action: "role.created",
      entityType: "role",
      entityId: String(roleId),
      entityName: args.name,
      performedBy: subject,
      organisationId: actorUser.organisationId,
      details: `Created role "${args.name}" with ${args.permissions.length} permission(s)`,
      metadata: JSON.stringify({
        permissions: args.permissions,
        isDefault: !!args.isDefault,
      }),
      severity: "info",
    });

    return roleId;
  },
});

// Update an organisational role
export const update = mutation({
  args: {
    roleId: v.id("user_roles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { roleId, ...updates } = args;
    const now = Date.now();

    const identity = await ctx.auth.getUserIdentity();
    const subject = identity?.subject;
    if (!subject) throw new Error("Unauthenticated");

    const existing = await ctx.db.get(roleId);
    if (!existing) throw new Error("Role not found");
    await requireOrgPermission(
      ctx,
      subject,
      "permissions.manage",
      String(existing.organisationId),
    );

    await ctx.db.patch(roleId, {
      ...updates,
      updatedAt: now,
    });

    // Audit update
    await ctx.db.insert("audit_logs", {
      action: "role.updated",
      entityType: "role",
      entityId: String(roleId),
      entityName: updates.name ?? existing.name,
      performedBy: subject,
      organisationId: existing.organisationId,
      details: "Updated role",
      metadata: JSON.stringify(updates),
      timestamp: now,
      severity: "info",
    });

    return roleId;
  },
});

// Delete an organisational role (soft delete)
export const remove = mutation({
  args: { roleId: v.id("user_roles") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    const subject = identity?.subject;
    if (!subject) throw new Error("Unauthenticated");

    const existing = await ctx.db.get(args.roleId);
    if (!existing) throw new Error("Role not found");
    await requireOrgPermission(
      ctx,
      subject,
      "permissions.manage",
      String(existing.organisationId),
    );

    await ctx.db.patch(args.roleId, {
      isActive: false,
      updatedAt: now,
    });

    await ctx.db.insert("audit_logs", {
      action: "role.deleted",
      entityType: "role",
      entityId: String(args.roleId),
      entityName: existing.name,
      performedBy: subject,
      organisationId: existing.organisationId,
      details: `Deleted role "${existing.name}"`,
      timestamp: now,
      severity: "warning",
    });

    return args.roleId;
  },
});

// Assign a role to a user
export const assignToUser = mutation({
  args: {
    userId: v.string(),
    roleId: v.id("user_roles"),
    assignedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate role and derive organisation from it
    const role = await ctx.db.get(args.roleId);
    if (!role || !role.isActive) {
      throw new Error("Role not found or inactive");
    }
    const organisation = await ctx.db.get(role.organisationId);
    if (!organisation || !organisation.isActive) {
      throw new Error("Organisation not found or inactive");
    }

    // Authorisation within derived org
    await requireOrgPermission(
      ctx,
      args.assignedBy,
      "permissions.manage",
      String(role.organisationId),
    );

    // Validate that the user exists in the organisation
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subject"), args.userId))
      .filter((q) => q.eq(q.field("organisationId"), role.organisationId))
      .first();

    if (!user) {
      throw new Error("User not found in the specified organisation");
    }

    // First, deactivate any existing role assignments for this user in this organisation
    const existingAssignments = await ctx.db
      .query("user_role_assignments")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("organisationId"), role.organisationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const assignment of existingAssignments) {
      await ctx.db.patch(assignment._id, {
        isActive: false,
        updatedAt: now,
      });
    }

    // Create new role assignment
    const assignmentId = await ctx.db.insert("user_role_assignments", {
      userId: args.userId,
      roleId: args.roleId,
      organisationId: role.organisationId,
      assignedBy: args.assignedBy,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Audit
    await ctx.db.insert("audit_logs", {
      action: "user.role_changed",
      entityType: "user",
      entityId: args.userId,
      entityName: user.fullName ?? user.email ?? args.userId,
      performedBy: args.assignedBy,
      organisationId: role.organisationId,
      details: `Assigned role "${role.name}"`,
      metadata: JSON.stringify({ roleId: role._id, roleName: role.name }),
      timestamp: now,
      severity: "info",
    });

    return assignmentId;
  },
});

// Assign multiple roles to a user (merge RBAC); keeps only the provided set active for the org
export const assignMultipleToUser = mutation({
  args: {
    userId: v.string(),
    roleIds: v.array(v.id("user_roles")),
    assignedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Validate roles and derive organisation; ensure all roles belong to same org
    const roles = await Promise.all(args.roleIds.map((rid) => ctx.db.get(rid)));
    if (roles.some((r) => !r || !r.isActive)) {
      throw new Error("One or more roles invalid or inactive");
    }
    const orgId = roles[0]!.organisationId;
    if (roles.some((r) => String(r!.organisationId) !== String(orgId))) {
      throw new Error("Roles must belong to the same organisation");
    }

    const organisation = await ctx.db.get(orgId);
    if (!organisation || !organisation.isActive) {
      throw new Error("Organisation not found or inactive");
    }

    // Authorisation within derived org
    await requireOrgPermission(
      ctx,
      args.assignedBy,
      "permissions.manage",
      String(orgId),
    );

    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subject"), args.userId))
      .filter((q) => q.eq(q.field("organisationId"), orgId))
      .first();
    if (!user) throw new Error("User not found in the specified organisation");

    // Deactivate all existing assignments first
    const existingAssignments = await ctx.db
      .query("user_role_assignments")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("organisationId"), orgId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    for (const assignment of existingAssignments) {
      await ctx.db.patch(assignment._id, { isActive: false, updatedAt: now });
    }

    // Create assignments for all provided roles
    for (const rid of args.roleIds) {
      await ctx.db.insert("user_role_assignments", {
        userId: args.userId,
        roleId: rid,
        organisationId: orgId,
        assignedBy: args.assignedBy,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Audit summary
    await ctx.db.insert("audit_logs", {
      action: "user.role_changed",
      entityType: "user",
      entityId: args.userId,
      entityName: user.fullName ?? user.email ?? args.userId,
      performedBy: args.assignedBy,
      organisationId: orgId,
      details: `Assigned ${args.roleIds.length} role(s)`,
      metadata: JSON.stringify({ roleIds: args.roleIds }),
      timestamp: now,
      severity: "info",
    });

    return { assignedCount: args.roleIds.length };
  },
});

// Get user's organisational role
export const getUserRole = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Derive organisation from the user's record
    const target = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.userId))
      .first();
    if (!target) return null;

    const assignment = await ctx.db
      .query("user_role_assignments")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("organisationId"), target.organisationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!assignment) {
      return null;
    }

    const role = await ctx.db.get(assignment.roleId);
    return {
      assignment,
      role,
    };
  },
});

// Get all role assignments for a user
export const getUserRoles = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("user_role_assignments")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const roles = await Promise.all(
      assignments.map(async (assignment) => {
        const role = await ctx.db.get(assignment.roleId);
        const organisation = await ctx.db.get(assignment.organisationId);
        return {
          assignment,
          role,
          organisation,
        };
      }),
    );

    return roles;
  },
});
