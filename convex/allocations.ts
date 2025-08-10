import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { writeAudit } from "./audit";
import { computeHoursFromCredits, computeTotals } from "./allocationsMath";
import { requireOrgPermission } from "./permissions";
import { requirePermission } from "./permissions";
import type { Id } from "./_generated/dataModel";

// moved to allocationsMath.ts for unit testing

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

    // Validate hours override if provided
    if (typeof args.hoursOverride === "number") {
      if (args.hoursOverride < 0) {
        throw new Error("Hours override cannot be negative");
      }
      if (args.hoursOverride > 1000) {
        throw new Error("Hours override cannot exceed 1000 hours");
      }
    }

    // Permission: allocations.assign within module's org
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "allocations.assign",
      (moduleDoc as any).organisationId,
    );

    const now = Date.now();
    const id = await ctx.db.insert(
      "group_allocations" as any,
      {
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
      } as any,
    );

    try {
      await writeAudit(ctx, {
        action: "create",
        entityType: "group_allocation",
        entityId: String(id),
        performedBy: identity.subject,
        details: `Allocated lecturer ${String(args.lecturerId)} to group ${String(args.groupId)} with ${typeof args.hoursOverride === "number" ? `${args.hoursOverride} override hours` : `${baseHours} computed hours`}`,
        severity: "info",
      });
    } catch {}

    return id as Id<"group_allocations">;
  },
});

// Update an existing allocation (type and/or hoursOverride)
export const update = mutation({
  args: {
    allocationId: v.id("group_allocations"),
    type: v.optional(v.union(v.literal("teaching"), v.literal("admin"))),
    hoursOverride: v.optional(v.union(v.float64(), v.null())), // null clears override
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");

    const existing = await ctx.db.get(args.allocationId);
    if (!existing) throw new Error("Allocation not found");

    // Authorise within org
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "allocations.assign",
      (existing as any).organisationId,
    );

    // Validate hours if provided
    if (args.hoursOverride !== undefined && args.hoursOverride !== null) {
      if (args.hoursOverride < 0)
        throw new Error("Hours override cannot be negative");
      if (args.hoursOverride > 1000)
        throw new Error("Hours override cannot exceed 1000 hours");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.type !== undefined) updates.type = args.type;
    if (args.hoursOverride === null) {
      updates.hoursOverride = undefined; // clear override
    } else if (args.hoursOverride !== undefined) {
      updates.hoursOverride = args.hoursOverride;
    }

    await ctx.db.patch(args.allocationId, updates);

    try {
      await writeAudit(ctx, {
        action: "update",
        entityType: "group_allocation",
        entityId: String(args.allocationId),
        performedBy: identity.subject,
        details: `Updated allocation ${String(args.allocationId)}${args.type ? ` type=${args.type}` : ""}${args.hoursOverride !== undefined ? ` hoursOverride=${args.hoursOverride === null ? "cleared" : args.hoursOverride}` : ""}`,
        severity: "info",
      });
    } catch {}

    return args.allocationId;
  },
});

