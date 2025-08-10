import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { recordAudit } from "@/lib/audit";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import { requireSystemPermission } from "@/lib/authz";

const BodySchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
  userId: z.string().optional(), // target user subject; defaults to caller
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Check permission using centralized system
    await requireSystemPermission("flags.manage");

    const {
      name,
      enabled,
      userId: targetUserId,
    } = BodySchema.parse(await req.json());

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return NextResponse.json(
        { error: "Convex URL not configured" },
        { status: 500 },
      );
    }

    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    await client.mutation(api.featureFlags.setOverride, {
      userId: targetUserId || userId,
      flagName: name,
      enabled,
    });

    await recordAudit({
      action: "flags.updated",
      actorId: userId,
      success: true,
      entityType: "flag",
      entityId: name,
      meta: { enabled, targetUserId: targetUserId || userId },
    });

    return NextResponse.json({ ok: true, name, enabled });
  } catch (error) {
    // Handle permission errors
    if ((error as any).statusCode === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Attempt to audit failure
    try {
      const { userId } = await auth();
      if (userId) {
        const body = await req.text();
        await recordAudit({
          action: "flags.updated",
          actorId: userId,
          success: false,
          entityType: "flag",
          entityId: "unknown",
          meta: { raw: body.substring(0, 2048) },
        });
      }
    } catch {}

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 },
      );
    }

    console.error("Feature flag toggle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
