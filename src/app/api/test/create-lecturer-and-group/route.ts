import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";

export async function POST() {
  // Dev-only safety
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { error: "Convex URL not configured" },
      { status: 500 },
    );
  }
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  const now = Date.now();
  try {
    const { lecturerId } = await client.mutation(
      api.devTools.createDemoLecturer,
      {
        fullName: `E2E Lecturer ${now}`,
        email: `e2e_${now}@example.com`,
      },
    );
    return NextResponse.json({ ok: true, lecturerId });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "unknown" },
      { status: 500 },
    );
  }
}
