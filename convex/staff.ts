import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgPermission } from "./permissions";

// Create a new lecturer profile
export const create = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    contract: v.string(), // 'FT', 'PT', 'Bank'
    fte: v.float64(),
    maxTeachingHours: v.float64(),
    totalContract: v.float64(),
    userId: v.string(), // Current user ID for permission check
  },
  handler: async (ctx, args) => {
    // Derive organisationId from the actor's user record
    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.userId))
      .first();
    if (!actor) throw new Error("Actor not found");

    // Check permission within org context using derived organisationId
    await requireOrgPermission(ctx, args.userId, "staff.create", actor.organisationId);

    const now = Date.now();
    
    const profileId = await ctx.db.insert("lecturer_profiles", {
      fullName: args.fullName,
      email: args.email,
      contract: args.contract,
      fte: args.fte,
      maxTeachingHours: args.maxTeachingHours,
      totalContract: args.totalContract,
      organisationId: actor.organisationId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Audit create
    await ctx.db.insert("audit_logs", {
      action: "create",
      entityType: "lecturer_profile",
      entityId: String(profileId),
      entityName: args.fullName,
      performedBy: args.userId,
      organisationId: actor.organisationId,
      details: `Created lecturer profile (${args.contract})`,
      metadata: JSON.stringify({ email: args.email, fte: args.fte, maxTeachingHours: args.maxTeachingHours, totalContract: args.totalContract }),
      timestamp: now,
      severity: "info",
    });

    return profileId;
  },
});

// Update lecturer profile
export const edit = mutation({
  args: {
    profileId: v.id("lecturer_profiles"),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    contract: v.optional(v.string()),
    fte: v.optional(v.float64()),
    maxTeachingHours: v.optional(v.float64()),
    totalContract: v.optional(v.float64()),
    isActive: v.optional(v.boolean()),
    userId: v.string(), // Current user ID for permission check
  },
  handler: async (ctx, args) => {
    // Check permission within org context
    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Lecturer profile not found");
    }
    await requireOrgPermission(ctx, args.userId, "staff.edit", profile.organisationId);

    const updates: {
      fullName?: string;
      email?: string;
      contract?: string;
      fte?: number;
      maxTeachingHours?: number;
      totalContract?: number;
      isActive?: boolean;
      updatedAt: number;
    } = { updatedAt: Date.now() };
    
    if (args.fullName !== undefined) updates.fullName = args.fullName;
    if (args.email !== undefined) updates.email = args.email;
    if (args.contract !== undefined) updates.contract = args.contract;
    if (args.fte !== undefined) updates.fte = args.fte;
    if (args.maxTeachingHours !== undefined) updates.maxTeachingHours = args.maxTeachingHours;
    if (args.totalContract !== undefined) updates.totalContract = args.totalContract;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.profileId, updates);

    // Audit update
    await ctx.db.insert("audit_logs", {
      action: "update",
      entityType: "lecturer_profile",
      entityId: String(args.profileId),
      performedBy: args.userId,
      organisationId: profile.organisationId,
      details: "Updated lecturer profile",
      metadata: JSON.stringify(updates),
      timestamp: Date.now(),
      severity: "info",
    });

    return args.profileId;
  },
});

// List lecturer profiles for an organisation
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.userId))
      .first();
    if (!actor) throw new Error("Actor not found");

    return await ctx.db
      .query("lecturer_profiles")
      .withIndex("by_organisation", (q) => q.eq("organisationId", actor.organisationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get a single lecturer profile
export const get = query({
  args: {
    profileId: v.id("lecturer_profiles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.profileId);
  },
}); 