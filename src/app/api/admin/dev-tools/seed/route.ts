import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";

export async function POST() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { error: "Convex URL not configured" },
      { status: 500 },
    );
  }
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  const res = await client.mutation(api.devTools.seedDemoData, {
    performedBy: userId,
  });
  return NextResponse.json({ ok: true, res });
}
