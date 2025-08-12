import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { writeAudit } from "./audit";
import { requireOrgPermission } from "./permissions";

// List courses for an organisation
export const listByOrganisation = query({
  args: { organisationId: v.id("organisations") },
  handler: async (ctx, args) => {
    // Only allow listing courses in your own organisation (or system roles)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return [];
    const actor = await ctx.db
      .query("users" as any)
      .withIndex("by_subject" as any, (q) =>
        (q as any).eq("subject", identity.subject),
      )
      .first();
    if (!actor) return [];
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "courses.view",
      args.organisationId as any,
    );
    const courses = await ctx.db
      .query("courses" as any)
      .withIndex("by_organisation" as any, (q) =>
        (q as any).eq("organisationId", args.organisationId as any),
      )
      .order("asc")
      .collect();
    return courses;
  },
});

// List courses for the authenticated actor's organisation (no args)
export const listForActor = query({
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
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "courses.view",
      actor.organisationId as any,
    );
    const courses = await ctx.db
      .query("courses" as any)
      .withIndex("by_organisation" as any, (q) =>
        (q as any).eq("organisationId", actor.organisationId as any),
      )
      .order("asc")
      .collect();
    return courses;
  },
});

// Get a single course
export const getById = query({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await (ctx.db as any).get(args.id as any);
    return course;
  },
});

// Create a new course in the actor's organisation
export const create = mutation({
  args: {
    code: v.string(),
    name: v.string(),
    leaderProfileId: v.optional(v.id("lecturer_profiles")),
    studentCount: v.optional(v.number()),
    campuses: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");

    // derive organisation from actor
    const actor = await ctx.db
      .query("users" as any)
      .withIndex("by_subject" as any, (q) =>
        (q as any).eq("subject", identity.subject),
      )
      .first();
    if (!actor) throw new Error("User not found");

    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "courses.create",
      actor.organisationId as any,
    );

    // Check uniqueness of code within organisation
    const existing = await ctx.db
      .query("courses" as any)
      .withIndex("by_organisation" as any, (q) =>
        (q as any).eq("organisationId", actor.organisationId as any),
      )
      .filter((q) => (q as any).eq((q as any).field("code"), args.code))
      .first();
    if (existing) {
      throw new Error("Course code already exists in this organisation");
    }

    const id = await (ctx.db as any).insert("courses", {
      code: args.code,
      name: args.name,
      organisationId: actor.organisationId,
      ...(args.leaderProfileId
        ? { leaderProfileId: args.leaderProfileId }
        : {}),
      ...(typeof args.studentCount === "number"
        ? { studentCount: args.studentCount }
        : {}),
      ...(args.campuses && args.campuses.length > 0
        ? { campuses: args.campuses }
        : {}),
      createdAt: now,
      updatedAt: now,
    });

    try {
      await writeAudit(ctx, {
        action: "create",
        entityType: "course",
        entityId: String(id),
        entityName: `${args.code} ${args.name}`,
        performedBy: identity.subject,
        organisationId: actor.organisationId,
        details: `Course created (${args.code})`,
        severity: "info",
      });
    } catch {}

    return id;
  },
});

// Update course
export const update = mutation({
  args: {
    id: v.id("courses"),
    code: v.string(),
    name: v.string(),
    leaderProfileId: v.optional(v.id("lecturer_profiles")),
    studentCount: v.optional(v.number()),
    campuses: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const course = await (ctx.db as any).get(args.id as any);
    if (!course) throw new Error("Course not found");

    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "courses.edit",
      course.organisationId as any,
    );

    // Uniqueness: prevent duplicate codes within the same organisation if code changed
    if (args.code !== course.code) {
      const conflict = await ctx.db
        .query("courses" as any)
        .withIndex("by_organisation" as any, (q) =>
          (q as any).eq("organisationId", course.organisationId as any),
        )
        .filter((q) => (q as any).eq((q as any).field("code"), args.code))
        .first();
      if (conflict && String(conflict._id) !== String(args.id)) {
        throw new Error("Course code already exists in this organisation");
      }
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      code: args.code,
      name: args.name,
      updatedAt: now,
    };
    if ("leaderProfileId" in args)
      updates.leaderProfileId = args.leaderProfileId;
    if ("studentCount" in args) updates.studentCount = args.studentCount;
    if ("campuses" in args) updates.campuses = args.campuses;
    await (ctx.db as any).patch(args.id as any, updates);

    try {
      await writeAudit(ctx, {
        action: "update",
        entityType: "course",
        entityId: String(args.id),
        entityName: `${args.code} ${args.name}`,
        performedBy: identity.subject,
        organisationId: course.organisationId,
        details: `Course updated (${args.code})`,
        severity: "info",
      });
    } catch {}

    return args.id;
  },
});

// Delete course
export const remove = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const existing = await (ctx.db as any).get(args.id as any);
    if (!existing) return args.id;

    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "courses.delete",
      existing.organisationId as any,
    );

    await (ctx.db as any).delete(args.id as any);

    try {
      await writeAudit(ctx, {
        action: "delete",
        entityType: "course",
        entityId: String(args.id),
        entityName: existing.name,
        performedBy: identity.subject,
        organisationId: existing.organisationId,
        details: `Course deleted (${existing.code})`,
        severity: "warning",
      });
    } catch {}

    return args.id;
  },
});

// ===== Course Years =====

// List years for a course
export const listYears = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const course = await (ctx.db as any).get(args.courseId as any);
    if (!course) return [];
    // Permission: courses.view (same org as course)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return [];
    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "courses.view",
      course.organisationId as any,
    );
    const years = await ctx.db
      .query("course_years" as any)
      .withIndex("by_course" as any, (q) =>
        (q as any).eq("courseId", args.courseId as any),
      )
      .order("asc")
      .collect();
    return years;
  },
});

// Check if a course code is available within the actor's organisation
export const isCodeAvailable = query({
  args: { code: v.string(), excludeId: v.optional(v.id("courses")) },
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
      .query("courses" as any)
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

// Add a year to a course
export const addYear = mutation({
  args: { courseId: v.id("courses"), yearNumber: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) throw new Error("Unauthenticated");
    const course = await (ctx.db as any).get(args.courseId as any);
    if (!course) throw new Error("Course not found");

    await requireOrgPermission(
      ctx as any,
      identity.subject,
      "courses.years.add",
      course.organisationId as any,
    );

    // Ensure unique yearNumber per course
    const exists = await ctx.db
      .query("course_years" as any)
      .withIndex("by_course" as any, (q) =>
        (q as any).eq("courseId", args.courseId as any),
      )
      .filter((q) =>
        (q as any).eq((q as any).field("yearNumber"), args.yearNumber),
      )
      .first();
    if (exists) throw new Error("Year already exists for this course");

    const now = Date.now();
    const id = await (ctx.db as any).insert("course_years", {
      courseId: args.courseId,
      yearNumber: args.yearNumber,
      createdAt: now,
      updatedAt: now,
    });

    try {
      await writeAudit(ctx, {
        action: "create",
        entityType: "course_year",
        entityId: String(id),
        entityName: `${course.code} Y${args.yearNumber}`,
        performedBy: identity.subject,
        organisationId: course.organisationId,
        details: `Year ${args.yearNumber} added to course ${course.code}`,
        severity: "info",
      });
    } catch {}

    return id;
  },
});
