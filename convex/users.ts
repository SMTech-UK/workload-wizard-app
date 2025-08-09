import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requirePermission } from "./permissions";
import { writeAudit } from "./audit";
import type { Id, Doc } from "./_generated/dataModel";

export const create = mutation({
  args: {
    email: v.string(),
    username: v.optional(v.string()),
    givenName: v.string(),
    familyName: v.string(),
    fullName: v.optional(v.string()),
    systemRoles: v.array(v.string()),
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
      // Enforce org scope for non-system actors
      const actor = await ctx.db
        .query("users")
        .withIndex("by_subject", (q) => q.eq("subject", args.userId as string))
        .first();
      if (actor) {
        const isSystem =
          Array.isArray(actor.systemRoles) &&
          actor.systemRoles.some((r: string) =>
            ["admin", "sysadmin", "developer"].includes(r),
          );
        if (
          !isSystem &&
          String(actor.organisationId) !== String(args.organisationId)
        ) {
          throw new Error(
            "Unauthorized: Cannot create users outside your organisation",
          );
        }
      }
    }

    const base = {
      email: args.email,
      givenName: args.givenName,
      familyName: args.familyName,
      fullName: args.fullName || `${args.givenName} ${args.familyName}`,
      systemRoles: args.systemRoles,
      organisationId: args.organisationId,
      subject: args.subject || "",
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as const;
    const optional: {
      username?: string;
      pictureUrl?: string;
      tokenIdentifier?: string;
    } = {
      ...(args.username ? { username: args.username } : {}),
      ...(args.pictureUrl ? { pictureUrl: args.pictureUrl } : {}),
      ...(args.tokenIdentifier
        ? { tokenIdentifier: args.tokenIdentifier }
        : {}),
    };
    const userId = await ctx.db.insert("users", { ...base, ...optional });

    // Audit invite/create when initiated by an authenticated actor
    if (args.userId) {
      try {
        await writeAudit(ctx, {
          action: "user.invited",
          entityType: "user",
          entityId: String(userId),
          entityName: base.email,
          performedBy: args.userId,
          organisationId: base.organisationId,
          details: `User invited: ${base.email}`,
          metadata: JSON.stringify({
            username: optional.username,
            systemRoles: base.systemRoles,
          }),
          severity: "info",
        });
      } catch {}
    }

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
    systemRoles: v.optional(v.array(v.string())),
    organisationId: v.optional(v.id("organisations")),
    isActive: v.optional(v.boolean()),
    currentUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Allow orgadmin to edit users within their own organisation; otherwise require permission
    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.currentUserId))
      .first();

    const targetUser = await ctx.db.get(args.id);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const actorIsOrgAdmin =
      !!actor &&
      Array.isArray(actor.systemRoles) &&
      actor.systemRoles.includes("orgadmin");
    const sameOrganisation =
      !!actor &&
      String(actor.organisationId) === String(targetUser.organisationId);

    if (!(actorIsOrgAdmin && sameOrganisation)) {
      await requirePermission(ctx, args.currentUserId, "users.edit");
    }

    const { id, currentUserId, ...updates } = args;

    // Guardrails: Only system admins (sysadmin/developer/admin) may modify systemRoles
    if (updates.systemRoles) {
      const isSystemActor =
        !!actor &&
        Array.isArray(actor.systemRoles) &&
        actor.systemRoles.some((r: string) =>
          ["admin", "sysadmin", "developer"].includes(r),
        );
      if (!isSystemActor) {
        throw new Error(
          "Unauthorized: Only system administrators may change system roles",
        );
      }
      // Prevent assigning protected roles unless actor is sysadmin
      const assigningProtected = updates.systemRoles.some(
        (r: string) => r === "sysadmin" || r === "developer",
      );
      const actorIsSysadmin =
        !!actor &&
        Array.isArray(actor.systemRoles) &&
        actor.systemRoles.includes("sysadmin");
      if (assigningProtected && !actorIsSysadmin) {
        throw new Error(
          "Unauthorized: Only sysadmin may assign developer/sysadmin roles",
        );
      }
    }

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
      const currentUser = targetUser;
      if (currentUser) {
        const givenName = updates.givenName ?? currentUser.givenName;
        const familyName = updates.familyName ?? currentUser.familyName;
        updates.fullName = `${givenName} ${familyName}`;
      }
    }

    await ctx.db.patch(id, updates);

    // Audit update
    try {
      await writeAudit(ctx, {
        action: "update",
        entityType: "user",
        entityId: String(id),
        performedBy: args.currentUserId,
        details: "User updated",
        metadata: JSON.stringify(updates),
        severity: "info",
      });
    } catch {}
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

    // Audit email change
    try {
      await writeAudit(ctx, {
        action: "update",
        entityType: "user",
        entityId: String(args.userId),
        performedBy: currentUser.subject,
        details: "User email updated",
        metadata: JSON.stringify({ newEmail: args.newEmail }),
        severity: "info",
      });
    } catch {}
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
        q.eq(q.field("organisationId"), args.organisationId),
      );
    }

    const users = await usersQuery.collect();

    // Get organisation details for each user
    const usersWithOrganisations = await Promise.all(
      users.map(async (user) => {
        const organisation = await ctx.db.get(user.organisationId);

        // Get all current organisational role assignments for this user in their org (support multiple)
        const assignments = await ctx.db
          .query("user_role_assignments")
          .withIndex("by_user_org", (q) =>
            q
              .eq("userId", user.subject)
              .eq("organisationId", user.organisationId),
          )
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        const organisationalRoles: Array<{
          id: Id<"user_roles">;
          name: string;
          description: string;
        } | null> = [];
        for (const a of assignments) {
          const role = await ctx.db.get(a.roleId);
          if (role && role.isActive) {
            organisationalRoles.push({
              id: role._id,
              name: role.name,
              description: role.description,
            });
          }
        }

        // Back-compat: primary role as first, if any
        const organisationalRole = organisationalRoles[0] || null;

        return {
          ...user,
          organisation: organisation
            ? {
                id: organisation._id,
                name: organisation.name,
                code: organisation.code,
              }
            : undefined,
          organisationalRoles,
          organisationalRole,
        };
      }),
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

    // Audit
    try {
      await writeAudit(ctx, {
        action: "deactivate",
        entityType: "user",
        entityId: user.subject,
        entityName: user.fullName,
        performedBy: user.subject,
        organisationId: user.organisationId,
        details: "User deactivated",
        severity: "warning",
      });
    } catch {}

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

    // Audit
    try {
      await writeAudit(ctx, {
        action: "delete",
        entityType: "user",
        entityId: user.subject,
        entityName: user.fullName,
        performedBy: user.subject,
        organisationId: user.organisationId,
        details: "User hard deleted",
        severity: "critical",
      });
    } catch {}

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
    systemRoles: v.optional(v.array(v.string())),
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

    // Build a safe update object with correct types
    const processedUpdates: Partial<Doc<"users">> & Record<string, unknown> =
      {};

    if (updates.email !== undefined) processedUpdates.email = updates.email;
    if (updates.username !== undefined)
      processedUpdates.username = updates.username;
    if (updates.givenName !== undefined)
      processedUpdates.givenName = updates.givenName;
    if (updates.familyName !== undefined)
      processedUpdates.familyName = updates.familyName;
    if (updates.fullName !== undefined)
      processedUpdates.fullName = updates.fullName;
    if (updates.systemRoles !== undefined)
      processedUpdates.systemRoles = updates.systemRoles;
    if (updates.pictureUrl !== undefined)
      processedUpdates.pictureUrl = updates.pictureUrl;

    // Handle organisation ID conversion
    if (updates.organisationId && updates.organisationId !== "") {
      try {
        const org = await ctx.db
          .query("organisations")
          .filter((q) =>
            q.eq(
              q.field("_id"),
              updates.organisationId as unknown as Id<"organisations">,
            ),
          )
          .first();
        if (org) {
          processedUpdates.organisationId = org._id;
        }
      } catch {
        // ignore invalid org id
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
    const updates: Partial<Doc<"users">> & Record<string, unknown> = {
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
    await writeAudit(ctx, {
      action: "update",
      entityType: "user",
      entityId: String(user._id),
      entityName: user.fullName,
      performedBy: subject,
      performedByName: user.fullName,
      organisationId: user.organisationId,
      details: "Updated profile picture",
      metadata: JSON.stringify({
        previousPictureUrl: user.pictureUrl,
        newPictureUrl: pictureUrl,
      }),
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
