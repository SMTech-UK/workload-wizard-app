import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { requirePermission } from "./permissions";

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
  const systemRoleIds = ["sysadmin", "developer", "dev"];
  return (
    Array.isArray(user.systemRoles) &&
    user.systemRoles.some((r: string) => systemRoleIds.includes(r))
  );
}

export const listForOrganisation = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await getActor(ctx, args.userId);
    const orgId = user.organisationId as Id<"organisations">;
    // Management can see draft/staging and published; staff only published
    const isMgmt =
      isSystemUser(user) ||
      (Array.isArray(user.systemRoles) &&
        user.systemRoles.includes("orgadmin"));
    const rows = await ctx.db
      .query("academic_years")
      .withIndex("by_organisation", (q) => q.eq("organisationId", orgId))
      .filter((q) =>
        isMgmt
          ? q.or(
              q.eq(q.field("status"), "published"),
              q.eq(q.field("status"), "draft"),
              q.eq(q.field("staging"), true),
            )
          : q.and(
              q.eq(q.field("status"), "published"),
              q.eq(q.field("staging"), false),
            ),
      )
      .collect();
    return rows;
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
    const user = await getActor(ctx, args.userId);
    const year = await ctx.db.get(args.id);
    if (!year) throw new Error("Academic year not found");
    if (String(year.organisationId) !== String(user.organisationId))
      throw new Error("Permission denied");
    // Require org-level permission to edit
    await requirePermission(ctx, args.userId, "year.edit");

    const updates: Partial<Doc<"academic_years">> = {
      updatedAt: Date.now(),
    } as any;
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
              updatedAt: Date.now(),
            });
          }
        }
      }
    }
    await ctx.db.patch(args.id, updates as any);
    return args.id;
  },
});
