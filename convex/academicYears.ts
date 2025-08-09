import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { type Id, type Doc } from "./_generated/dataModel";
import { requireOrgPermission } from "./permissions";

type YearStatus = "draft" | "published" | "archived";

async function getActor(ctx: QueryCtx | MutationCtx, userId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_subject", (q) => q.eq("subject", userId))
    .first();
  if (!user) throw new Error("Actor not found");
  return user;
}

function isSystemUser(user: Doc<"users">): boolean {
  const systemRoleIds = ["sysadmin", "developer", "dev"]; // do not treat 'admin' as system-wide
  return (
    Array.isArray(user.systemRoles) &&
    user.systemRoles.some((r: string) => systemRoleIds.includes(r))
  );
}

async function hasOrgPermission(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  permissionId: string,
  organisationId: Id<"organisations">,
): Promise<boolean> {
  try {
    await requireOrgPermission(
      ctx,
      userId,
      permissionId,
      organisationId as unknown as string,
    );
    return true;
  } catch {
    return false;
  }
}

async function getActorRole(ctx: QueryCtx | MutationCtx, user: Doc<"users">) {
  const assignment = await ctx.db
    .query("user_role_assignments")
    .withIndex("by_user_org", (q) =>
      q.eq("userId", user.subject).eq("organisationId", user.organisationId),
    )
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();
  if (!assignment) return null;
  const role = await ctx.db.get(assignment.roleId);
  return role ?? null;
}

export async function canViewYear(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  year: Doc<"academic_years">,
) {
  const user = await getActor(ctx, userId);
  if (isSystemUser(user)) return true;
  if (String(user.organisationId) !== String(year.organisationId)) return false;
  const orgId = year.organisationId as Id<"organisations">;
  if (year.status === "archived") {
    return hasOrgPermission(ctx, userId, "year.view.archived", orgId);
  }
  if (year.staging || year.status === "draft") {
    return hasOrgPermission(ctx, userId, "year.view.staging", orgId);
  }
  // live (published and not staged)
  return hasOrgPermission(ctx, userId, "year.view.live", orgId);
}

export async function canEditYear(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  yearOrOrgId: Doc<"academic_years"> | Id<"organisations">,
) {
  const user = await getActor(ctx, userId);
  if (isSystemUser(user)) return true;
  const organisationId = (
    typeof yearOrOrgId === "string"
      ? (yearOrOrgId as unknown as Id<"organisations">)
      : (yearOrOrgId as Doc<"academic_years">).organisationId
  ) as Id<"organisations">;
  if (String(user.organisationId) !== String(organisationId)) return false;
  return hasOrgPermission(ctx, userId, "year.edit", organisationId);
}

export const listForOrganisation = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getActor(ctx, args.userId);
    const orgId = user.organisationId as Id<"organisations">;
    const canLive =
      isSystemUser(user) ||
      (await hasOrgPermission(ctx, args.userId, "year.view.live", orgId));
    const canStaging =
      isSystemUser(user) ||
      (await hasOrgPermission(ctx, args.userId, "year.view.staging", orgId));
    const canArchived =
      isSystemUser(user) ||
      (await hasOrgPermission(ctx, args.userId, "year.view.archived", orgId));

    if (!canLive && !canStaging && !canArchived) return [];

    const rows = await ctx.db
      .query("academic_years")
      .withIndex("by_organisation", (q) =>
        q.eq("organisationId", user.organisationId),
      )
      .filter((q) => {
        const liveCond = q.and(
          q.eq(q.field("status"), "published"),
          q.eq(q.field("staging"), false),
        );
        const stagingCond = q.or(
          q.eq(q.field("staging"), true),
          q.eq(q.field("status"), "draft"),
        );
        const archivedCond = q.eq(q.field("status"), "archived");
        const clauses: any[] = [];
        if (canLive) clauses.push(liveCond);
        if (canStaging) clauses.push(stagingCond);
        if (canArchived) clauses.push(archivedCond);
        // at least one is true by earlier guard
        return clauses.length === 1 ? clauses[0] : q.or(...clauses);
      })
      .collect();
    return rows;
  },
});

