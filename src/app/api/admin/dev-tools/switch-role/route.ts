import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { error: "Convex URL not configured" },
      { status: 500 },
    );
  }

  let roleName = "Admin";
  try {
    const body = await request.json().catch(() => ({}));
    roleName = (body?.role as string) || (body?.roleName as string) || "Admin";
  } catch (_) {
    // ignore parse errors, default to Admin
  }

  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  try {
    const res = await client.mutation(api.devTools.switchMyRoleInDemoOrg, {
      roleName,
    });
    return NextResponse.json({ ok: true, res });
  } catch (error: any) {
    return NextResponse.json(
      { error: String(error?.message || error) },
      { status: 500 },
    );
  }
}
