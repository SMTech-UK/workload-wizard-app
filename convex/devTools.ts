import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { ensureDefaultsForOrg } from "./permissions";

const DEMO_ORG_CODE = "DEMO_ORG";

function isDevRuntime() {
  return process.env.NODE_ENV !== "production";
}

export const resetDemoData = mutation({
  args: {
    performedBy: v.optional(v.string()),
  },
  handler: async (ctx) => {
    if (!isDevRuntime()) throw new Error("resetDemoData only allowed in dev");

    // Find demo org
    const demoOrg = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("code"), DEMO_ORG_CODE))
      .first();

    if (!demoOrg) return { deleted: 0 };

    const orgId = demoOrg._id as Id<"organisations">;

    // Tables with organisationId field to delete from
    const tablesWithOrg: Array<keyof (typeof ctx.db)["query"]> = [
      "academic_years",
      "courses",
      "modules",
      "lecturer_profiles",
      "group_allocations",
      "organisationFlagOverrides",
      "user_roles",
      "user_role_assignments",
    ] as any;

    let deleted = 0;

    // Delete dependent/join records first
    const byForeignOrg: Array<keyof (typeof ctx.db)["query"]> = [
      "course_years",
      "course_year_modules",
      "module_iterations",
      "module_groups",
      "admin_allocations",
      "organisation_role_permissions",
      "user_preferences",
    ] as any;

    for (const tbl of byForeignOrg) {
      const rows = await ctx.db.query(tbl as any).collect();
      for (const r of rows) {
        // Filter by nested org relationships we can cheaply check
        if (
          (tbl === "admin_allocations" && r.academicYearId) ||
          (tbl === "module_iterations" && r.academicYearId)
        ) {
          const year = await ctx.db.get(r.academicYearId);
          if (year && String(year.organisationId) === String(orgId)) {
            await ctx.db.delete(r._id);
            deleted++;
          }
          continue;
        }

        if (tbl === "course_years") {
          const course = await ctx.db.get(r.courseId);
          if (course && String(course.organisationId) === String(orgId)) {
            await ctx.db.delete(r._id);
            deleted++;
          }
          continue;
        }

        if (tbl === "course_year_modules") {
          const cy = await ctx.db.get(r.courseYearId);
          if (!cy) continue;
          const course = await ctx.db.get(cy.courseId);
          if (course && String(course.organisationId) === String(orgId)) {
            await ctx.db.delete(r._id);
            deleted++;
          }
          continue;
        }

        if (tbl === "module_groups") {
          const it = await ctx.db.get(r.moduleIterationId);
          if (!it) continue;
          const year = await ctx.db.get(it.academicYearId);
          if (year && String(year.organisationId) === String(orgId)) {
            await ctx.db.delete(r._id);
            deleted++;
          }
          continue;
        }

        if (tbl === "organisation_role_permissions") {
          if (String(r.organisationId) === String(orgId)) {
            await ctx.db.delete(r._id);
            deleted++;
          }
          continue;
        }

        if (tbl === "user_preferences") {
          if (String(r.organisationId) === String(orgId)) {
            await ctx.db.delete(r._id);
            deleted++;
          }
        }
      }
    }

    for (const tbl of tablesWithOrg) {
      const rows = await ctx.db
        .query(tbl as any)
        .filter((q) => q.eq(q.field("organisationId"), orgId))
        .collect();
      for (const r of rows) {
        await ctx.db.delete(r._id);
        deleted++;
      }
    }

    // Soft-delete the org itself last
    await ctx.db.patch(orgId, { isActive: false, status: "inactive" });
    return { deleted };
  },
});

