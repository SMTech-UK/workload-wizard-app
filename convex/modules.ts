import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { writeAudit } from "./audit";
import { requireOrgPermission } from "./permissions";
// Get module by id
export const getById = query({
  args: { id: v.id("modules") },
  handler: async (ctx, args) => {
    const mod = await (ctx.db as any).get(args.id as any);
    return mod ?? null;
  },
});

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

    // Permission: modules.view in actor's org
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "modules.view",
      actor.organisationId as any,
    );

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
    leaderProfileId: v.optional(v.id("lecturer_profiles")),
    level: v.optional(v.number()),
    teachingHours: v.optional(v.number()),
    markingHours: v.optional(v.number()),
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

    // Permission: modules.create in actor's org
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "modules.create",
      actor.organisationId as any,
    );

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

    // Compute default hours from org settings if not provided and credits present
    let teachingHours = args.teachingHours;
    let markingHours = args.markingHours;
    if (
      (teachingHours === undefined || markingHours === undefined) &&
      typeof args.credits === "number"
    ) {
      const settings = await ctx.db
        .query("organisation_settings" as any)
        .withIndex("by_organisation" as any, (q) =>
          (q as any).eq("organisationId", actor.organisationId as any),
        )
        .first();
      const mapping = settings?.moduleHoursByCredits as
        | Array<{ credits: number; teaching: number; marking: number }>
        | undefined;
      const match = mapping?.find((m) => m.credits === args.credits);
      if (match) {
        teachingHours = teachingHours ?? match.teaching;
        markingHours = markingHours ?? match.marking;
      }
    }

    const now = Date.now();
    const id = await (ctx.db as any).insert("modules", {
      code: args.code,
      name: args.name,
      ...(typeof args.credits === "number" ? { credits: args.credits } : {}),
      ...(args.leaderProfileId
        ? { leaderProfileId: args.leaderProfileId }
        : {}),
      ...(typeof args.level === "number" ? { level: args.level } : {}),
      ...(typeof teachingHours === "number" ? { teachingHours } : {}),
      ...(typeof markingHours === "number" ? { markingHours } : {}),
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
    leaderProfileId: v.optional(v.id("lecturer_profiles")),
    level: v.optional(v.number()),
    teachingHours: v.optional(v.number()),
    markingHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const moduleDoc = await (ctx.db as any).get(args.id as any);
    if (!moduleDoc) throw new Error("Module not found");

    // Permission: modules.edit in actor's org
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "modules.edit",
      moduleDoc.organisationId as any,
    );

    // Uniqueness: prevent duplicate codes within the same organisation if code changed
    if (args.code !== moduleDoc.code) {
      const conflict = await ctx.db
        .query("modules" as any)
        .withIndex("by_organisation" as any, (q) =>
          (q as any).eq("organisationId", moduleDoc.organisationId as any),
        )
        .filter((q) => (q as any).eq((q as any).field("code"), args.code))
        .first();
      if (conflict && String(conflict._id) !== String(args.id)) {
        throw new Error("Module code already exists in this organisation");
      }
    }
    const now = Date.now();
    await (ctx.db as any).patch(args.id as any, {
      code: args.code,
      name: args.name,
      ...("credits" in args ? { credits: args.credits } : {}),
      ...("leaderProfileId" in args && args.leaderProfileId
        ? { leaderProfileId: args.leaderProfileId }
        : {}),
      ...("level" in args ? { level: args.level } : {}),
      ...("teachingHours" in args ? { teachingHours: args.teachingHours } : {}),
      ...("markingHours" in args ? { markingHours: args.markingHours } : {}),
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

    // Permission: modules.delete in actor's org
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "modules.delete",
      existing.organisationId as any,
    );

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

// Check if a module code is available within the actor's organisation
export const isCodeAvailable = query({
  args: { code: v.string(), excludeId: v.optional(v.id("modules")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return { available: false };

    // Derive organisation from actor
    const actor = await ctx.db
      .query("users" as any)
      .withIndex("by_subject" as any, (q) =>
        (q as any).eq("subject", identity.subject),
      )
      .first();
    if (!actor) return { available: false };

    const existing = await ctx.db
      .query("modules" as any)
      .withIndex("by_organisation" as any, (q) =>
        (q as any).eq("organisationId", actor.organisationId as any),
      )
      .filter((q) => (q as any).eq((q as any).field("code"), args.code))
      .first();

    if (!existing) return { available: true };
    if (args.excludeId && String(existing._id) === String(args.excludeId)) {
      return { available: true };
    }
    return { available: false };
  },
});

// ===== Linking: Course Year <-> Modules =====

// List modules attached to a specific course year
export const listForCourseYear = query({
  args: { courseYearId: v.id("course_years") },
  handler: async (ctx, args) => {
    // Validate access by ensuring actor can view modules in org of the course
    const courseYear = await (ctx.db as any).get(args.courseYearId as any);
    if (!courseYear) return [];
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

    // Permission: modules.link (org derived via course -> course.organisationId)
    const courseYear = await (ctx.db as any).get(args.courseYearId as any);
    if (!courseYear) throw new Error("Course year not found");
    const course = await (ctx.db as any).get(courseYear.courseId as any);
    if (!course) throw new Error("Course not found");
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "modules.link",
      course.organisationId as any,
    );

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

    // Permission: modules.unlink
    const courseYear = await (ctx.db as any).get(args.courseYearId as any);
    if (!courseYear) throw new Error("Course year not found");
    const course = await (ctx.db as any).get(courseYear.courseId as any);
    if (!course) throw new Error("Course not found");
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "modules.unlink",
      course.organisationId as any,
    );

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
    // Permission: iterations.view via module's org
    const moduleDoc = await (ctx.db as any).get(args.moduleId as any);
    if (!moduleDoc) return null;
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

    // Permission: iterations.create in module's org
    const moduleDoc = await (ctx.db as any).get(args.moduleId as any);
    if (!moduleDoc) throw new Error("Module not found");
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "iterations.create",
      moduleDoc.organisationId as any,
    );

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
    // Permission: iterations.create in module's org
    const moduleDoc = await (ctx.db as any).get(args.moduleId as any);
    if (!moduleDoc) throw new Error("Module not found");
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "iterations.create",
      moduleDoc.organisationId as any,
    );

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

// Get a specific iteration by ID
export const getIterationById = query({
  args: { id: v.id("module_iterations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update a module iteration
export const updateIteration = mutation({
  args: {
    id: v.id("module_iterations"),
    totalHours: v.optional(v.number()),
    weeks: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Iteration not found");
    const moduleDoc = await ctx.db.get((existing as any).moduleId);
    if (!moduleDoc) throw new Error("Module not found");
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "iterations.edit",
      (moduleDoc as any).organisationId,
    );
    const updates: any = { updatedAt: Date.now() };
    if ("totalHours" in args) updates.totalHours = args.totalHours ?? 0;
    if ("weeks" in args && Array.isArray(args.weeks))
      updates.weeks = args.weeks;
    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});
