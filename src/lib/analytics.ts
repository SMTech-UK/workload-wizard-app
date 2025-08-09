export type SafeProps = Record<
  string,
  string | number | boolean | null | undefined
>;

const BLOCK_KEYS = new Set(["email", "name", "firstName", "lastName"]);

export function scrubPII(props: Record<string, unknown>): SafeProps {
  const out: SafeProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (BLOCK_KEYS.has(key)) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value == null
    ) {
      out[key] = value as SafeProps[keyof SafeProps];
    } else {
      out[key] = undefined;
    }
  }
  return out;
}

export async function track(
  event: string,
  props: Record<string, unknown> = {},
): Promise<void> {
  const safe = scrubPII(props);
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, props: safe }),
    });
  } catch {
    // swallow
  }
}
