import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";

const BodySchema = z.object({ name: z.string().min(1), enabled: z.boolean() });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const me = await currentUser();
  const roles = (me?.publicMetadata?.roles as string[]) || [];
  const role = (me?.publicMetadata?.role as string | undefined) ?? "";
  const isSys =
    roles.includes("sysadmin") ||
    roles.includes("developer") ||
    role === "sysadmin" ||
    role === "developer";
  if (!isSys) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { name, enabled } = BodySchema.parse(await req.json());
    if (!process.env.NEXT_PUBLIC_CONVEX_URL)
      return NextResponse.json(
        { error: "Convex URL not configured" },
        { status: 500 },
      );
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    await client.mutation(api.featureFlags.setOverride, {
      userId,
      flagName: name,
      enabled,
    });
    await recordAudit({
      action: "flags.updated",
      actorId: userId,
      success: true,
      entityType: "flag",
      entityId: name,
      meta: { enabled },
    });
    return NextResponse.json({ ok: true, name, enabled });
  } catch {
    // Attempt to audit failure as well
    try {
      const body = await req.text();
      await recordAudit({
        action: "flags.updated",
        actorId: userId!,
        success: false,
        entityType: "flag",
        entityId: "unknown",
        meta: { raw: body.substring(0, 2048) },
      });
    } catch {}
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
