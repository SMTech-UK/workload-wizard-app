import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { writeAudit } from "./audit";
// no-op

// List modules for an organisation (derived from actor)
export const listByOrganisation = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return [];

    const actor = await ctx.db
      .query("users" as any)
      .withIndex("by_subject" as any, (q) =>
        (q as any).eq("subject", identity.subject),
      )
      .first();
    if (!actor) return [];

    const modules = await ctx.db
      .query("modules" as any)
      .withIndex("by_organisation" as any, (q) =>
        (q as any).eq("organisationId", actor.organisationId as any),
      )
      .order("asc")
      .collect();
    return modules;
  },
});

// Create a module in actor's organisation
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    credits: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");

    const actor = await ctx.db
      .query("users" as any)
      .withIndex("by_subject" as any, (q) =>
        (q as any).eq("subject", identity.subject),
      )
      .first();
    if (!actor) throw new Error("User not found");

    // ensure unique code per org
    const existing = await ctx.db
      .query("modules" as any)
      .withIndex("by_organisation" as any, (q) =>
        (q as any).eq("organisationId", actor.organisationId as any),
      )
      .filter((q) => (q as any).eq((q as any).field("code"), args.code))
      .first();
    if (existing)
      throw new Error("Module code already exists in this organisation");

    const now = Date.now();
    const id = await (ctx.db as any).insert("modules", {
      code: args.code,
      name: args.name,
      ...(typeof args.credits === "number" ? { credits: args.credits } : {}),
      organisationId: actor.organisationId,
      createdAt: now,
      updatedAt: now,
    });

    try {
      await writeAudit(ctx, {
        action: "create",
        entityType: "module",
        entityId: String(id),
        entityName: `${args.code} ${args.name}`,
        performedBy: identity.subject,
        organisationId: actor.organisationId,
        details: `Module created (${args.code})`,
        severity: "info",
      });
    } catch {}

    return id;
  },
});

// Update a module
export const update = mutation({
  args: {
    id: v.id("modules"),
    code: v.string(),
    name: v.string(),
    credits: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const moduleDoc = await (ctx.db as any).get(args.id as any);
    if (!moduleDoc) throw new Error("Module not found");
    const now = Date.now();
    await (ctx.db as any).patch(args.id as any, {
      code: args.code,
      name: args.name,
      ...("credits" in args ? { credits: args.credits } : {}),
      updatedAt: now,
    });

    try {
      await writeAudit(ctx, {
        action: "update",
        entityType: "module",
        entityId: String(args.id),
        entityName: `${args.code} ${args.name}`,
        performedBy: identity.subject,
        organisationId: moduleDoc.organisationId,
        details: `Module updated (${args.code})`,
        severity: "info",
      });
    } catch {}

    return args.id;
  },
});

// Delete module
export const remove = mutation({
  args: { id: v.id("modules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const existing = await (ctx.db as any).get(args.id as any);
    if (!existing) return args.id;

    await (ctx.db as any).delete(args.id as any);

    try {
      await writeAudit(ctx, {
        action: "delete",
        entityType: "module",
        entityId: String(args.id),
        entityName: existing.name,
        performedBy: identity.subject,
        organisationId: existing.organisationId,
        details: `Module deleted (${existing.code})`,
        severity: "warning",
      });
    } catch {}

    return args.id;
  },
});

// ===== Linking: Course Year <-> Modules =====

// List modules attached to a specific course year
export const listForCourseYear = query({
  args: { courseYearId: v.id("course_years") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("course_year_modules" as any)
      .withIndex("by_course_year" as any, (q) =>
        (q as any).eq("courseYearId", args.courseYearId as any),
      )
      .collect();

    const modules = await Promise.all(links.map((l) => ctx.db.get(l.moduleId)));

    return links
      .map((l, i) => ({ link: l, module: modules[i] }))
      .filter((m) => Boolean(m.module));
  },
});

// Attach a module to a course year
export const attachToCourseYear = mutation({
  args: {
    courseYearId: v.id("course_years"),
    moduleId: v.id("modules"),
    isCore: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");

    // uniqueness check
    const existing = await ctx.db
      .query("course_year_modules" as any)
      .withIndex("by_course_year_module" as any, (q) =>
        (q as any)
          .eq("courseYearId", args.courseYearId as any)
          .eq("moduleId", args.moduleId as any),
      )
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    const id = await (ctx.db as any).insert("course_year_modules", {
      courseYearId: args.courseYearId,
      moduleId: args.moduleId,
      isCore: args.isCore,
      createdAt: now,
      updatedAt: now,
    });

    // best-effort audit
    try {
      await writeAudit(ctx, {
        action: "link",
        entityType: "course_year_module",
        entityId: String(id),
        performedBy: identity.subject,
        details: `Attached module ${String(args.moduleId)} to course year ${String(args.courseYearId)} (core=${args.isCore})`,
        severity: "info",
      });
    } catch {}

    return id;
  },
});

// Detach a module from a course year
export const detachFromCourseYear = mutation({
  args: {
    courseYearId: v.id("course_years"),
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");

    const existing = await ctx.db
      .query("course_year_modules" as any)
      .withIndex("by_course_year_module" as any, (q) =>
        (q as any)
          .eq("courseYearId", args.courseYearId as any)
          .eq("moduleId", args.moduleId as any),
      )
      .first();
    if (!existing) return null;

    await (ctx.db as any).delete(existing._id as any);

    try {
      await writeAudit(ctx, {
        action: "unlink",
        entityType: "course_year_module",
        entityId: String(existing._id),
        performedBy: identity.subject,
        details: `Detached module ${String(args.moduleId)} from course year ${String(args.courseYearId)}`,
        severity: "info",
      });
    } catch {}

    return existing._id;
  },
});

// ===== Module Iterations (per Academic Year) =====

// Get iteration for a module in a specific academic year
export const getIterationForYear = query({
  args: { moduleId: v.id("modules"), academicYearId: v.id("academic_years") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("module_iterations" as any)
      .withIndex("by_module_year" as any, (q) =>
        (q as any)
          .eq("moduleId", args.moduleId as any)
          .eq("academicYearId", args.academicYearId as any),
      )
      .first();
    return existing ?? null;
  },
});

// Get iteration for the organisation's default academic year
export const getIterationForDefaultYear = query({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return null;
    const actor = await ctx.db
      .query("users" as any)
      .withIndex("by_subject" as any, (q) =>
        (q as any).eq("subject", identity.subject),
      )
      .first();
    if (!actor) return null;

    const defaultYear = await ctx.db
      .query("academic_years" as any)
      .withIndex("by_organisation" as any, (q) =>
        (q as any).eq("organisationId", actor.organisationId as any),
      )
      .filter((q) => (q as any).eq((q as any).field("isDefaultForOrg"), true))
      .first();
    if (!defaultYear) return null;

    const existing = await ctx.db
      .query("module_iterations" as any)
      .withIndex("by_module_year" as any, (q) =>
        (q as any)
          .eq("moduleId", args.moduleId as any)
          .eq("academicYearId", defaultYear._id as any),
      )
      .first();
    return existing ?? null;
  },
});

