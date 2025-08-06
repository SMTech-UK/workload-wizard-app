import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all roles for an organisation
export const listByOrganisation = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    // Validate that the organisation exists
    const organisation = await ctx.db.get(args.organisationId);
    if (!organisation || !organisation.isActive) {
      throw new Error('Organisation not found or inactive');
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
    organisationId: v.id("organisations"),
    permissions: v.array(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const roleId = await ctx.db.insert("user_roles", {
      name: args.name,
      description: args.description,
      organisationId: args.organisationId,
      permissions: args.permissions,
      isDefault: args.isDefault || false,
      isSystem: false, // Organisational roles are never system roles
      isActive: true,
      createdAt: now,
      updatedAt: now,
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

    await ctx.db.patch(roleId, {
      ...updates,
      updatedAt: now,
    });

    return roleId;
  },
});

// Delete an organisational role (soft delete)
export const remove = mutation({
  args: { roleId: v.id("user_roles") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roleId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.roleId;
  },
});

// Assign a role to a user
export const assignToUser = mutation({
  args: {
    userId: v.string(),
    roleId: v.id("user_roles"),
    organisationId: v.id("organisations"),
    assignedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Validate that the organisation exists and is active
    const organisation = await ctx.db.get(args.organisationId);
    if (!organisation || !organisation.isActive) {
      throw new Error('Organisation not found or inactive');
    }

    // Validate that the role exists and belongs to the organisation
    const role = await ctx.db.get(args.roleId);
    if (!role || !role.isActive || role.organisationId !== args.organisationId) {
      throw new Error('Role not found or does not belong to the organisation');
    }

    // Validate that the user exists in the organisation
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subject"), args.userId))
      .filter((q) => q.eq(q.field("organisationId"), args.organisationId))
      .first();
    
    if (!user) {
      throw new Error('User not found in the specified organisation');
    }
    
    // First, deactivate any existing role assignments for this user in this organisation
    const existingAssignments = await ctx.db
      .query("user_role_assignments")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("organisationId"), args.organisationId))
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
      organisationId: args.organisationId,
      assignedBy: args.assignedBy,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return assignmentId;
  },
});

// Get user's organisational role
export const getUserRole = query({
  args: { 
    userId: v.string(),
    organisationId: v.id("organisations")
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("user_role_assignments")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("organisationId"), args.organisationId))
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
      })
    );

    return roles;
  },
}); 