// List allocations for a lecturer in a year
export const listForLecturer = query({
  args: {
    lecturerId: v.id("lecturer_profiles"),
    academicYearId: v.id("academic_years"),
  },
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
  args: {
    lecturerId: v.id("lecturer_profiles"),
    academicYearId: v.id("academic_years"),
  },
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

    return computeTotals(allocations as any);
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

// List allocations for a lecturer with group and module details
export const listForLecturerDetailed = query({
  args: {
    lecturerId: v.id("lecturer_profiles"),
    academicYearId: v.id("academic_years"),
  },
  handler: async (ctx, args) => {
    const rows = (await ctx.db
      .query("group_allocations" as any)
      .withIndex("by_lecturer" as any, (q) =>
        (q as any).eq("lecturerId", args.lecturerId as any),
      )
      .filter((q) =>
        (q as any).eq((q as any).field("academicYearId"), args.academicYearId),
      )
      .collect()) as any[];
    const groups = await Promise.all(rows.map((r) => ctx.db.get(r.groupId)));
    const iterations = await Promise.all(
      groups.map((g) => (g ? ctx.db.get((g as any).moduleIterationId) : null)),
    );
    const modules = await Promise.all(
      iterations.map((it) => (it ? ctx.db.get((it as any).moduleId) : null)),
    );
    return rows.map((allocation, i) => ({
      allocation,
      group: groups[i],
      iteration: iterations[i],
      module: modules[i],
    }));
  },
});

// Bulk remove allocations for a list of groups (optionally filtered by lecturer)
export const removeAllocationsForGroups = mutation({
  args: {
    groupIds: v.array(v.id("module_groups")),
    lecturerId: v.optional(v.id("lecturer_profiles")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    // Fetch allocations matching groups (and optional lecturer)
    const all: any[] = [];
    for (const gid of args.groupIds) {
      const rows = await ctx.db
        .query("group_allocations" as any)
        .withIndex("by_group" as any, (q) =>
          (q as any).eq("groupId", gid as any),
        )
        .collect();
      all.push(...rows);
    }
    const filtered = args.lecturerId
      ? all.filter((a) => String(a.lecturerId) === String(args.lecturerId))
      : all;
    for (const a of filtered) {
      // Authorize per allocation org
      await requireOrgPermission(
        ctx as any,
        identity.subject,
        "allocations.assign",
        (a as any).organisationId,
      );
      await ctx.db.delete(a._id);
    }
    return filtered.map((a) => a._id);
  },
});

// Iteration allocations summary
export const iterationSummary = query({
  args: { moduleIterationId: v.id("module_iterations") },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query("module_groups" as any)
      .withIndex("by_iteration" as any, (q) =>
        (q as any).eq("moduleIterationId", args.moduleIterationId as any),
      )
      .collect();
    const allocations: any[] = [];
    for (const g of groups) {
      const rows = await ctx.db
        .query("group_allocations" as any)
        .withIndex("by_group" as any, (q) =>
          (q as any).eq("groupId", (g as any)._id as any),
        )
        .collect();
      allocations.push(...rows);
    }
    const totals = computeTotals(allocations as any);
    return {
      groupCount: groups.length,
      allocationCount: allocations.length,
      ...totals,
    };
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

    // Get lecturer details for audit
    const lecturer = await ctx.db.get(existing.lecturerId);
    const group = await ctx.db.get(existing.groupId);

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
        details: `Removed lecturer ${lecturer?.fullName || String(existing.lecturerId)} from group ${group?.name || String(existing.groupId)} (${existing.type} allocation)`,
        severity: "warning",
      });
    } catch {}

    return args.allocationId;
  },
});

// Get lecturer totals for a specific lecturer in a specific academic year
export const getLecturerTotals = query({
  args: {
    lecturerId: v.id("lecturer_profiles"),
    academicYearId: v.id("academic_years"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return null;

    // Permission: allocations.view within lecturer's org
    const lecturer = await ctx.db.get(args.lecturerId);
    if (!lecturer) return null;

    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "allocations.view",
      (lecturer as any).organisationId,
    );

    const allocations = (await ctx.db
      .query("group_allocations" as any)
      .withIndex("by_lecturer" as any, (q) =>
        (q as any).eq("lecturerId", args.lecturerId as any),
      )
      .filter((q) =>
        (q as any).eq((q as any).field("academicYearId"), args.academicYearId),
      )
      .collect()) as any[];

    const totals = computeTotals(allocations as any);

    return {
      lecturerId: args.lecturerId,
      academicYearId: args.academicYearId,
      ...totals,
      allocationCount: allocations.length,
    };
  },
});

// Get module teaching hours for preview
export const getModuleTeachingHours = query({
  args: {
    groupId: v.id("module_groups"),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    const iteration = await ctx.db.get(group.moduleIterationId);
    if (!iteration) return null;

    const moduleDoc = await ctx.db.get(iteration.moduleId);
    if (!moduleDoc) return null;

    const baseHours = computeHoursFromCredits((moduleDoc as any)?.credits);

    return {
      moduleName: (moduleDoc as any)?.name || "Unknown Module",
      moduleCode: (moduleDoc as any)?.code || "Unknown",
      credits: (moduleDoc as any)?.credits || 0,
      computedHours: baseHours,
      totalHours: (iteration as any)?.totalHours || 0,
    };
  },
});

