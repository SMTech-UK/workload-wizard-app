import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByOrganisation = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campuses")
      .withIndex("by_organisation", (q) =>
        q.eq("organisationId", args.organisationId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", identity.subject))
      .first();
    if (!actor) throw new Error("User not found");
    const now = Date.now();

    // Ensure unique code per organisation
    const existing = await ctx.db
      .query("campuses")
      .withIndex("by_organisation", (q) =>
        q.eq("organisationId", actor.organisationId),
      )
      .filter((q) => q.eq(q.field("code"), args.code))
      .first();
    if (existing) throw new Error("Campus code already exists");

    return await ctx.db.insert("campuses", {
      name: args.name,
      code: args.code,
      organisationId: actor.organisationId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
