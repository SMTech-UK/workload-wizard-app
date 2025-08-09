"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle,
  Upload,
  ListPlus,
  Wand2,
  ChevronRight,
  Play,
} from "lucide-react";
import { PermissionForm } from "@/components/domain/PermissionForm";
import { GenericDeleteModal } from "@/components/domain/GenericDeleteModal";
import { SuccessModal } from "@/components/domain/SuccessModal";
import { Id } from "../../../../convex/_generated/dataModel";
import { hasAnyRole } from "@/lib/utils";
import { PERMISSIONS, DEFAULT_ROLES } from "@/lib/permissions";

interface Permission {
  _id: Id<"system_permissions">;
  id: string;
  group: string;
  description: string;
  defaultRoles: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface SystemRoleTemplate {
  _id: Id<"system_role_templates">;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export default function AdminPermissionsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null,
  );
  const [deletingPermission, setDeletingPermission] =
    useState<Permission | null>(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    title: string;
    message: string;
    details?: Record<string, string | number>;
  } | null>(null);

  // Queries
  const permissionsGrouped = useQuery(
    api.permissions.getSystemPermissionsGrouped,
  );
  const systemRoleTemplates = useQuery(api.permissions.listSystemRoleTemplates);
  const upsertTemplate = useMutation(api.permissions.upsertSystemRoleTemplate);
  const deleteTemplate = useMutation(api.permissions.deleteSystemRoleTemplate);
  const convexUser = useQuery(
    api.users.getBySubject,
    user?.id ? { subject: user.id } : "skip",
  );