export const getById = query({
  args: { userId: v.string(), id: v.id("academic_years") },
  handler: async (ctx, args) => {
    const year = await ctx.db.get(args.id);
    if (!year) throw new Error("Academic year not found");
    const ok = await canViewYear(ctx, args.userId, year);
    if (!ok) throw new Error("Permission denied");
    return year;
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    isDefaultForOrg: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getActor(ctx, args.userId);
    const now = Date.now();
    const canCreateStaged =
      isSystemUser(user) ||
      (await hasOrgPermission(
        ctx,
        args.userId,
        "year.edit.staging",
        user.organisationId as Id<"organisations">,
      ));
    if (!canCreateStaged) throw new Error("Permission denied");
    const status: YearStatus = (args.status ?? "draft") as YearStatus;
    if (args.isDefaultForOrg) {
      const existingDefaults = await ctx.db
        .query("academic_years")
        .withIndex("by_organisation", (q) =>
          q.eq("organisationId", user.organisationId),
        )
        .filter((q) => q.eq(q.field("isDefaultForOrg"), true))
        .collect();
      for (const row of existingDefaults) {
        await ctx.db.patch(row._id, { isDefaultForOrg: false, updatedAt: now });
      }
    }
    const id = await ctx.db.insert("academic_years", {
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      isActive: true,
      staging: true,
      organisationId: user.organisationId,
      status,
      isDefaultForOrg: !!args.isDefaultForOrg,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    userId: v.string(),
    id: v.id("academic_years"),
    name: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    isDefaultForOrg: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const year = await ctx.db.get(args.id);
    if (!year) throw new Error("Academic year not found");
    const state: "archived" | "live" | "staging" =
      year.status === "archived"
        ? "archived"
        : year.staging || year.status === "draft"
          ? "staging"
          : "live";
    const can =
      isSystemUser(await getActor(ctx, args.userId)) ||
      (await hasOrgPermission(
        ctx,
        args.userId,
        `year.edit.${state}`,
        year.organisationId as Id<"organisations">,
      ));
    if (!can) throw new Error("Permission denied");

    const now = Date.now();
    const updates: Partial<Doc<"academic_years">> = { updatedAt: now } as any;
    if (typeof args.name !== "undefined") (updates as any).name = args.name;
    if (typeof args.startDate !== "undefined")
      (updates as any).startDate = args.startDate;
    if (typeof args.endDate !== "undefined")
      (updates as any).endDate = args.endDate;
    if (typeof args.isDefaultForOrg !== "undefined") {
      (updates as any).isDefaultForOrg = args.isDefaultForOrg;
      if (args.isDefaultForOrg) {
        const others = await ctx.db
          .query("academic_years")
          .withIndex("by_organisation", (q) =>
            q.eq("organisationId", year.organisationId),
          )
          .filter((q) => q.eq(q.field("isDefaultForOrg"), true))
          .collect();
        for (const other of others) {
          if (String(other._id) !== String(year._id)) {
            await ctx.db.patch(other._id, {
              isDefaultForOrg: false,
              updatedAt: now,
            });
          }
        }
      }
    }
    await ctx.db.patch(args.id, updates as any);
    return args.id;
  },
});

export const setStatus = mutation({
  args: {
    userId: v.string(),
    id: v.id("academic_years"),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
  },
  handler: async (ctx, args) => {
    const year = await ctx.db.get(args.id);
    if (!year) throw new Error("Academic year not found");
    const orgId = year.organisationId as Id<"organisations">;
    // require permission for the TARGET state
    const requiredPerm: string =
      args.status === "archived"
        ? "year.edit.archived"
        : args.status === "published"
          ? "year.edit.live"
          : "year.edit.staging";
    const can =
      isSystemUser(await getActor(ctx, args.userId)) ||
      (await hasOrgPermission(ctx, args.userId, requiredPerm, orgId));
    if (!can) throw new Error("Permission denied");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: args.status as YearStatus,
      updatedAt: now,
    });
    return args.id;
  },
});
