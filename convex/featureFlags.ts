import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { writeAudit } from "./audit";
import type { Id } from "./_generated/dataModel";

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
    await writeAudit(ctx, {
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
      await writeAudit(ctx, {
        action: "flags.updated",
        entityType: "flag",
        entityId: args.flagName,
        performedBy: subject,
        details: `Override removed for user ${args.userId}`,
        metadata: JSON.stringify({
          userId: args.userId,
          flagName: args.flagName,
        }),
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

/**
 * Get all feature flags with their current state (admin only)
 */
export const getFeatureFlagsAdmin = query({
  args: {},
  handler: async (ctx) => {
    // Get all overrides
    const overrides = await ctx.db.query("featureFlagOverrides").collect();
    const orgOverrides = await ctx.db
      .query("organisationFlagOverrides")
      .collect();
    const settings = await ctx.db.query("featureFlagSettings").collect();

    // Group overrides by flag name
    const overrideMap = new Map<
      string,
      Array<{ userId: string; enabled: boolean }>
    >();
    overrides.forEach((override) => {
      if (!overrideMap.has(override.flagName)) {
        overrideMap.set(override.flagName, []);
      }
      overrideMap.get(override.flagName)!.push({
        userId: override.userId,
        enabled: override.enabled,
      });
    });

    // Group org overrides by flag
    const orgOverrideMap = new Map<
      string,
      Array<{ organisationId: Id<"organisations">; enabled: boolean }>
    >();
    orgOverrides.forEach((ovr) => {
      if (!orgOverrideMap.has(ovr.flagName)) {
        orgOverrideMap.set(ovr.flagName, []);
      }
      orgOverrideMap.get(ovr.flagName)!.push({
        organisationId: ovr.organisationId,
        enabled: ovr.enabled,
      });
    });

    // Get all users for display - use subject field for lookup
    const users = await ctx.db.query("users").collect();
    const userMap = new Map(users.map((u) => [u.subject, u]));

    // Return structured data for admin view
    return {
      flags: Array.from(
        new Set([
          ...Array.from(overrideMap.keys()),
          ...Array.from(orgOverrideMap.keys()),
          ...settings.map((s) => s.flagName),
        ]),
      ).map((flagName) => {
        const userOverrides = overrideMap.get(flagName) || [];
        const orgOs = orgOverrideMap.get(flagName) || [];
        const setting = settings.find((s) => s.flagName === flagName) || null;
        return {
          flagName,
          userOverrides: userOverrides.map((override) => ({
            userId: override.userId,
            enabled: override.enabled,
            user: userMap.get(override.userId)
              ? {
                  name: userMap.get(override.userId)!.fullName,
                  email: userMap.get(override.userId)!.email,
                }
              : null,
          })),
          orgOverrides: orgOs.map((o) => ({
            organisationId: String(o.organisationId),
            enabled: o.enabled,
          })),
          settings: setting
            ? {
                rolloutPercentage: setting.rolloutPercentage ?? null,
                defaultValueOverride: setting.defaultValueOverride ?? null,
              }
            : null,
          totalOverrides: userOverrides.length,
          enabledOverrides: userOverrides.filter((o) => o.enabled).length,
          disabledOverrides: userOverrides.filter((o) => !o.enabled).length,
        };
      }),
      totalFlags: new Set([
        ...Array.from(overrideMap.keys()),
        ...Array.from(orgOverrideMap.keys()),
        ...settings.map((s) => s.flagName),
      ]).size,
      totalOverrides: overrides.length,
    };
  },
});

/**
 * Get effective feature flag value for a user (including overrides)
 */
export const getEffectiveFlagValue = query({
  args: {
    userId: v.string(),
    flagName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for user-specific override
    const override = await ctx.db
      .query("featureFlagOverrides")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("flagName"), args.flagName),
        ),
      )
      .first();

    if (override) {
      return {
        enabled: override.enabled,
        source: "override",
        overrideId: override._id,
      };
    }

    // Try organisation-level override by inferring user's org
    const user = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.userId))
      .first();
    if (user) {
      const orgOverride = await ctx.db
        .query("organisationFlagOverrides")
        .withIndex("by_org_flag", (q) =>
          q
            .eq("organisationId", user.organisationId as Id<"organisations">)
            .eq("flagName", args.flagName),
        )
        .first();
      if (orgOverride) {
        return { enabled: orgOverride.enabled, source: "override" };
      }
    }

    // Return default value (you can extend this to check PostHog or other sources)
    return {
      enabled: false, // Default to false, you can make this configurable
      source: "default",
    };
  },
});

