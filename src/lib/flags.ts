import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

export const FlagsSchema = z.object({
  NEW_ALLOCATION_UI: z.boolean().default(false),
});

export type Flags = z.infer<typeof FlagsSchema>;

export async function getFlags(): Promise<Flags> {
  const defaults = FlagsSchema.parse({});
  try {
    const { userId } = await auth();
    if (!userId || !process.env.NEXT_PUBLIC_CONVEX_URL) return defaults;
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    const overrides = await client.query(api.featureFlags.getOverrides, {
      userId,
    });
    const resolved: Record<string, boolean> = { ...defaults } as any;
    for (const [key, value] of Object.entries(overrides || {})) {
      resolved[key] = value as boolean;
    }
    return FlagsSchema.parse(resolved);
  } catch {
    return defaults;
  }
}
