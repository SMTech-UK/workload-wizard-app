import { NextRequest, NextResponse } from "next/server";

// Minimal proxy placeholder. Hook to PostHog server SDK later if desired.
export async function POST(req: NextRequest) {
  try {
    const { event, props } = (await req.json()) as { event?: string; props?: Record<string, unknown> };
    if (!event || typeof event !== "string") {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }
    // For now, accept and no-op (or log). In future, forward to PH proxy endpoint/server SDK.
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}


