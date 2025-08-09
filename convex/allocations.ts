import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { writeAudit } from "./audit";
import { requireOrgPermission } from "./permissions";

function computeHoursFromCredits(credits?: number): number {
  if (!credits || !Number.isFinite(credits)) return 0;
  // Simple MVP heuristic: 1 credit = 1 hour (adjust later)
  return credits;
}

// Assign a lecturer to a group
export const assignLecturer = mutation({
  args: {
    groupId: v.id("module_groups"),
    lecturerId: v.id("lecturer_profiles"),
    academicYearId: v.id("academic_years"),
    organisationId: v.id("organisations"),
    type: v.union(v.literal("teaching"), v.literal("admin")),
    hoursOverride: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");

    // Compute baseline hours from module credits via linked iteration->module
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    const iteration = await ctx.db.get(group.moduleIterationId);
    if (!iteration) throw new Error("Module iteration not found");
    const moduleDoc = await ctx.db.get(iteration.moduleId);
    const baseHours = computeHoursFromCredits((moduleDoc as any)?.credits);

    // Permission: allocations.assign within module's org
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "allocations.assign",
      (moduleDoc as any).organisationId,
    );

    const now = Date.now();
    const id = await ctx.db.insert("group_allocations" as any, {
      groupId: args.groupId,
      lecturerId: args.lecturerId,
      academicYearId: args.academicYearId,
      organisationId: args.organisationId,
      type: args.type,
      hoursComputed: baseHours,
      ...(typeof args.hoursOverride === "number"
        ? { hoursOverride: args.hoursOverride }
        : {}),
      createdAt: now,
      updatedAt: now,
    } as any);

    try {
      await writeAudit(ctx, {
        action: "create",
        entityType: "group_allocation",
        entityId: String(id),
        performedBy: identity.subject,
        details: `Allocated lecturer ${String(args.lecturerId)} to group ${String(args.groupId)}`,
        severity: "info",
      });
    } catch {}

    return id as Id<"group_allocations">;
  },
});

// List allocations for a lecturer in a year
export const listForLecturer = query({
  args: { lecturerId: v.id("lecturer_profiles"), academicYearId: v.id("academic_years") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("group_allocations" as any)
      .withIndex("by_lecturer" as any, (q) =>
        (q as any).eq("lecturerId", args.lecturerId as any),
      )
      .filter((q) =>
        (q as any).eq((q as any).field("academicYearId"), args.academicYearId),
      )
      .collect();
    return rows;
  },
});

// Compute basic totals for a lecturer in a year (MVP)
export const computeLecturerTotals = query({
  args: { lecturerId: v.id("lecturer_profiles"), academicYearId: v.id("academic_years") },
  handler: async (ctx, args) => {
    // Permission: allocations.view within lecturer's org (derive via lecturer profile)
    const lecturer = await ctx.db.get(args.lecturerId);
    const identity = await ctx.auth.getUserIdentity();
    if (lecturer && identity?.subject) {
      await requireOrgPermission(
        ctx as any,
        identity.subject,
        "allocations.view",
        (lecturer as any).organisationId,
      );
    }

    const allocations = (await ctx.db
      .query("group_allocations" as any)
      .withIndex("by_lecturer" as any, (q) =>
        (q as any).eq("lecturerId", args.lecturerId as any),
      )
      .filter((q) =>
        (q as any).eq((q as any).field("academicYearId"), args.academicYearId),
      )
      .collect()) as any[];

    const lectureHours = allocations
      .filter((a) => a.type === "teaching")
      .reduce((sum, a) => sum + (typeof a.hoursOverride === "number" ? a.hoursOverride : a.hoursComputed || 0), 0);
    const adminHours = allocations
      .filter((a) => a.type === "admin")
      .reduce((sum, a) => sum + (typeof a.hoursOverride === "number" ? a.hoursOverride : a.hoursComputed || 0), 0);

    return {
      allocatedTeaching: lectureHours,
      allocatedAdmin: adminHours,
      allocatedTotal: lectureHours + adminHours,
    };
  },
});

// List allocations for a group (with lecturer basic info)
export const listForGroup = query({
  args: { groupId: v.id("module_groups") },
  handler: async (ctx, args) => {
    const rows = (await ctx.db
      .query("group_allocations" as any)
      .withIndex("by_group" as any, (q) =>
        (q as any).eq("groupId", args.groupId as any),
      )
      .collect()) as any[];

    const lecturers = await Promise.all(
      rows.map((r) => ctx.db.get(r.lecturerId)),
    );
    return rows.map((r, i) => ({ allocation: r, lecturer: lecturers[i] }));
  },
});

// Remove an allocation
export const remove = mutation({
  args: { allocationId: v.id("group_allocations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const existing = await ctx.db.get(args.allocationId);
    if (!existing) return args.allocationId;
    // Authorise within org
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "allocations.assign",
      (existing as any).organisationId,
    );
    await ctx.db.delete(args.allocationId);
    try {
      await writeAudit(ctx, {
        action: "delete",
        entityType: "group_allocation",
        entityId: String(args.allocationId),
        performedBy: identity.subject,
        severity: "warning",
      });
    } catch {}
    return args.allocationId;
  },
});


