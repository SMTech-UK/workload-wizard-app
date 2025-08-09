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
  // TODO: persist via Convex/DB; idempotent upsert for roles & their permissions
  return { organisationId, roles: Object.keys(DEFAULT_ROLES) };
}