// Create iteration for a module in a specific academic year
export const createIterationForYear = mutation({
  args: {
    moduleId: v.id("modules"),
    academicYearId: v.id("academic_years"),
    totalHours: v.optional(v.number()),
    weeks: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");

    // Uniqueness
    const existing = await ctx.db
      .query("module_iterations" as any)
      .withIndex("by_module_year" as any, (q) =>
        (q as any)
          .eq("moduleId", args.moduleId as any)
          .eq("academicYearId", args.academicYearId as any),
      )
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    const id = await (ctx.db as any).insert("module_iterations", {
      moduleId: args.moduleId,
      academicYearId: args.academicYearId,
      totalHours: typeof args.totalHours === "number" ? args.totalHours : 0,
      weeks: Array.isArray(args.weeks) ? args.weeks : [],
      createdAt: now,
      updatedAt: now,
    });

    try {
      await writeAudit(ctx, {
        action: "create",
        entityType: "module_iteration",
        entityId: String(id),
        performedBy: identity.subject,
        details: `Created iteration for module ${String(args.moduleId)} in AY ${String(args.academicYearId)}`,
        severity: "info",
      });
    } catch {}

    return id;
  },
});

// Convenience: create iteration for the organisation's default academic year
export const createIterationForDefaultYear = mutation({
  args: { moduleId: v.id("modules"), totalHours: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const actor = await ctx.db
      .query("users" as any)
      .withIndex("by_subject" as any, (q) =>
        (q as any).eq("subject", identity.subject),
      )
      .first();
    if (!actor) throw new Error("User not found");

    const defaultYear = await ctx.db
      .query("academic_years" as any)
      .withIndex("by_organisation" as any, (q) =>
        (q as any).eq("organisationId", actor.organisationId as any),
      )
      .filter((q) => (q as any).eq((q as any).field("isDefaultForOrg"), true))
      .first();

    if (!defaultYear) throw new Error("Default academic year not set for org");

    // Uniqueness
    const existing = await ctx.db
      .query("module_iterations" as any)
      .withIndex("by_module_year" as any, (q) =>
        (q as any)
          .eq("moduleId", args.moduleId as any)
          .eq("academicYearId", defaultYear._id as any),
      )
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    const id = await (ctx.db as any).insert("module_iterations", {
      moduleId: args.moduleId,
      academicYearId: defaultYear._id,
      totalHours: typeof args.totalHours === "number" ? args.totalHours : 0,
      weeks: [],
      createdAt: now,
      updatedAt: now,
    });

    try {
      await writeAudit(ctx, {
        action: "create",
        entityType: "module_iteration",
        entityId: String(id),
        performedBy: identity.subject,
        details: `Created iteration for module ${String(args.moduleId)} in default AY ${String(defaultYear._id)}`,
        severity: "info",
      });
    } catch {}

    return id;
  },
});