  // Mutations
  const createPermission = useMutation(api.permissions.createSystemPermission);
  const updatePermission = useMutation(api.permissions.updateSystemPermission);
  const deletePermission = useMutation(api.permissions.deleteSystemPermission);
  const pushToOrgs = useMutation(
    api.permissions.pushPermissionsToOrganisations,
  );
  const ensureDefaultsAcrossOrgs = useMutation(
    api.permissions.ensureDefaultRolesAcrossOrganisations,
  );
  const importPermissions = useMutation(
    api.permissions.importSystemPermissions,
  );
  const createTestOrg = useMutation(api.permissions.createTestOrgWithRoles);
  const createTestUsers = useMutation(api.permissions.createTestUsers);
  const [customDefaultRoleNames, setCustomDefaultRoleNames] =
    useState<string>("");
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importUpsert, setImportUpsert] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<SystemRoleTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [deletingTemplate, setDeletingTemplate] =
    useState<SystemRoleTemplate | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const hasByClerk =
    hasAnyRole(user, ["sysadmin", "developer"]) ||
    (user?.publicMetadata as Record<string, unknown> | undefined)?.[
      "devLoginSession"
    ] === true;
  const hasByConvex =
    !!convexUser &&
    Array.isArray(convexUser.systemRoles) &&
    convexUser.systemRoles.some(
      (r: string) => r === "sysadmin" || r === "developer",
    );

  useEffect(() => {
    if (isLoaded && !(hasByClerk || hasByConvex)) {
      router.replace("/unauthorised");
    }
  }, [isLoaded, hasByClerk, hasByConvex, router]);

  if (!isLoaded) return <p>Loading...</p>;

  if (!(hasByClerk || hasByConvex)) {
    return null;
  }

  const handleCreate = async (
    data:
      | {
          id: string;
          group: string;
          description: string;
          defaultRoles: string[];
        }
      | {
          group: string;
          description: string;
          defaultRoles: string[];
        },
  ) => {
    if (!("id" in data)) return;
    try {
      await createPermission({
        id: data.id,
        group: data.group,
        description: data.description,
        defaultRoles: data.defaultRoles,
        ...(user?.id ? { performedBy: user.id } : {}),
        ...(user?.firstName ||
        user?.lastName ||
        user?.emailAddresses?.[0]?.emailAddress
          ? {
              performedByName:
                `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                (user?.emailAddresses?.[0]?.emailAddress as string),
            }
          : {}),
      });
      setShowCreateForm(false);
      setSuccessModal({
        title: "Permission Created",
        message: `Permission "${data.id}" has been successfully created.`,
        details: {
          "Permission ID": data.id,
          Group: data.group,
          "Default Roles":
            data.defaultRoles.length > 0
              ? data.defaultRoles.join(", ")
              : "None",
        },
      });
    } catch (error) {
      console.error("Error creating permission:", error);
      alert("Error creating permission: " + (error as Error).message);
    }
  };

  const handleEdit = async (data: {
    id?: string;
    group: string;
    description: string;
    defaultRoles: string[];
  }) => {
    if (!editingPermission) return;

    try {
      await updatePermission({
        permissionId: editingPermission._id,
        ...data,
        ...(user?.id ? { performedBy: user.id } : {}),
        ...(user?.firstName ||
        user?.lastName ||
        user?.emailAddresses?.[0]?.emailAddress
          ? {
              performedByName:
                `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                (user?.emailAddresses?.[0]?.emailAddress as string),
            }
          : {}),
      });
      setEditingPermission(null);
      setSuccessModal({
        title: "Permission Updated",
        message: `Permission "${editingPermission.id}" has been successfully updated.`,
        details: {
          "Permission ID": editingPermission.id,
          Group: data.group,
          "Default Roles":
            data.defaultRoles.length > 0
              ? data.defaultRoles.join(", ")
              : "None",
        },
      });
    } catch (error) {
      console.error("Error updating permission:", error);
      alert("Error updating permission: " + (error as Error).message);
    }
  };

  const handleDeleteClick = (permission: Permission) => {
    setDeletingPermission(permission);
    setForceDelete(false); // Reset force delete flag
  };

  const handleDelete = async () => {
    if (!deletingPermission) return;

    const result = await deletePermission({
      permissionId: deletingPermission._id,
      ...(forceDelete ? { forceDelete } : {}),
      ...(user?.id ? { performedBy: user.id } : {}),
      ...(user?.firstName ||
      user?.lastName ||
      user?.emailAddresses?.[0]?.emailAddress
        ? {
            performedByName:
              `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
              (user?.emailAddresses?.[0]?.emailAddress as string),
          }
        : {}),
    });

    setDeletingPermission(null);
    setForceDelete(false);

    // Show success message if result contains a message
    if (result && typeof result === "object" && "message" in result) {
      setSuccessModal({
        title: forceDelete ? "Permission Force Deleted" : "Permission Deleted",
        message: result.message,
        details: {
          "Permission ID": deletingPermission.id,
          Group: deletingPermission.group,
          ...(result.wasForceDeleted && {
            "Removed from User Roles": result.removedFromRoles,
            "Removed from Org Roles": result.removedFromOrgRoles,
          }),
        },
      });
    }
  };

  const handlePushToOrgs = async (permissionId: string) => {
    try {
      const result = await pushToOrgs({
        permissionId,
        ...(user?.id ? { performedBy: user.id } : {}),
        ...(user?.firstName ||
        user?.lastName ||
        user?.emailAddresses?.[0]?.emailAddress
          ? {
              performedByName:
                `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                (user?.emailAddresses?.[0]?.emailAddress as string),
            }
          : {}),
      });
      setSuccessModal({
        title: "Permissions Pushed Successfully",
        message: `Permission "${permissionId}" has been pushed to all active organisations.`,
        details: {
          "Organisations Updated": result.organisationsUpdated,
          "Total Roles Checked": result.totalRolesChecked,
          "Matching Roles Found": result.matchingRoles,
          "New Assignments Created": result.assignmentsCreated,
          "Already Assigned": result.alreadyAssigned,
          "Default Roles": result.defaultRoles.join(", ") || "None",
        },
      });
    } catch (error) {
      console.error("Error pushing to organisations:", error);
      alert("Error pushing to organisations: " + (error as Error).message);
    }
  };

  const getGroupColor = (group: string) => {
    const explicit: Record<string, string> = {
      staff: "bg-blue-100 text-blue-800",
      users: "bg-green-100 text-green-800",
      modules: "bg-purple-100 text-purple-800",
      admin: "bg-red-100 text-red-800",
      reports: "bg-orange-100 text-orange-800",
    };
    if (explicit[group]) return explicit[group];

    // Deterministic fallback palette for any other group
    const palette = [
      "bg-teal-100 text-teal-800",
      "bg-indigo-100 text-indigo-800",
      "bg-pink-100 text-pink-800",
      "bg-cyan-100 text-cyan-800",
      "bg-amber-100 text-amber-800",
      "bg-lime-100 text-lime-800",
      "bg-rose-100 text-rose-800",
      "bg-fuchsia-100 text-fuchsia-800",
      "bg-sky-100 text-sky-800",
      "bg-violet-100 text-violet-800",
      "bg-slate-100 text-slate-800",
      "bg-emerald-100 text-emerald-800",
    ];
    let hash = 0;
    for (let i = 0; i < group.length; i++) {
      hash = (hash << 5) - hash + group.charCodeAt(i);
      hash |= 0; // to 32-bit int
    }
    const idx = Math.abs(hash) % palette.length;
    return palette[idx];
  };

  const getAllPermissions = (): Permission[] => {
    if (!permissionsGrouped) return [];
    return Object.values(permissionsGrouped).flat();
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Admin", href: "/admin" },
    { label: "Permissions" },
  ];

  // Canonical registry (code) — read-only view
  const registryEntries = Object.entries(PERMISSIONS);
  const registryGrouped = registryEntries.reduce<
    Record<string, Array<{ id: string; description: string }>>
  >((acc, [permId, meta]) => {
    const list = acc[meta.group] ?? [];
    list.push({ id: permId, description: meta.description });
    acc[meta.group] = list;
    return acc;
  }, {});
  const defaultRolesForPermission = (permId: string): string[] => {
    const roles: string[] = [];
    for (const [role, perms] of Object.entries(DEFAULT_ROLES)) {
      if (perms.includes(permId as never)) roles.push(role);
    }
    return roles;
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={async () => {
          try {
            setIsRunningTests(true);
            await createTestOrg();
            await createTestUsers();
            router.push("/admin/permissions/tests");
          } catch (e) {
            alert("Failed to run tests: " + (e as Error).message);
          } finally {
            setIsRunningTests(false);
          }
        }}
        title="Run permission tests"
        disabled={isRunningTests}
      >
        <Play className="h-4 w-4 mr-2" />
        {isRunningTests ? "Running…" : "Run Tests"}
      </Button>
      <input
        value={customDefaultRoleNames}
        onChange={(e) => setCustomDefaultRoleNames(e.target.value)}
        placeholder="Default roles (comma-separated), e.g. Admin,Manager,Lecturer,Viewer"
        className="border rounded px-2 py-1 text-sm max-w-[360px]"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            const roleNames = customDefaultRoleNames
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const result = await ensureDefaultsAcrossOrgs({
              ...(user?.id ? { performedBy: user.id } : {}),
              ...(user?.firstName ||
              user?.lastName ||
              user?.emailAddresses?.[0]?.emailAddress
                ? {
                    performedByName:
                      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                      (user?.emailAddresses?.[0]?.emailAddress as string),
                  }
                : {}),
              ...(roleNames.length ? { roleNames } : {}),
            });
            setSuccessModal({
              title: "Default Roles Ensured",
              message: `Ensured default roles exist across all active organisations`,
              details: {
                "Organisations Processed": result.organisationsProcessed,
                "Roles Created": result.rolesCreated,
              },
            });
          } catch (e) {
            alert("Failed to ensure default roles: " + (e as Error).message);
          }
        }}
      >
        <Upload className="h-4 w-4 mr-2" />
        Seed Defaults
      </Button>
      <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
        <Upload className="h-4 w-4 mr-2" />
        JSON Import
      </Button>
      <Button size="sm" onClick={() => setShowCreateForm(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Permission
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setEditingTemplate(null);
          setTemplateName("");
          setTemplateDesc("");
          setShowTemplateForm(true);
        }}
      >
        <ListPlus className="h-4 w-4 mr-2" />
        New Default Role
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Permission Registry"
      subtitle="Manage system-wide permissions and default role assignments"
      headerActions={headerActions}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {getAllPermissions().length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total Permissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {permissionsGrouped
                    ? Object.keys(permissionsGrouped).length
                    : 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Permission Groups
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {
                    getAllPermissions().filter((p) => p.defaultRoles.length > 0)
                      .length
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  With Default Roles
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Default Role Templates (Sysadmin-managed) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> Default Role Templates
          </CardTitle>
          <CardDescription>
            These roles are used when creating new organisations (and seeding
            defaults).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemRoleTemplates && systemRoleTemplates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {systemRoleTemplates.map((r) => (
                <div
                  key={r._id}
                  className="flex items-center gap-2 border rounded px-2 py-1 text-sm"
                >
                  <code className="font-mono">{r.name}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTemplate(r as SystemRoleTemplate);
                      setTemplateName(r.name);
                      setTemplateDesc(r.description || "");
                      setShowTemplateForm(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => setDeletingTemplate(r as SystemRoleTemplate)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No templates yet. Create some to define your organisation
              defaults.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Permissions List */}
      {permissionsGrouped && Object.keys(permissionsGrouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(permissionsGrouped).map(([group, permissions]) => (
            <Collapsible key={group} defaultOpen={false}>
              <Card>
                <CardHeader>
                  <CollapsibleTrigger className="flex w-full items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Badge className={getGroupColor(group)}>
                        {group.toUpperCase()}
                      </Badge>
                      <span>({permissions.length} permissions)</span>
                    </CardTitle>
                    <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-4">
                      {permissions.map((permission) => (
                        <div
                          key={permission._id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                                  {permission.id}
                                </code>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {permission.description}
                              </p>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePushToOrgs(permission.id)}
                                title="Push to all organisations"
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingPermission(permission)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(permission)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {permission.defaultRoles.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">
                                Default Roles:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {permission.defaultRoles.map((role) => (
                                  <Badge
                                    key={role}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {role}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No permissions found
            </h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first system permission.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Permission
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Canonical Registry (read-only from code) */}
      <Card>
        <CardHeader>
          <CardTitle>Canonical Registry</CardTitle>
          <CardDescription>
            Read-only view sourced from code in{" "}
            <code>src/lib/permissions.ts</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(registryGrouped).map(([group, items]) => (
              <div key={group} className="border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={getGroupColor(group)}>
                    {group.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ({items.length} permissions)
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map(({ id, description }) => (
                    <div key={id} className="flex items-start justify-between">
                      <div>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {id}
                        </code>
                        <p className="text-sm text-muted-foreground mt-1">
                          {description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {defaultRolesForPermission(id).map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="text-xs"
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Permission Modal */}
      {showCreateForm && (
        <PermissionForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          title="Create New Permission"
        />
      )}

      {/* Edit Permission Modal */}
      {editingPermission && (
        <PermissionForm
          onSubmit={handleEdit}
          onCancel={() => setEditingPermission(null)}
          title="Edit Permission"
          initialData={{
            id: editingPermission.id,
            group: editingPermission.group,
            description: editingPermission.description,
            defaultRoles: editingPermission.defaultRoles,
          }}
          isEditing
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingPermission && (
        <GenericDeleteModal
          isOpen={true}
          onClose={() => {
            setDeletingPermission(null);
            setForceDelete(false);
          }}
          onConfirm={handleDelete}
          title="Delete Permission"
          description="This action cannot be undone"
          itemName="permission"
          itemDetails={{
            "Permission ID": deletingPermission.id,
            Group: deletingPermission.group,
            Description: deletingPermission.description,
            "Default Roles":
              deletingPermission.defaultRoles.length > 0
                ? deletingPermission.defaultRoles.join(", ")
                : "None",
          }}
          warningMessage={
            forceDelete
              ? "Force delete will automatically remove this permission from ALL roles and organisations before deletion. This cannot be undone!"
              : "This will permanently remove the permission from the system. If deletion fails, you'll need to remove this permission from all roles first, or use Force Delete."
          }
          confirmButtonText="Delete Permission"
          showForceDelete={hasAnyRole(user, ["sysadmin", "developer"])}
          forceDelete={forceDelete}
          onForceDeleteChange={setForceDelete}
          onError={(error) => {
            console.error("Delete error:", error);
          }}
        />
      )}

      {/* Success Modal */}
      {successModal && (
        <SuccessModal
          isOpen={true}
          onClose={() => setSuccessModal(null)}
          title={successModal.title}
          message={successModal.message}
          {...(successModal.details ? { details: successModal.details } : {})}
        />
      )}

      {/* JSON Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import System Permissions</DialogTitle>
            <DialogDescription>
              Paste a JSON array with fields: Permission ID, Group, Description,
              Default Roles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              className="w-full h-64 border rounded p-2 font-mono text-sm"
              placeholder='[\n  {"Permission ID": "org.read", "Group": "org", "Description": "...", "Default Roles": ["Admin"]}\n]'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={importUpsert}
                onChange={(e) => setImportUpsert(e.target.checked)}
              />
              Upsert existing permissions
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const raw = JSON.parse(importText);
                  if (!Array.isArray(raw))
                    throw new Error("JSON must be an array");
                  const items = raw.map((x: Record<string, unknown>) => ({
                    id:
                      (x["Permission ID"] as string | undefined) ??
                      (x.id as string),
                    group:
                      (x["Group"] as string | undefined) ?? (x.group as string),
                    description:
                      (x["Description"] as string | undefined) ??
                      (x.description as string),
                    defaultRoles:
                      (x["Default Roles"] as string[] | undefined) ??
                      (x.defaultRoles as string[] | undefined) ??
                      [],
                  }));
                  const res = await importPermissions({
                    items,
                    ...(importUpsert ? { upsert: importUpsert } : {}),
                    ...(user?.id ? { performedBy: user.id } : {}),
                    ...(user?.firstName ||
                    user?.lastName ||
                    user?.emailAddresses?.[0]?.emailAddress
                      ? {
                          performedByName:
                            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                            (user?.emailAddresses?.[0]?.emailAddress as string),
                        }
                      : {}),
                  });
                  setShowImport(false);
                  setImportText("");
                  setSuccessModal({
                    title: "Import Complete",
                    message: `Processed ${res.total} item(s).`,
                    details: {
                      Created: res.created,
                      Updated: res.updated,
                      Skipped: res.skipped,
                    },
                  });
                } catch (e) {
                  alert("Import failed: " + (e as Error).message);
                }
              }}
            >
              Run Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Template Dialog */}
      <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate
                ? "Edit Default Role Template"
                : "New Default Role Template"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Update the template used when seeding new organisations."
                : "Define a template role name used when seeding new organisations."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-desc">Description</Label>
              <Input
                id="tpl-desc"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTemplateForm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!templateName.trim()) return;
                try {
                  await upsertTemplate({
                    ...(editingTemplate ? { id: editingTemplate._id } : {}),
                    name: templateName.trim(),
                    ...(templateDesc ? { description: templateDesc } : {}),
                    ...(user?.id ? { performedBy: user.id } : {}),
                    ...(user?.firstName ||
                    user?.lastName ||
                    user?.emailAddresses?.[0]?.emailAddress
                      ? {
                          performedByName:
                            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                            (user?.emailAddresses?.[0]?.emailAddress as string),
                        }
                      : {}),
                  });
                  setShowTemplateForm(false);
                  setEditingTemplate(null);
                  setTemplateName("");
                  setTemplateDesc("");
                } catch (e) {
                  alert((e as Error).message);
                }
              }}
            >
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      {deletingTemplate && (
        <GenericDeleteModal
          isOpen={true}
          onClose={() => setDeletingTemplate(null)}
          onConfirm={async () => {
            try {
              await deleteTemplate({
                id: deletingTemplate._id,
                ...(user?.id ? { performedBy: user.id } : {}),
                ...(user?.firstName ||
                user?.lastName ||
                user?.emailAddresses?.[0]?.emailAddress
                  ? {
                      performedByName:
                        `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                        (user?.emailAddresses?.[0]?.emailAddress as string),
                    }
                  : {}),
              });
              setDeletingTemplate(null);
            } catch (e) {
              alert((e as Error).message);
            }
          }}
          title="Delete Default Role Template"
          description="This will deactivate the template. Existing organisations are not affected."
          itemName="default role template"
          itemDetails={{
            Name: deletingTemplate.name,
            Description: deletingTemplate.description || "",
          }}
          confirmButtonText="Delete Template"
        />
      )}
    </StandardizedSidebarLayout>
  );
}