export const seedDemoData = mutation({
  args: {
    performedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isDevRuntime()) throw new Error("seedDemoData only allowed in dev");

    const now = Date.now();

    // 1) Ensure DEMO org
    let demoOrg = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("code"), DEMO_ORG_CODE))
      .first();
    let orgId: Id<"organisations">;
    if (!demoOrg) {
      orgId = await ctx.db.insert("organisations", {
        name: "OrgA (Demo)",
        code: DEMO_ORG_CODE,
        isActive: true,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      demoOrg = await ctx.db.get(orgId);
    } else if (!demoOrg.isActive || demoOrg.status !== "active") {
      await ctx.db.patch(demoOrg._id, {
        isActive: true,
        status: "active",
        updatedAt: now,
      });
    }
    orgId = demoOrg!._id as Id<"organisations">;

    // 2) Ensure default roles for org
    await ensureDefaultsForOrg(ctx as any, orgId);

    // 3) Academic Years (25/26 published default, 26/27 draft)
    const upsertYear = async (
      name: string,
      status: "draft" | "published",
      isDefaultForOrg: boolean,
    ) => {
      let row = await ctx.db
        .query("academic_years")
        .withIndex("by_organisation", (q) =>
          q.eq("organisationId" as any, orgId as any),
        )
        .filter((q) => q.eq(q.field("name"), name))
        .first();
      if (!row) {
        const id = await ctx.db.insert("academic_years", {
          name,
          startDate: name.startsWith("2025") ? "2025-08-01" : "2026-08-01",
          endDate: name.startsWith("2025") ? "2026-07-31" : "2027-07-31",
          isActive: true,
          staging: status !== "published",
          organisationId: orgId,
          status,
          isDefaultForOrg,
          createdAt: now,
          updatedAt: now,
        });
        row = await ctx.db.get(id);
      } else if (
        row.isDefaultForOrg !== isDefaultForOrg ||
        row.status !== status
      ) {
        await ctx.db.patch(row._id, {
          status,
          isDefaultForOrg,
          staging: status !== "published",
          updatedAt: now,
        });
      }
      return row!;
    };

    const y2526 = await upsertYear("2025/26", "published", true);
    const y2627 = await upsertYear("2026/27", "draft", false);

    // 4) Courses (3) + Year 1
    const courseDefs = [
      { code: "C101", name: "Computer Science BSc" },
      { code: "C102", name: "Data Science BSc" },
      { code: "C103", name: "Software Eng BEng" },
    ];
    const courseIds: Id<"courses">[] = [];
    for (const c of courseDefs) {
      let course = await ctx.db
        .query("courses")
        .withIndex("by_organisation", (q) =>
          q.eq("organisationId" as any, orgId as any),
        )
        .filter((q) => q.eq(q.field("code"), c.code))
        .first();
      if (!course) {
        const id = await ctx.db.insert("courses", {
          code: c.code,
          name: c.name,
          organisationId: orgId,
          createdAt: now,
          updatedAt: now,
        });
        course = await ctx.db.get(id);
      }
      // Ensure Year 1
      const cy1 = await ctx.db
        .query("course_years")
        .withIndex("by_course", (q) =>
          q.eq("courseId" as any, course!._id as any),
        )
        .filter((q) => q.eq(q.field("yearNumber"), 1))
        .first();
      if (!cy1) {
        await ctx.db.insert("course_years", {
          courseId: course!._id,
          yearNumber: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
      courseIds.push(course!._id as Id<"courses">);
    }

    // 5) Modules (5) with credits
    const moduleDefs = [
      { code: "M101", name: "Intro to Programming", credits: 20 },
      { code: "M102", name: "Algorithms", credits: 20 },
      { code: "M103", name: "Databases", credits: 10 },
      { code: "M104", name: "Web Development", credits: 10 },
      { code: "M105", name: "AI Fundamentals", credits: 20 },
    ];
    const moduleIds: Id<"modules">[] = [];
    for (const m of moduleDefs) {
      let mod = await ctx.db
        .query("modules")
        .withIndex("by_organisation", (q) =>
          q.eq("organisationId" as any, orgId as any),
        )
        .filter((q) => q.eq(q.field("code"), m.code))
        .first();
      if (!mod) {
        const id = await ctx.db.insert("modules", {
          code: m.code,
          name: m.name,
          credits: m.credits,
          organisationId: orgId,
          createdAt: now,
          updatedAt: now,
        });
        mod = await ctx.db.get(id);
      } else if (mod.credits !== m.credits) {
        await ctx.db.patch(mod._id, { credits: m.credits, updatedAt: now });
      }
      moduleIds.push(mod!._id as Id<"modules">);
    }

    // 6) Attach modules to C101 Year 1
    const c101 = await ctx.db
      .query("courses")
      .withIndex("by_organisation", (q) =>
        q.eq("organisationId" as any, orgId as any),
      )
      .filter((q) => q.eq(q.field("code"), "C101"))
      .first();
    const c101y1 = await ctx.db
      .query("course_years")
      .withIndex("by_course", (q) => q.eq("courseId" as any, c101!._id as any))
      .filter((q) => q.eq(q.field("yearNumber"), 1))
      .first();
    if (c101y1) {
      for (const mid of moduleIds) {
        const exists = await ctx.db
          .query("course_year_modules")
          .withIndex("by_course_year_module", (q) =>
            q
              .eq("courseYearId" as any, c101y1._id as any)
              .eq("moduleId" as any, mid as any),
          )
          .first();
        if (!exists) {
          await ctx.db.insert("course_year_modules", {
            courseYearId: c101y1._id,
            moduleId: mid,
            isCore: true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // 7) Iterations in 25/26 for all modules
    const iterationIds: Id<"module_iterations">[] = [];
    for (const mid of moduleIds) {
      let it = await ctx.db
        .query("module_iterations")
        .withIndex("by_module_year", (q) =>
          q
            .eq("moduleId" as any, mid as any)
            .eq("academicYearId" as any, y2526._id as any),
        )
        .first();
      if (!it) {
        const id = await ctx.db.insert("module_iterations", {
          moduleId: mid,
          academicYearId: y2526._id,
          totalHours: 0,
          weeks: [],
          createdAt: now,
          updatedAt: now,
        });
        it = await ctx.db.get(id);
      }
      iterationIds.push(it!._id as Id<"module_iterations">);
    }

    // 8) Create 6 groups across first 3 iterations
    const groupNames = ["A", "B", "C", "D", "E", "F"];
    const groupIds: Id<"module_groups">[] = [];
    for (let i = 0; i < groupNames.length; i++) {
      const iterationId = iterationIds[i % Math.min(3, iterationIds.length)];
      let g = await ctx.db
        .query("module_groups")
        .withIndex("by_iteration", (q) =>
          q.eq("moduleIterationId" as any, iterationId as any),
        )
        .filter((q) => q.eq(q.field("name"), `Group ${groupNames[i]}`))
        .first();
      if (!g) {
        const id = await ctx.db.insert("module_groups", {
          moduleIterationId: iterationId,
          name: `Group ${groupNames[i]}`,
          sizePlanned: 20,
          createdAt: now,
          updatedAt: now,
        });
        g = await ctx.db.get(id);
      }
      groupIds.push(g!._id as Id<"module_groups">);
    }

    // 9) Staff (6) with mixed contracts
    const staffDefs = [
      {
        fullName: "Alice Admin",
        email: "alice.admin@demo.org",
        contract: "FT",
        fte: 1,
        maxTeachingHours: 300,
        totalContract: 1650,
      },
      {
        fullName: "Bob Lecturer",
        email: "bob.lecturer@demo.org",
        contract: "FT",
        fte: 1,
        maxTeachingHours: 300,
        totalContract: 1650,
      },
      {
        fullName: "Cara TA",
        email: "cara.ta@demo.org",
        contract: "PT",
        fte: 0.5,
        maxTeachingHours: 150,
        totalContract: 825,
      },
      {
        fullName: "Dan RA",
        email: "dan.ra@demo.org",
        contract: "PT",
        fte: 0.6,
        maxTeachingHours: 180,
        totalContract: 990,
      },
      {
        fullName: "Eve Lecturer",
        email: "eve.lecturer@demo.org",
        contract: "FT",
        fte: 1,
        maxTeachingHours: 300,
        totalContract: 1650,
      },
      {
        fullName: "Frank AP",
        email: "frank.ap@demo.org",
        contract: "PT",
        fte: 0.4,
        maxTeachingHours: 120,
        totalContract: 660,
      },
    ];
    const lecturerIds: Id<"lecturer_profiles">[] = [];
    for (const s of staffDefs) {
      let p = await ctx.db
        .query("lecturer_profiles")
        .withIndex("by_organisation", (q) =>
          q.eq("organisationId" as any, orgId as any),
        )
        .filter((q) => q.eq(q.field("email"), s.email))
        .first();
      if (!p) {
        const id = await ctx.db.insert("lecturer_profiles", {
          fullName: s.fullName,
          email: s.email,
          contract: s.contract,
          fte: s.fte,
          maxTeachingHours: s.maxTeachingHours,
          totalContract: s.totalContract,
          organisationId: orgId,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        p = await ctx.db.get(id);
      }
      lecturerIds.push(p!._id as Id<"lecturer_profiles">);
    }

    // 10) Allocations: assign lecturerIds to groups in y2526
    // hoursComputed will be derived in UI, but for seed we set baseline and optional overrides
    for (let i = 0; i < groupIds.length; i++) {
      const gid = groupIds[i];
      const lecturerId = lecturerIds[i % lecturerIds.length];
      const group = await ctx.db.get(gid);
      if (!group) continue;
      const iteration = await ctx.db.get(group.moduleIterationId);
      if (!iteration) continue;
      const moduleDoc = await ctx.db.get(iteration.moduleId);
      if (!moduleDoc) continue;

      const existing = await ctx.db
        .query("group_allocations")
        .withIndex("by_group", (q) => q.eq("groupId" as any, gid as any))
        .first();
      if (!existing) {
        await ctx.db.insert(
          "group_allocations" as any,
          {
            groupId: gid,
            lecturerId,
            academicYearId: y2526._id,
            organisationId: orgId,
            type: "teaching",
            hoursComputed:
              typeof (moduleDoc as any).credits === "number"
                ? (moduleDoc as any).credits * 1.0
                : 0,
            hoursOverride: i % 3 === 0 ? 8 : undefined,
            createdAt: now,
            updatedAt: now,
          } as any,
        );
      }
    }

    // 11) Admin allocation category + sample 10h "Module leadership" to one lecturer
    let cat = await ctx.db
      .query("admin_allocation_categories" as any)
      .filter((q) => q.eq(q.field("name"), "Module leadership"))
      .first();
    if (!cat) {
      const id = await ctx.db.insert(
        "admin_allocation_categories" as any,
        {
          name: "Module leadership",
          description: "Module leadership allowance",
          isDefault: false,
          createdAt: now,
          updatedAt: now,
        } as any,
      );
      cat = await ctx.db.get(id);
    }

    const existingAdminAlloc = await ctx.db
      .query("admin_allocations" as any)
      .filter((q) =>
        (q as any).and(
          (q as any).eq((q as any).field("academicYearId"), y2526._id as any),
          (q as any).eq((q as any).field("staffId"), String(lecturerIds[0])),
        ),
      )
      .first();
    if (!existingAdminAlloc) {
      await ctx.db.insert(
        "admin_allocations" as any,
        {
          staffId: String(lecturerIds[0]),
          categoryId: cat!._id,
          hours: 10,
          academicYearId: y2526._id,
          createdAt: now,
          updatedAt: now,
        } as any,
      );
    }

    return {
      organisationId: orgId,
      years: [y2526._id, y2627._id],
      courses: courseIds.length,
      modules: moduleIds.length,
      groups: groupIds.length,
      staff: lecturerIds.length,
    };
  },
});

export const switchMyRoleInDemoOrg = mutation({
  args: {
    roleName: v.string(), // e.g. 'Admin' | 'Lecturer' | 'Manager'
  },
  handler: async (ctx, args) => {
    if (!isDevRuntime())
      throw new Error("switchMyRoleInDemoOrg only allowed in dev");

    const identity = await ctx.auth.getUserIdentity();
    const subject = identity?.subject;
    if (!subject) throw new Error("Unauthenticated");

    let demoOrg = await ctx.db
      .query("organisations")
      .filter((q) => q.eq(q.field("code"), DEMO_ORG_CODE))
      .first();
    if (!demoOrg) throw new Error("Demo org not found. Run seed first.");

    await ensureDefaultsForOrg(ctx as any, demoOrg._id as Id<"organisations">);

    const role = await ctx.db
      .query("user_roles")
      .filter((q) =>
        q.and(
          q.eq(q.field("organisationId"), demoOrg._id),
          q.eq(q.field("name"), args.roleName),
          q.eq(q.field("isActive"), true),
        ),
      )
      .first();
    if (!role) throw new Error(`Role not found in demo org: ${args.roleName}`);

    // Ensure the actor exists as a user row
    let user = await ctx.db
      .query("users")
      .withIndex("by_subject", (q) => q.eq("subject", subject))
      .first();
    if (!user) {
      const uid = await ctx.db.insert("users", {
        email: identity?.email ?? `${subject}@demo.local`,
        givenName: identity?.name ?? "Dev",
        familyName: "User",
        fullName: identity?.name ?? "Dev User",
        systemRoles: [],
        organisationId: demoOrg._id,
        subject,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      user = await ctx.db.get(uid);
    } else if (String(user.organisationId) !== String(demoOrg._id)) {
      await ctx.db.patch(user._id, {
        organisationId: demoOrg._id,
        updatedAt: Date.now(),
      });
    }

    // Upsert assignment
    const existing = await ctx.db
      .query("user_role_assignments")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", subject).eq("organisationId", demoOrg._id),
      )
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        roleId: role._id,
        isActive: true,
        updatedAt: now,
      });
      return { userId: user._id, roleId: role._id, updated: true };
    }
    const aid = await ctx.db.insert("user_role_assignments", {
      userId: subject,
      roleId: role._id,
      organisationId: demoOrg._id,
      assignedBy: subject,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return { userId: user._id, roleId: role._id, assignmentId: aid };
  },
});
