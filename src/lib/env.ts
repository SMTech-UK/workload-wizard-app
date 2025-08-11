import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

type Env = z.infer<typeof EnvSchema>;

let parsed: Env | null = null;

export function getEnv(): Env {
  if (!parsed) {
    parsed = EnvSchema.parse({
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
      NODE_ENV: process.env.NODE_ENV,
    });
  }
  return parsed;
}

// Parse eagerly at import time to fail fast in production builds
// Safe in dev/test too
void getEnv();
