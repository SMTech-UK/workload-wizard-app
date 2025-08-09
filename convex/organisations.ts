import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensureDefaultsForOrg } from "./permissions";

// Get all organisations
export const list = query({
  args: {},
  handler: async (ctx) => {
    const organisations = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();

    return organisations;
  },
});

// Get organisation by ID
export const getById = query({
  args: { id: v.id("organisations") },
  handler: async (ctx, args) => {
    const organisation = await ctx.db.get(args.id);
    return organisation;
  },
});

// Create new organisation
export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const organisationId = await ctx.db.insert("organisations", {
      name: args.name,
      code: args.code,
      ...(args.contactEmail ? { contactEmail: args.contactEmail } : {}),
      ...(args.contactPhone ? { contactPhone: args.contactPhone } : {}),
      ...(args.domain ? { domain: args.domain } : {}),
      ...(args.website ? { website: args.website } : {}),
      isActive: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Seed default roles and permissions for the organisation
    try {
      await ensureDefaultsForOrg(ctx, organisationId);
    } catch (err) {
      // Do not block org creation if seeding fails; it can be re-run
      console.warn("Failed to seed default roles for organisation", organisationId, err);
    }

    return organisationId;
  },
});

// Update organisation
export const update = mutation({
  args: {
    id: v.id("organisations"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    domain: v.optional(v.string()),
    website: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    return id;
  },
});

// Delete organisation (soft delete)
export const remove = mutation({
  args: { id: v.id("organisations") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isActive: false,
      status: "inactive",
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Get organisation by code
export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const organisation = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("code"), args.code))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return organisation;
  },
}); 

// Get a single organisation by ID
export const get = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.organisationId);
  },
}); 