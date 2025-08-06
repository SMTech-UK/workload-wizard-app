import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { clerkClient } from "@clerk/nextjs/server";

// Query to list all users with their organisation details
export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    // Get organisation details for each user
    const usersWithOrgs = await Promise.all(
      users.map(async (user) => {
        const organisation = await ctx.db.get(user.organisationId);
        return {
          ...user,
          organisation: organisation ? {
            id: organisation._id,
            name: organisation.name,
            code: organisation.code
          } : null
        };
      })
    );

    return usersWithOrgs;
  },
});

// Query to get a single user by ID
export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subject"), args.userId))
      .first();
    
    if (!user) return null;

    const organisation = await ctx.db.get(user.organisationId);
    return {
      ...user,
      organisation: organisation ? {
        id: organisation._id,
        name: organisation.name,
        code: organisation.code
      } : null
    };
  },
});

// Mutation to create a new user (called after Clerk user creation)
export const create = mutation({
  args: {
    email: v.string(),
    givenName: v.string(),
    familyName: v.string(),
    fullName: v.string(),
    systemRole: v.string(),
    organisationId: v.id("organisations"),
    pictureUrl: v.optional(v.string()),
    subject: v.string(), // Clerk user ID
    tokenIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      email: args.email,
      givenName: args.givenName,
      familyName: args.familyName,
      fullName: args.fullName,
      systemRole: args.systemRole,
      organisationId: args.organisationId,
      pictureUrl: args.pictureUrl,
      subject: args.subject,
      tokenIdentifier: args.tokenIdentifier,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// Mutation to update user details
export const update = mutation({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    givenName: v.optional(v.string()),
    familyName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    systemRole: v.optional(v.string()),
    organisationId: v.optional(v.id("organisations")),
    pictureUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subject"), args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: any = { updatedAt: Date.now() };
    
    if (args.email !== undefined) updates.email = args.email;
    if (args.givenName !== undefined) updates.givenName = args.givenName;
    if (args.familyName !== undefined) updates.familyName = args.familyName;
    if (args.fullName !== undefined) updates.fullName = args.fullName;
    if (args.systemRole !== undefined) updates.systemRole = args.systemRole;
    if (args.organisationId !== undefined) updates.organisationId = args.organisationId;
    if (args.pictureUrl !== undefined) updates.pictureUrl = args.pictureUrl;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

// Mutation to delete a user (soft delete by setting isActive to false)
export const remove = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subject"), args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Soft delete by setting isActive to false
    await ctx.db.patch(user._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

// Mutation to hard delete a user (completely remove from database)
export const hardDelete = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subject"), args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Hard delete by removing the user from the database
    await ctx.db.delete(user._id);

    return user._id;
  },
});

// Query to get users by organisation
export const listByOrganisation = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("organisationId"), args.organisationId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return users;
  },
});

// Query to get all users by organisation (including inactive)
export const listAllByOrganisation = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("organisationId"), args.organisationId))
      .collect();

    return users;
  },
});

// Mutation to update last sign in time
export const updateLastSignIn = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subject"), args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      lastSignInAt: Date.now(),
      updatedAt: Date.now(),
    });

    return user._id;
  },
}); 