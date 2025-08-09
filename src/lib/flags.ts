import { z } from 'zod';

export const FlagsSchema = z.object({
  NEW_ALLOCATION_UI: z.boolean().default(false),
});

export type Flags = z.infer<typeof FlagsSchema>;

export async function getFlags(): Promise<Flags> {
  // TODO: Fetch from Convex/DB; default for now
  return FlagsSchema.parse({});
}