// ===== Admin allocations (per-lecturer, per AY) =====

export const listAdminAllocations = query({
  args: {
    lecturerId: v.id("lecturer_profiles"),
    academicYearId: v.id("academic_years"),
  },
  handler: async (ctx, args) => {
    // derive org via lecturer profile
    const lecturer = await ctx.db.get(args.lecturerId);
    if (!lecturer) return [];
    const rows = await ctx.db
      .query("admin_allocations" as any)
      .withIndex("by_year" as any, (q) =>
        (q as any).eq("academicYearId", args.academicYearId as any),
      )
      .filter((q) =>
        (q as any).eq((q as any).field("staffId"), String(args.lecturerId)),
      )
      .collect();
    // join category names
    const categories = await Promise.all(
      rows.map((r: any) => ctx.db.get(r.categoryId)),
    );
    return rows.map((r: any, i: number) => ({
      allocation: r,
      category: categories[i],
    }));
  },
});

export const listAdminCategories = query({
  args: {},
  handler: async (ctx) => {
    const cats = await ctx.db
      .query("admin_allocation_categories" as any)
      .order("asc")
      .collect();
    return cats;
  },
});

export const upsertAdminCategory = mutation({
  args: {
    id: v.optional(v.id("admin_allocation_categories")),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    await requirePermission(ctx as any, identity.subject, "permissions.manage");
    const now = Date.now();
    if (args.id) {
      await ctx.db.patch(args.id, {
        name: args.name,
        ...(args.description !== undefined
          ? { description: args.description }
          : {}),
        updatedAt: now,
      } as any);
      return args.id;
    }
    const id = await ctx.db.insert(
      "admin_allocation_categories" as any,
      {
        name: args.name,
        ...(args.description ? { description: args.description } : {}),
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      } as any,
    );
    return id as Id<"admin_allocation_categories">;
  },
});

export const removeAdminCategory = mutation({
  args: { id: v.id("admin_allocation_categories") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    await requirePermission(ctx as any, identity.subject, "permissions.manage");
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const upsertAdminAllocation = mutation({
  args: {
    lecturerId: v.id("lecturer_profiles"),
    academicYearId: v.id("academic_years"),
    categoryId: v.string(),
    hours: v.number(),
    allocationId: v.optional(v.id("admin_allocations")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    // Check org scope via lecturer
    const lecturer = await ctx.db.get(args.lecturerId);
    if (!lecturer) throw new Error("Lecturer not found");
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "allocations.assign",
      (lecturer as any).organisationId,
    );

    // Validate hours
    if (args.hours < 0 || args.hours > 1000)
      throw new Error("Hours must be between 0 and 1000");

    const now = Date.now();
    if (args.allocationId) {
      await ctx.db.patch(args.allocationId, {
        categoryId: args.categoryId as any,
        hours: args.hours,
        updatedAt: now,
      } as any);
      return args.allocationId;
    }
    const id = await ctx.db.insert(
      "admin_allocations" as any,
      {
        staffId: String(args.lecturerId),
        categoryId: args.categoryId,
        hours: args.hours,
        academicYearId: args.academicYearId,
        createdAt: now,
        updatedAt: now,
      } as any,
    );
    return id as Id<"admin_allocations">;
  },
});

export const removeAdminAllocation = mutation({
  args: { allocationId: v.id("admin_allocations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const existing = await ctx.db.get(args.allocationId);
    if (!existing) return args.allocationId;
    // Authorise via org from lecturer profile id stored as staffId (string)
    const lecturer = await ctx.db.get(existing.staffId as any);
    if (lecturer) {
      await requireOrgPermission(
        ctx as any,
        identity.subject,
        "allocations.assign",
        (lecturer as any).organisationId,
      );
    }
    await ctx.db.delete(args.allocationId);
    return args.allocationId;
  },
});
