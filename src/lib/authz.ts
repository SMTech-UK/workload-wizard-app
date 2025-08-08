import { auth, currentUser } from "@clerk/nextjs/server";

export type SessionUser = {
  userId: string;
  organisationId: string;
  role: string;
};

function extractFromUnknown<T>(value: unknown, key: string): T | undefined {
  if (value && typeof value === "object" && key in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>)[key] as T;
  }
  return undefined;
}

export async function getSessionUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.userId) throw new Error("Unauthenticated");
  const user = await currentUser();

  const organisationId =
    extractFromUnknown<string>(session.sessionClaims as unknown, "organisationId") ||
    extractFromUnknown<string>(user?.publicMetadata as unknown, "organisationId");

  const role =
    extractFromUnknown<string>(session.sessionClaims as unknown, "role") ||
    extractFromUnknown<string>(user?.publicMetadata as unknown, "role") ||
    "user";

  if (!organisationId) throw new Error("Missing organisationId");
  return { userId: session.userId, organisationId, role };
}

export async function getOrganisationIdFromSession(): Promise<string> {
  return (await getSessionUser()).organisationId;
}

export async function requireSystemPermission(_perm: string) {
  const { role } = await getSessionUser();
  if (role !== "systemadmin" && role !== "sysadmin" && role !== "admin") {
    throw new Error("Forbidden");
  }
  return true as const;
}

export async function requireOrgPermission(_perm: string) {
  // Replace with real RBAC once permissions.ts is wired in
  const { role } = await getSessionUser();
  if (role === "systemadmin" || role === "sysadmin" || role === "admin" || role === "orgadmin") return true as const;
  throw new Error("Forbidden");
}


