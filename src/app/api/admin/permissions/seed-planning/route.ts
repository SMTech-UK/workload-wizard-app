import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import { recordAudit } from "@/lib/audit";

export async function POST(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const me = await currentUser();
    const role = (me?.publicMetadata as any)?.role as string | undefined;
    const roles =
      ((me?.publicMetadata as any)?.roles as string[] | undefined) || [];
    const isSuperAdmin =
      role === "sysadmin" ||
      role === "developer" ||
      roles.includes("sysadmin") ||
      roles.includes("developer");
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return NextResponse.json(
        { error: "Convex URL not configured" },
        { status: 500 },
      );
    }

    const performedByName = me
      ? `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() ||
        me.primaryEmailAddress?.emailAddress ||
        me.username ||
        me.id
      : undefined;

    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    const result = await client.mutation(
      api.permissions.seedPlanningMvpPermissions,
      {
        performedBy: userId,
        ...(performedByName ? { performedByName } : {}),
      },
    );

    await recordAudit({
      action: "permissions.updated",
      actorId: userId,
      success: true,
      entityType: "permission",
      entityId: "seedPlanningMvpPermissions",
      meta: { result },
    });

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error: any) {
    const status =
      typeof error?.statusCode === "number" ? error.statusCode : 500;
    return NextResponse.json(
      { error: error?.message ?? "Failed to seed permissions" },
      { status },
    );
  }
}
