import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Minimal proxy placeholder. Hook to PostHog server SDK later if desired.
const BodySchema = z.object({
  event: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
  try {
    const { event, props } = BodySchema.parse(await req.json());
    // For now, accept and no-op (or log). In future, forward to PH proxy endpoint/server SDK.
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}


