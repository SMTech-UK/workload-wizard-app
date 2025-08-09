export type PermissionId = `${string}.${string}`;

export const PERMISSIONS: Record<
  PermissionId,
  { group: string; description: string }
> = {
  "users.view": {
    group: "users",
    description: "View users in your organisation",
  },
  "users.create": {
    group: "users",
    description: "Create users in your organisation",
  },
  "users.edit": {
    group: "users",
    description: "Edit users in your organisation",
  },
  "users.delete": {
    group: "users",
    description: "Delete users in your organisation",
  },
  "permissions.manage": {
    group: "admin",
    description: "Manage roles and permissions",
  },
  "flags.manage": { group: "admin", description: "Toggle feature flags" },
};

export const DEFAULT_ROLES: Record<string, PermissionId[]> = {
  systemadmin: Object.keys(PERMISSIONS) as PermissionId[],
  orgadmin: [
    "users.view",
    "users.create",
    "users.edit",
    "permissions.manage",
    "flags.manage",
  ],
  lecturer: ["users.view"],
};

export async function seedDefaultOrgRoles(organisationId: string) {
  // Idempotently ensure default roles for an org via Convex helper.
  const { ConvexHttpClient } = await import("convex/browser");
  const { api } = await import("../../convex/_generated/api");
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const res = await client.mutation(
    api.permissions.ensureDefaultRolesForOrganisation,
    {
      organisationId: organisationId as unknown as any,
    },
  );
  return { organisationId, created: res.created };
}

export function listPermissionsByGroup(): Record<
  string,
  Array<{ id: PermissionId; description: string }>
> {
  const entries = Object.entries(PERMISSIONS) as Array<
    [PermissionId, { group: string; description: string }]
  >;
  return entries.reduce<
    Record<string, Array<{ id: PermissionId; description: string }>>
  >((acc, [id, meta]) => {
    const list = acc[meta.group] ?? [];
    list.push({ id, description: meta.description });
    acc[meta.group] = list;
    return acc;
  }, {});
}

export function rolesForPermission(permissionId: PermissionId): string[] {
  const roles: string[] = [];
  for (const [role, perms] of Object.entries(DEFAULT_ROLES)) {
    if (perms.includes(permissionId)) roles.push(role);
  }
  return roles;
}
