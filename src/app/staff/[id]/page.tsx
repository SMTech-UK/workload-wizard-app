"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  Link2,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { useAcademicYear } from "@/components/providers/AcademicYearProvider";
import { useUser } from "@clerk/nextjs";
import { EditStaffForm } from "@/components/domain/EditStaffForm";
import { PermissionGate } from "@/components/common/PermissionGate";
import { DeactivateConfirmationModal } from "@/components/domain/DeactivateConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { withToast } from "@/lib/utils";

export default function StaffProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params?.id as string;
  const { user } = useUser();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const profile = useQuery(
    (api as any).staff.get,
    profileId ? ({ profileId: profileId as any } as any) : ("skip" as any),
  );

  const { currentYear } = useAcademicYear();
  const adminAllocations = useQuery(
    (api as any).allocations.listAdminAllocations,
    profileId && (currentYear as any)?._id
      ? ({
          lecturerId: profileId as any,
          academicYearId: (currentYear as any)._id,
        } as any)
      : ("skip" as any),
  );
  const groupAllocations = useQuery(
    (api as any).allocations.listForLecturer,
    "skip" as any,
  );

  // Permission checks
  const canEdit = useQuery(api.permissions.hasPermission, {
    userId: user?.id || "",
    permissionId: "staff.edit",
  });

  const canDeactivate = useQuery(api.permissions.hasPermission, {
    userId: user?.id || "",
    permissionId: "staff.edit", // Using edit permission for deactivate
  });

  // Check if email matches Clerk user
  const clerkUser = useQuery(
    api.users.getByEmail,
    profile?.email ? { email: profile.email } : "skip",
  );

  const editMutation = useMutation(api.staff.edit);
  const deactivateMutation = useMutation(api.staff.edit);
  const updateUserAvatarMutation = useMutation(api.users.updateUserAvatar);

  const handleEdit = async (formData: any) => {
    try {
      await editMutation({
        profileId: profileId as any,
        ...formData,
        userId: user?.id || "",
      });

      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Lecturer profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update lecturer profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLinkUser = async () => {
    if (!profile || !clerkUser) return;
    try {
      await editMutation({
        profileId: profileId as any,
        userSubject: clerkUser.subject,
        userId: user?.id || "",
      } as any);
      toast({
        title: "Profile linked",
        description: "Lecturer profile linked to user account.",
      });
    } catch (e) {
      toast({
        title: "Link failed",
        description: e instanceof Error ? e.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSyncAvatar = async () => {
    if (!clerkUser?.subject || !clerkUser?.pictureUrl) return;
    try {
      // call users.updateUserAvatar to sync from Clerk
      await updateUserAvatarMutation({
        subject: clerkUser.subject,
        pictureUrl: clerkUser.pictureUrl,
      } as any);
      toast({
        title: "Avatar synced",
        description: "Profile picture synced from Clerk.",
      });
    } catch (e) {
      toast({
        title: "Avatar sync failed",
        description: e instanceof Error ? e.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateMutation({
        profileId: profileId as any,
        isActive: false,
        userId: user?.id || "",
      });

      setShowDeactivateModal(false);
      toast({
        title: "Profile Deactivated",
        description: "Lecturer profile has been deactivated.",
      });
    } catch (error) {
      toast({
        title: "Deactivation Failed",
        description: "Failed to deactivate lecturer profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReactivate = async () => {
    try {
      await deactivateMutation({
        profileId: profileId as any,
        isActive: true,
        userId: user?.id || "",
      });

      toast({
        title: "Profile Reactivated",
        description: "Lecturer profile has been reactivated.",
      });
    } catch (error) {
      toast({
        title: "Reactivation Failed",
        description: "Failed to reactivate lecturer profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!profile) {
    return (
      <StandardizedSidebarLayout
        breadcrumbs={[{ label: "Staff", href: "/staff" }, { label: "Profile" }]}
        title="Lecturer Profile"
      >
        <div className="text-sm text-muted-foreground">Loading…</div>
      </StandardizedSidebarLayout>
    );
  }

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Staff", href: "/staff" },
        { label: profile.fullName },
      ]}
      title={profile.fullName}
      subtitle={profile.email}
      headerActions={
        <div className="flex items-center gap-2">
          {profile.isActive ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Active
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Inactive
            </Badge>
          )}

          {clerkUser && (
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Clerk User
            </Badge>
          )}
          {clerkUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLinkUser}
              title="Link profile to user"
            >
              <Link2 className="h-4 w-4 mr-2" /> Link
            </Button>
          )}
          {clerkUser?.pictureUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAvatar}
              title="Sync avatar from Clerk"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Sync Avatar
            </Button>
          )}

          <PermissionGate permission="staff.edit" fallback={null}>
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>

                {profile.isActive ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeactivateModal(true)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReactivate}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reactivate
                  </Button>
                )}
              </>
            )}
          </PermissionGate>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Role: {profile.role || "—"}</div>
            <div>Team: {profile.teamName || "—"}</div>
            <div>Contract: {profile.contract}</div>
            <div>FTE: {profile.fte}</div>
            <div>Max Teaching: {profile.maxTeachingHours}h</div>
            <div>Total Contract: {profile.totalContract}h</div>
            <div>Pref Location: {profile.prefWorkingLocation || "—"}</div>
            <div>
              Pref Working Time:{" "}
              {profile.prefWorkingTime === "am"
                ? "AM"
                : profile.prefWorkingTime === "pm"
                  ? "PM"
                  : profile.prefWorkingTime === "all_day"
                    ? "All day"
                    : "—"}
            </div>
            <div>Specialism: {profile.prefSpecialism || "—"}</div>
            <div>Notes: {profile.prefNotes || "—"}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Module Allocations (current AY)</CardTitle>
          </CardHeader>
          <CardContent>
            <ModuleAllocationsTable lecturerId={profile._id} />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Admin Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminAllocationsTable lecturerId={profile._id} />
          </CardContent>
        </Card>
      </div>

      {/* Edit Form Modal */}
      {isEditing && (
        <EditStaffForm
          profile={profile}
          onSave={handleEdit}
          onCancel={() => setIsEditing(false)}
        />
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateModal && (
        <DeactivateConfirmationModal
          profileName={profile.fullName}
          onConfirm={handleDeactivate}
          onCancel={() => setShowDeactivateModal(false)}
        />
      )}
    </StandardizedSidebarLayout>
  );
}

function ModuleAllocationsTable({ lecturerId }: { lecturerId: string }) {
  const { currentYear } = useAcademicYear();
  const { toast } = useToast();
  const rows = useQuery(
    (api as any).allocations.listForLecturerDetailed,
    currentYear?._id
      ? ({
          lecturerId: lecturerId as any,
          academicYearId: (currentYear as any)._id,
        } as any)
      : ("skip" as any),
  ) as
    | Array<{ allocation: any; group: any; iteration: any; module: any }>
    | undefined;
  const [sortBy, setSortBy] = useState<"module" | "hours" | "type">("module");
  const [typeFilter, setTypeFilter] = useState<"all" | "teaching" | "admin">(
    "all",
  );

  const data = (rows || [])
    .filter((r) => typeFilter === "all" || r.allocation.type === typeFilter)
    .sort((a, b) => {
      if (sortBy === "hours") {
        const ha =
          typeof a.allocation.hoursOverride === "number"
            ? a.allocation.hoursOverride
            : a.allocation.hoursComputed || 0;
        const hb =
          typeof b.allocation.hoursOverride === "number"
            ? b.allocation.hoursOverride
            : b.allocation.hoursComputed || 0;
        return hb - ha;
      }
      if (sortBy === "type")
        return a.allocation.type.localeCompare(b.allocation.type);
      const ma = (a.module?.code || "") + (a.module?.name || "");
      const mb = (b.module?.code || "") + (b.module?.name || "");
      return ma.localeCompare(mb);
    });

  const handleExport = () => {
    const headers = ["Module Code", "Module Name", "Group", "Type", "Hours"];
    const rowsCsv = data.map(({ allocation, group, module }) => {
      const hours =
        typeof allocation.hoursOverride === "number"
          ? allocation.hoursOverride
          : allocation.hoursComputed || 0;
      return [
        module?.code || "",
        module?.name || "",
        group?.name || "",
        allocation.type,
        String(hours),
      ];
    });
    const csv = [headers, ...rowsCsv]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `module-allocations-${currentYear?.name || "year"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="text-sm text-muted-foreground flex-1">
          Academic Year: {currentYear?.name}
        </div>
        <div className="text-sm">
          <label className="mr-2">Type</label>
          <select
            className="border rounded px-2 py-1"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="teaching">Teaching</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="text-sm">
          <label className="mr-2">Sort</label>
          <select
            className="border rounded px-2 py-1"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="module">Module</option>
            <option value="hours">Hours</option>
            <option value="type">Type</option>
          </select>
        </div>
        <Button size="sm" onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {!Array.isArray(rows) ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : data.length === 0 ? (
        <div className="text-sm text-muted-foreground">No allocations</div>
      ) : (
        <ul className="divide-y border rounded">
          {data.map(({ allocation, group, module }) => {
            const hours =
              typeof allocation.hoursOverride === "number"
                ? allocation.hoursOverride
                : allocation.hoursComputed || 0;
            return (
              <li
                key={String(allocation._id)}
                className="p-2 flex items-center justify-between text-sm"
              >
                <div>
                  <div className="font-medium">
                    {module?.code || ""} — {module?.name || ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Group: {group?.name || ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="capitalize">{allocation.type}</div>
                  <div className="font-medium">{hours}h</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AdminAllocationsTable({ lecturerId }: { lecturerId: string }) {
  const { currentYear } = useAcademicYear();
  const { toast } = useToast();
  const categories = useQuery(
    (api as any).allocations.listAdminCategories,
    {},
  ) as any[] | undefined;
  const rows = useQuery(
    (api as any).allocations.listAdminAllocations,
    currentYear?._id
      ? ({
          lecturerId: lecturerId as any,
          academicYearId: (currentYear as any)._id,
        } as any)
      : ("skip" as any),
  ) as Array<{ allocation: any; category: any }> | undefined;
  const upsert = useMutation((api as any).allocations.upsertAdminAllocation);
  const remove = useMutation((api as any).allocations.removeAdminAllocation);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState<null | {
    id?: string;
    categoryId: string;
    hours: string;
  }>(null);
  const handleSave = async () => {
    if (!formOpen) return;
    const hours = Number(formOpen.hours);
    if (!Number.isFinite(hours) || hours < 0 || hours > 1000) {
      toast({
        title: "Invalid hours",
        description: "Enter a number between 0 and 1000",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(formOpen.id || "new");
    try {
      await withToast(
        () =>
          upsert({
            lecturerId: lecturerId as any,
            academicYearId: (currentYear as any)._id,
            categoryId: formOpen.categoryId,
            hours,
            ...(formOpen.id ? { allocationId: formOpen.id as any } : {}),
          } as any),
        {
          success: {
            title: formOpen.id ? "Allocation updated" : "Allocation created",
          },
          error: { title: "Save failed" },
        },
        toast,
      );
      setFormOpen(null);
    } finally {
      setIsSaving(null);
    }
  };

  const handleRemove = async (allocationId: string) => {
    if (!confirm("Remove allocation?")) return;
    setIsRemoving(allocationId);
    try {
      await withToast(
        () => remove({ allocationId: allocationId as any } as any),
        {
          success: { title: "Allocation removed" },
          error: { title: "Remove failed" },
        },
        toast,
      );
    } finally {
      setIsRemoving(null);
    }
  };

  if (!currentYear)
    return (
      <div className="text-sm text-muted-foreground">
        Select an academic year
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Academic Year: {currentYear.name}
        </div>
        <Button
          size="sm"
          onClick={() =>
            setFormOpen({
              categoryId: categories?.[0]?._id ? String(categories[0]._id) : "",
              hours: "",
            })
          }
          disabled={isSaving !== null}
        >
          Add
        </Button>
      </div>
      {!Array.isArray(rows) ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No admin allocations
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ allocation, category }) => (
            <div
              key={String(allocation._id)}
              className="flex items-center justify-between border rounded p-2 text-sm"
            >
              <div>
                <div className="font-medium">
                  {category?.name || allocation.categoryId}
                </div>
                <div className="text-xs text-muted-foreground">
                  {allocation.hours}h
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSaving !== null}
                  onClick={() =>
                    setFormOpen({
                      id: String(allocation._id),
                      categoryId: String(allocation.categoryId),
                      hours: String(allocation.hours),
                    })
                  }
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isRemoving === String(allocation._id)}
                  onClick={() => handleRemove(allocation._id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {formOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-background border rounded-md p-4 w-full max-w-md space-y-3">
            <div className="font-medium">
              {formOpen.id ? "Edit Admin Allocation" : "Add Admin Allocation"}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                className="w-full border rounded px-2 py-1"
                value={formOpen.categoryId}
                onChange={(e) =>
                  setFormOpen((f) => f && { ...f, categoryId: e.target.value })
                }
              >
                {(categories || []).map((c) => (
                  <option key={String(c._id)} value={String(c._id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <Input
                value={formOpen.hours}
                onChange={(e) =>
                  setFormOpen((f) => f && { ...f, hours: e.target.value })
                }
                type="number"
                min="0"
                max="1000"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormOpen(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving !== null}
              >
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
