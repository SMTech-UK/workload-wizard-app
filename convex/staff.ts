import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission } from "./permissions";

// Create a new lecturer profile
export const create = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    contract: v.string(), // 'FT', 'PT', 'Bank'
    fte: v.float64(),
    maxTeachingHours: v.float64(),
    totalContract: v.float64(),
    organisationId: v.id("organisations"),
    userId: v.string(), // Current user ID for permission check
  },
  handler: async (ctx, args) => {
    // Check permission
    await requirePermission(ctx, args.userId, "staff.create");

    const now = Date.now();
    
    const profileId = await ctx.db.insert("lecturer_profiles", {
      fullName: args.fullName,
      email: args.email,
      contract: args.contract,
      fte: args.fte,
      maxTeachingHours: args.maxTeachingHours,
      totalContract: args.totalContract,
      organisationId: args.organisationId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
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
    // Check permission
    await requirePermission(ctx, args.userId, "staff.edit");

    const profile = await ctx.db.get(args.profileId);
    if (!profile) {
      throw new Error("Lecturer profile not found");
    }

    const updates: any = { updatedAt: Date.now() };
    
    if (args.fullName !== undefined) updates.fullName = args.fullName;
    if (args.email !== undefined) updates.email = args.email;
    if (args.contract !== undefined) updates.contract = args.contract;
    if (args.fte !== undefined) updates.fte = args.fte;
    if (args.maxTeachingHours !== undefined) updates.maxTeachingHours = args.maxTeachingHours;
    if (args.totalContract !== undefined) updates.totalContract = args.totalContract;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.profileId, updates);
    return args.profileId;
  },
});

// List lecturer profiles for an organisation
export const list = query({
  args: {
    organisationId: v.id("organisations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("lecturer_profiles")
      .withIndex("by_organisation", (q) => q.eq("organisationId", args.organisationId))
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