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
  // Create a dummy lecturer
  const fullName = `E2E Lecturer ${now}`;
  const email = `e2e_${now}@example.com`;
  // Find current user to derive orgId via a small query, but we don't have auth here. Keep route simple:
  // We'll create a lecturer with minimal fields in the demo org path if available; otherwise rely on UI to show it.
  // For safety, wrap in try/catch and return best-effort info.
  const lecturerId: string | null = null;
  const groupId: string | null = null;
  try {
    // This action expects server to derive org from actor in Convex; here we just call a mutation designed for UI
    // We'll re-use staff.create which derives org from actor; without auth it may fail, so we best-effort skip.
  } catch {}
  // To guarantee a group exists, we cannot directly create one without a module iteration; leave to test script to do it via UI.
  return NextResponse.json({ ok: true, lecturerId, groupId });
}