// Get settings for a flag
export const getFlagSettings = query({
  args: { flagName: v.string() },
  handler: async (ctx, args) => {
    const s = await ctx.db
      .query("featureFlagSettings")
      .withIndex("by_flag", (q) => q.eq("flagName", args.flagName))
      .first();
    return s || null;
  },
});

// Set organisation-level override
export const setOrganisationOverride = mutation({
  args: {
    organisationId: v.id("organisations"),
    flagName: v.string(),
    enabled: v.boolean(),
    actorUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Require system-level or orgadmin in that org
    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.actorUserId))
      .first();
    if (!actor) throw new Error("Actor not found");
    const isSystem =
      Array.isArray(actor.systemRoles) &&
      actor.systemRoles.some((r: string) =>
        ["admin", "sysadmin", "developer"].includes(r),
      );
    if (
      !isSystem &&
      String(actor.organisationId) !== String(args.organisationId)
    ) {
      throw new Error("Forbidden");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("organisationFlagOverrides")
      .withIndex("by_org_flag", (q) =>
        q
          .eq("organisationId", args.organisationId)
          .eq("flagName", args.flagName),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("organisationFlagOverrides", {
        organisationId: args.organisationId,
        flagName: args.flagName,
        enabled: args.enabled,
        createdAt: now,
        updatedAt: now,
      });
    }
    try {
      await writeAudit(ctx, {
        action: "flags.updated",
        entityType: "flag",
        entityId: args.flagName,
        performedBy: args.actorUserId,
        organisationId: args.organisationId,
        details: `Org override ${args.enabled ? "enabled" : "disabled"}`,
        severity: "info",
      });
    } catch {}
    return true;
  },
});

// Set global flag settings (rollout %, default override)
export const setFlagSettings = mutation({
  args: {
    flagName: v.string(),
    rolloutPercentage: v.optional(v.number()),
    defaultValueOverride: v.optional(v.boolean()),
    actorUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Only system admins
    const actor = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", args.actorUserId))
      .first();
    const isSystem =
      !!actor &&
      Array.isArray(actor.systemRoles) &&
      actor.systemRoles.some((r: string) =>
        ["admin", "sysadmin", "developer"].includes(r),
      );
    if (!isSystem) throw new Error("Forbidden");

    const now = Date.now();
    const existing = await ctx.db
      .query("featureFlagSettings")
      .withIndex("by_flag", (q) => q.eq("flagName", args.flagName))
      .first();
    const updates: any = { updatedAt: now };
    if (typeof args.rolloutPercentage !== "undefined")
      updates.rolloutPercentage = args.rolloutPercentage;
    if (typeof args.defaultValueOverride !== "undefined")
      updates.defaultValueOverride = args.defaultValueOverride;
    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("featureFlagSettings", {
        flagName: args.flagName,
        rolloutPercentage: args.rolloutPercentage,
        defaultValueOverride: args.defaultValueOverride,
        createdAt: now,
        updatedAt: now,
      });
    }
    try {
      await writeAudit(ctx, {
        action: "flags.settings_updated",
        entityType: "flag",
        entityId: args.flagName,
        performedBy: args.actorUserId,
        details: `Settings updated`,
        metadata: JSON.stringify({
          rolloutPercentage: args.rolloutPercentage,
          defaultValueOverride: args.defaultValueOverride,
        }),
        severity: "info",
      });
    } catch {}
    return true;
  },
});
