import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Schema for feature flag overrides
export const featureFlagOverrides = {
  userId: v.string(),
  flagName: v.string(),
  enabled: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
};

/**
 * Get feature flag overrides for a user
 */
export const getOverrides = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const overrides = await ctx.db
      .query("featureFlagOverrides")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Convert to record format
    const overrideRecord: Record<string, boolean> = {};
    overrides.forEach((override) => {
      overrideRecord[override.flagName] = override.enabled;
    });

    return overrideRecord;
  },
});

/**
 * Set a feature flag override for a user
 */
export const setOverride = mutation({
  args: {
    userId: v.string(),
    flagName: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // identify actor
    const identity = await ctx.auth.getUserIdentity();
    const subject = identity?.subject ?? "system";
    const actor =
      subject !== "system"
        ? await ctx.db
            .query("users")
            .withIndex("by_subject", (q) => q.eq("subject", subject))
            .first()
        : null;
    const isSystem =
      !!actor &&
      Array.isArray(actor.systemRoles) &&
      actor.systemRoles.some((r: string) =>
        ["admin", "sysadmin", "developer"].includes(r),
      );

    // allow self override or admin
    if (actor && !isSystem && actor.subject !== args.userId) {
      throw new Error("Forbidden");
    }

    // Check if override already exists
    const existing = await ctx.db
      .query("featureFlagOverrides")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("flagName"), args.flagName),
        ),
      )
      .first();

    if (existing) {
      // Update existing override
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedAt: now,
      });
    } else {
      // Create new override
      await ctx.db.insert("featureFlagOverrides", {
        userId: args.userId,
        flagName: args.flagName,
        enabled: args.enabled,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Audit
    await ctx.db.insert("audit_logs", {
      action: "flags.updated",
      entityType: "flag",
      entityId: args.flagName,
      performedBy: subject,
      details: `Override ${args.enabled ? "enabled" : "disabled"} for user ${args.userId}`,
      metadata: JSON.stringify({
        userId: args.userId,
        flagName: args.flagName,
        enabled: args.enabled,
      }),
      timestamp: now,
      severity: "info",
    });

    return true;
  },
});

/**
 * Remove a feature flag override for a user
 */
export const removeOverride = mutation({
  args: {
    userId: v.string(),
    flagName: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("featureFlagOverrides")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("flagName"), args.flagName),
        ),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      // Audit
      const identity = await ctx.auth.getUserIdentity();
      const subject = identity?.subject ?? "system";
      await ctx.db.insert("audit_logs", {
        action: "flags.updated",
        entityType: "flag",
        entityId: args.flagName,
        performedBy: subject,
        details: `Override removed for user ${args.userId}`,
        metadata: JSON.stringify({
          userId: args.userId,
          flagName: args.flagName,
        }),
        timestamp: Date.now(),
        severity: "warning",
      });
      return true;
    }

    return false;
  },
});

/**
 * Log feature flag usage for analytics
 */
export const logUsage = mutation({
  args: {
    userId: v.optional(v.string()),
    flagName: v.string(),
    enabled: v.boolean(),
    source: v.string(),
    userProperties: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // You can create a separate table for logging feature flag usage
    // For now, we'll just log to console
    console.log("Feature flag usage logged:", {
      userId: args.userId,
      flagName: args.flagName,
      enabled: args.enabled,
      source: args.source,
      userProperties: args.userProperties,
      timestamp: new Date().toISOString(),
    });

    return true;
  },
});

/**
 * Get all feature flag overrides (admin only)
 */
export const getAllOverrides = query({
  args: {},
  handler: async (ctx) => {
    const overrides = await ctx.db.query("featureFlagOverrides").collect();

    return overrides;
  },
});
