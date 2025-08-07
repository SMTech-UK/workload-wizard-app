import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requirePermission } from "./permissions";

export const create = mutation({
  args: {
    email: v.string(),
    username: v.optional(v.string()),
    givenName: v.string(),
    familyName: v.string(),
    fullName: v.optional(v.string()),
    systemRole: v.string(),
    organisationId: v.id("organisations"),
    pictureUrl: v.optional(v.string()),
    subject: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    password: v.optional(v.string()),
    sendEmailInvitation: v.optional(v.boolean()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check permissions if userId is provided (for webhook calls, userId is not provided)
    if (args.userId) {
      await requirePermission(ctx, args.userId, "users.invite");
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      username: args.username,
      givenName: args.givenName,
      familyName: args.familyName,
      fullName: args.fullName || `${args.givenName} ${args.familyName}`,
      systemRole: args.systemRole,
      organisationId: args.organisationId,
      pictureUrl: args.pictureUrl,
      subject: args.subject || "", // Will be updated by Clerk webhook if not provided
      tokenIdentifier: args.tokenIdentifier,
      isActive: true,
      lastSignInAt: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

export const update = mutation({
  args: {
    id: v.id("users"),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    givenName: v.optional(v.string()),
    familyName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    systemRole: v.optional(v.string()),
    organisationId: v.optional(v.id("organisations")),
    isActive: v.optional(v.boolean()),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, args.currentUserId, "users.edit");

    const { id, currentUserId, ...updates } = args;

    // If email is being updated, ensure it's unique
    if (updates.email) {
      const existingUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), updates.email))
        .filter((q) => q.neq(q.field("_id"), id))
        .first();

      if (existingUser) {
        throw new Error("Email address is already in use");
      }
    }

    // Update fullName if givenName or familyName is being updated
    if (updates.givenName || updates.familyName) {
      const currentUser = await ctx.db.get(id);
      if (currentUser) {
        const givenName = updates.givenName ?? currentUser.givenName;
        const familyName = updates.familyName ?? currentUser.familyName;
        updates.fullName = `${givenName} ${familyName}`;
      }
    }

    await ctx.db.patch(id, updates);
  },
});

export const updateEmail = mutation({
  args: {
    userId: v.id("users"),
    newEmail: v.string(),
    currentUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the current user to check their subject for permissions
    const currentUser = await ctx.db.get(args.currentUserId);
    if (!currentUser) {
      throw new Error("Current user not found");
    }
    
    await requirePermission(ctx, currentUser.subject, "users.edit");

    // Check if the new email is already in use by another user
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.newEmail))
      .filter((q) => q.neq(q.field("_id"), args.userId))
      .first();

    if (existingUser) {
      throw new Error("Email address is already in use by another user");
    }

    // Update the email
    await ctx.db.patch(args.userId, {
      email: args.newEmail,
    });
  },
});

export const list = query({
  args: {
    organisationId: v.optional(v.id("organisations")),
  },
  handler: async (ctx, args) => {
    let usersQuery = ctx.db.query("users");

    if (args.organisationId) {
      usersQuery = usersQuery.filter((q) =>
        q.eq(q.field("organisationId"), args.organisationId)
      );
    }

    const users = await usersQuery.collect();

    // Get organisation details for each user
    const usersWithOrganisations = await Promise.all(
      users.map(async (user) => {
        const organisation = await ctx.db.get(user.organisationId);
        return {
          ...user,
          organisation: organisation
            ? {
                id: organisation._id,
                name: organisation.name,
                code: organisation.code,
              }
            : undefined,
        };
      })
    );

    return usersWithOrganisations;
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySubject = query({
  args: { subject: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.subject))
      .first();
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

// Webhook-specific mutation to update user data (no permission check)
export const updateByWebhook = mutation({
  args: {
    userId: v.string(), // Clerk user ID (subject)
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    givenName: v.optional(v.string()),
    familyName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    systemRole: v.optional(v.string()),
    organisationId: v.optional(v.string()), // Can be empty string for webhook calls
    pictureUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("subject"), args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const { userId, ...updates } = args;

    // Handle organisation ID conversion
    let processedUpdates: any = { ...updates };
    if (updates.organisationId && updates.organisationId !== "") {
      try {
        // Try to find the organisation by ID string
        const org = await ctx.db
          .query("organisations")
          .filter((q) => q.eq(q.field("_id"), updates.organisationId as any))
          .first();
        
        if (org) {
          processedUpdates.organisationId = org._id;
        } else {
          // Remove the organisationId if the org doesn't exist
          delete processedUpdates.organisationId;
        }
      } catch {
        // Remove the organisationId if conversion fails
        delete processedUpdates.organisationId;
      }
    }

    // Update fullName if givenName or familyName is being updated
    if (updates.givenName || updates.familyName) {
      const givenName = updates.givenName ?? user.givenName;
      const familyName = updates.familyName ?? user.familyName;
      processedUpdates.fullName = `${givenName} ${familyName}`;
    }

    processedUpdates.updatedAt = Date.now();

    await ctx.db.patch(user._id, processedUpdates);

    return user._id;
  },
});

export const completeOnboarding = mutation({
  args: {
    subject: v.string(), // Clerk user ID
    onboardingData: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const data = args.onboardingData;
    
    // Prepare updates object with onboarding completion
    const updates: any = {
      onboardingCompleted: true,
      onboardingData: args.onboardingData,
      onboardingCompletedAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Update profile fields from onboarding data if provided
    if (data.firstName && data.firstName !== user.givenName) {
      updates.givenName = data.firstName;
    }
    
    if (data.lastName && data.lastName !== user.familyName) {
      updates.familyName = data.lastName;
    }
    
    // Update full name if first or last name changed
    if (updates.givenName || updates.familyName) {
      const firstName = updates.givenName || user.givenName;
      const lastName = updates.familyName || user.familyName;
      updates.fullName = `${firstName} ${lastName}`;
    }
    
    if (data.email && data.email !== user.email) {
      updates.email = data.email;
    }
    
    if (data.phone) {
      updates.phone = data.phone;
    }
    
    if (data.department) {
      updates.department = data.department;
    }
    
    // Handle job role (use customRole if role is "other", otherwise use role)
    if (data.role) {
      if (data.role === "other" && data.customRole) {
        updates.jobRole = data.customRole;
      } else if (data.role !== "other") {
        updates.jobRole = data.role;
      }
    }

    await ctx.db.patch(user._id, updates);

    return user._id;
  },
}); 

export const updateUserAvatar = mutation({
  args: {
    subject: v.string(), // Clerk user ID
    pictureUrl: v.string(), // New avatar URL from Clerk
  },
  handler: async (ctx, args) => {
    const { subject, pictureUrl } = args;

    // Find the user by Clerk subject ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Update the user's picture URL
    const updatedUser = await ctx.db.patch(user._id, {
      pictureUrl,
      updatedAt: Date.now(),
    });

    // Log the avatar update
    await ctx.db.insert("audit_logs", {
      action: "update",
      entityType: "user",
      entityId: user._id,
      entityName: user.fullName,
      performedBy: subject,
      performedByName: user.fullName,
      organisationId: user.organisationId,
      details: "Updated profile picture",
      metadata: JSON.stringify({ previousPictureUrl: user.pictureUrl, newPictureUrl: pictureUrl }),
      timestamp: Date.now(),
      severity: "info",
    });

    return updatedUser;
  },
}); 

export const getUserAvatar = query({
  args: {
    subject: v.string(), // Clerk user ID
  },
  handler: async (ctx, args) => {
    const { subject } = args;

    const user = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();

    return user?.pictureUrl || null;
  },
}); 