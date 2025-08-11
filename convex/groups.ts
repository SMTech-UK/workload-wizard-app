import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { writeAudit } from "./audit";
import { requireOrgPermission } from "./permissions";

// List groups under a module iteration
export const listByIteration = query({
  args: { moduleIterationId: v.id("module_iterations") },
  handler: async (ctx, args) => {
    // Enforce view via module org
    const iteration = await ctx.db.get(args.moduleIterationId);
    if (!iteration) return [];
    const moduleDoc = iteration
      ? await ctx.db.get((iteration as any).moduleId)
      : null;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return [];
    if (moduleDoc) {
      await requireOrgPermission(
        ctx as any,
        identity.subject,
        "groups.view",
        (moduleDoc as any).organisationId,
      );
    }
    const groups = await ctx.db
      .query("module_groups" as any)
      .withIndex("by_iteration" as any, (q) =>
        (q as any).eq("moduleIterationId", args.moduleIterationId as any),
      )
      .order("asc")
      .collect();
    return groups;
  },
});

// Create a group under an iteration
export const create = mutation({
  args: {
    moduleIterationId: v.id("module_iterations"),
    name: v.string(),
    sizePlanned: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");

    const iteration = await ctx.db.get(args.moduleIterationId);
    if (!iteration) throw new Error("Module iteration not found");
    const moduleDoc = await ctx.db.get(iteration.moduleId);
    if (!moduleDoc) throw new Error("Module not found");
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "groups.create",
      (moduleDoc as any).organisationId,
    );

    const now = Date.now();
    const id = await (ctx.db as any).insert("module_groups", {
      moduleIterationId: args.moduleIterationId,
      name: args.name,
      ...(typeof args.sizePlanned === "number"
        ? { sizePlanned: args.sizePlanned }
        : {}),
      createdAt: now,
      updatedAt: now,
    });

    try {
      await writeAudit(ctx, {
        action: "create",
        entityType: "module_group",
        entityId: String(id),
        performedBy: identity.subject,
        details: `Created group ${args.name}`,
        severity: "info",
      });
    } catch {}

    return id;
  },
});

// Delete a group
export const remove = mutation({
  args: { id: v.id("module_groups") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const existing = await (ctx.db as any).get(args.id as any);
    if (!existing) return args.id;
    const iteration = await ctx.db.get(existing.moduleIterationId);
    const moduleDoc = iteration
      ? await ctx.db.get((iteration as any).moduleId)
      : null;
    if (!moduleDoc) return args.id;
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "groups.delete",
      (moduleDoc as any).organisationId,
    );
    await (ctx.db as any).delete(args.id as any);
    try {
      await writeAudit(ctx, {
        action: "delete",
        entityType: "module_group",
        entityId: String(args.id),
        performedBy: identity.subject,
        details: `Deleted group ${existing.name}`,
        severity: "warning",
      });
    } catch {}
    return args.id;
  },
});
