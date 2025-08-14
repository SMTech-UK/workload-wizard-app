"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../../../convex/_generated/api";
import type { Doc } from "../../../../../../convex/_generated/dataModel";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYear } from "@/components/providers/AcademicYearProvider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePageBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { withToast, toastError } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { Checkbox } from "@/components/ui/checkbox";
import { GenericDeleteModal } from "@/components/domain/GenericDeleteModal";
import { PermissionGate } from "@/components/common/PermissionGate";
import { useQuery as useConvexQuery } from "convex/react";

export default function IterationDetailsPage() {
  const params = useParams<{ id: string; iterationId: string }>();
  const courseId = params?.id as string;
  const iterationId = params?.iterationId as string;

  const { currentYear } = useAcademicYear();
  const { user } = useUser();

  // Fetch course and module data
  const course = useQuery(
    api.courses.getById,
    courseId ? ({ id: courseId as any } as any) : ("skip" as any),
  );

  // Fetch iteration details
  const iteration = useQuery(
    api.modules.getIterationById,
    iterationId ? ({ id: iterationId as any } as any) : ("skip" as any),
  );

  // Fetch module details
  const moduleData = useQuery(
    api.modules.getById,
    iteration?.moduleId
      ? ({ id: iteration.moduleId as any } as any)
      : ("skip" as any),
  );

  // Fetch groups for this iteration
  const groups = useQuery(
    (api as any).groups.listByIteration,
    iterationId
      ? ({ moduleIterationId: iterationId as any } as any)
      : ("skip" as any),
  );

  // Fetch lecturer profiles for assignment
  const lecturerProfiles = useQuery(
    (api as any).staff.list,
    user?.id ? ({ userId: user.id } as any) : ("skip" as any),
  );
  const orgSettings = useConvexQuery(
    (api as any).organisationSettings.getForActor,
  ) as { campusOptions?: string[]; maxClassSizePerGroup?: number } | undefined;

  // Mutations
  const createGroup = useMutation((api as any).groups.create);
  const updateIteration = useMutation(api.modules.updateIteration);
  const deleteGroup = useMutation((api as any).groups.remove);
  const assignLecturer = useMutation((api as any).allocations.assignLecturer);
  const removeAllocation = useMutation((api as any).allocations.remove);
  const updateAllocation = useMutation((api as any).allocations.update);

  // Local state
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [assignLecturerOpen, setAssignLecturerOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>("");
  const [hoursOverride, setHoursOverride] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const [bulkRemoveOpen, setBulkRemoveOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditHours, setBulkEditHours] = useState<string>("");
  const [editIterOpen, setEditIterOpen] = useState(false);
  const [iterTotalHours, setIterTotalHours] = useState<string>("");
  const [bulkGroupsOpen, setBulkGroupsOpen] = useState(false);

  // Form state for creating groups
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupSize, setNewGroupSize] = useState<string>("");

  const { toast } = useToast();

  // Set breadcrumbs
  usePageBreadcrumbs([
    { label: "Courses", href: "/courses" },
    { label: course?.code || "Loading...", href: `/courses/${courseId}` },
    {
      label: "Iteration",
      href: `/courses/${courseId}/iterations/${iterationId}`,
    },
  ]);

  // initialise iteration edit fields when opened
  const openEditIteration = () => {
    setIterTotalHours(
      typeof (iteration as any)?.totalHours === "number"
        ? String((iteration as any).totalHours)
        : "",
    );
    setEditIterOpen(true);
  };

  // Get module teaching hours for preview
  const moduleHours = useQuery(
    (api as any).allocations.getModuleTeachingHours,
    selectedGroupId
      ? ({ groupId: selectedGroupId as any } as any)
      : ("skip" as any),
  );

  // Get lecturer totals for instant updates
  const lecturerTotals = useQuery(
    (api as any).allocations.getLecturerTotals,
    selectedLecturerId && currentYear?._id
      ? ({
          lecturerId: selectedLecturerId as any,
          academicYearId: currentYear._id,
        } as any)
      : ("skip" as any),
  );

  // Get allocations for selected group
  const groupAllocations = useQuery(
    (api as any).allocations.listForGroup,
    selectedGroupId
      ? ({ groupId: selectedGroupId as any } as any)
      : ("skip" as any),
  );

  // Iteration summary
  const iterationSummary = useQuery(
    (api as any).allocations.iterationSummary,
    iteration?._id
      ? ({ moduleIterationId: (iteration as any)._id } as any)
      : ("skip" as any),
  );

  const resetAssignDialogState = () => {
    setSelectedGroupId("");
    setSelectedLecturerId("");
    setHoursOverride("");
    setIsSubmitting(false);
  };

  const handleAssignDialogClose = (open: boolean) => {
    if (!open) {
      resetAssignDialogState();
    }
    setAssignLecturerOpen(open);
  };

  const resetCreateGroupState = () => {
    setNewGroupName("");
    setNewGroupSize("");
  };

  const handleCreateGroupClose = (open: boolean) => {
    if (!open) {
      resetCreateGroupState();
    }
    setCreateGroupOpen(open);
  };

  if (!user) {
    return (
      <StandardizedSidebarLayout
        breadcrumbs={[
          { label: "Courses", href: "/courses" },
          { label: "Loading..." },
        ]}
        title="Iteration Details"
      >
        <div className="text-sm text-muted-foreground">Loading user...</div>
      </StandardizedSidebarLayout>
    );
  }

  if (!course || !iteration || !moduleData) {
    return (
      <StandardizedSidebarLayout
        breadcrumbs={[
          { label: "Courses", href: "/courses" },
          { label: "Loading..." },
        ]}
        title="Iteration Details"
      >
        <div className="text-sm text-muted-foreground">Loading...</div>
      </StandardizedSidebarLayout>
    );
  }

  if (!currentYear) {
    return (
      <StandardizedSidebarLayout
        breadcrumbs={[
          { label: "Courses", href: "/courses" },
          { label: course.code, href: `/courses/${courseId}` },
          { label: "Iteration" },
        ]}
        title="Iteration Details"
      >
        <div className="text-sm text-muted-foreground">
          Please select an academic year to view iteration details.
        </div>
      </StandardizedSidebarLayout>
    );
  }

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Courses", href: "/courses" },
        { label: course.code, href: `/courses/${courseId}` },
        { label: "Iteration" },
      ]}
      title={`${moduleData.code} - ${moduleData.name} (${currentYear.name})`}
    >
      <div className="space-y-6">
        {/* Iteration Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Iteration Overview</span>
              <Badge variant="outline">{currentYear.status}</Badge>
              {iterationSummary &&
                typeof iteration.totalHours === "number" &&
                iterationSummary.allocatedTotal >
                  (iteration.totalHours || 0) && (
                  <Badge
                    variant="destructive"
                    title="Allocated total exceeds iteration total hours"
                  >
                    Overallocated
                  </Badge>
                )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Module</Label>
                <div className="font-medium">
                  {moduleData.code} - {moduleData.name}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Credits</Label>
                <div className="font-medium">
                  {moduleData.credits || "Not set"}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Total Hours
                </Label>
                <div className="font-medium">
                  {iteration.totalHours || "Not set"}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Groups</Label>
                <div className="font-medium">
                  {Array.isArray(groups) ? groups.length : 0}
                </div>
              </div>
            </div>
            {iterationSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Allocations
                  </Label>
                  <div className="font-medium">
                    {iterationSummary.allocationCount}
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Teaching Hours
                  </Label>
                  <div className="font-medium">
                    {iterationSummary.allocatedTeaching}h
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Admin Hours
                  </Label>
                  <div className="font-medium">
                    {iterationSummary.allocatedAdmin}h
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">
                    Total Allocated
                  </Label>
                  <div className="font-medium">
                    {iterationSummary.allocatedTotal}h
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Groups Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Groups</CardTitle>
            <div className="flex items-center gap-2">
              <PermissionGate
                permission="allocations.bulk"
                organisationId={String(moduleData.organisationId)}
                disabled={!Object.values(bulkSelected).some(Boolean)}
                disabledText="Select groups to bulk assign"
              >
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!Object.values(bulkSelected).some(Boolean)}
                  onClick={() => {
                    setSelectedGroupId("__bulk__");
                    setAssignLecturerOpen(true);
                  }}
                >
                  Bulk Assign
                </Button>
              </PermissionGate>
              <PermissionGate
                permission="allocations.bulk"
                organisationId={String(moduleData.organisationId)}
                disabled={!Object.values(bulkSelected).some(Boolean)}
                disabledText="Select groups to bulk remove"
              >
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!Object.values(bulkSelected).some(Boolean)}
                  onClick={() => setBulkRemoveOpen(true)}
                >
                  Bulk Remove
                </Button>
              </PermissionGate>
              <PermissionGate
                permission="allocations.bulk"
                organisationId={String(moduleData.organisationId)}
                disabled={!Object.values(bulkSelected).some(Boolean)}
                disabledText="Select groups to bulk edit"
              >
                <Button
                  size="sm"
                  disabled={!Object.values(bulkSelected).some(Boolean)}
                  onClick={() => setBulkEditOpen(true)}
                >
                  Bulk Edit Hours
                </Button>
              </PermissionGate>
              <Dialog
                open={createGroupOpen}
                onOpenChange={handleCreateGroupClose}
              >
                <DialogTrigger asChild>
                  <Button size="sm">Create Group</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="groupName">Group Name</Label>
                      <Input
                        id="groupName"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="e.g., Group A, Morning Group"
                      />
                    </div>
                    <div>
                      <Label htmlFor="groupSize">Planned Size (optional)</Label>
                      <Input
                        id="groupSize"
                        type="number"
                        value={newGroupSize}
                        onChange={(e) => setNewGroupSize(e.target.value)}
                        placeholder="e.g., 25"
                        min="1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      disabled={!newGroupName.trim()}
                      onClick={async () => {
                        await withToast(
                          () =>
                            createGroup({
                              moduleIterationId: iterationId as any,
                              name: newGroupName.trim(),
                              ...(newGroupSize.trim()
                                ? { sizePlanned: Number(newGroupSize) }
                                : {}),
                            } as any),
                          {
                            success: {
                              title: "Group created",
                              description: `Group "${newGroupName}" has been created.`,
                            },
                            error: { title: "Failed to create group" },
                          },
                          toast,
                        );
                        handleCreateGroupClose(false);
                      }}
                    >
                      Create Group
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {!Array.isArray(groups) ? (
              <div className="text-sm text-muted-foreground">
                Loading groups...
              </div>
            ) : groups.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No groups created yet.
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <GroupCard
                    key={String(group._id)}
                    group={group}
                    onDelete={async () => {
                      if (
                        confirm(
                          `Are you sure you want to delete group "${group.name}"? This will also remove all lecturer allocations.`,
                        )
                      ) {
                        await withToast(
                          () => deleteGroup({ id: group._id as any }),
                          {
                            success: {
                              title: "Group deleted",
                              description: `Group "${group.name}" has been deleted.`,
                            },
                            error: { title: "Failed to delete group" },
                          },
                          toast,
                        );
                      }
                    }}
                    onAssignLecturer={() => {
                      setSelectedGroupId(String(group._id));
                      setAssignLecturerOpen(true);
                    }}
                    selected={!!bulkSelected[String(group._id)]}
                    onToggleSelected={() =>
                      setBulkSelected((s) => ({
                        ...s,
                        [String(group._id)]: !s[String(group._id)],
                      }))
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lecturer Assignment Dialog */}
        <Dialog
          open={assignLecturerOpen}
          onOpenChange={handleAssignDialogClose}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Lecturer to Group</DialogTitle>
            </DialogHeader>

            {/* Selection Summary */}
            {(selectedGroupId || selectedLecturerId) && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                <div className="text-sm font-medium text-muted-foreground">
                  Current Selection
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selectedGroupId && (
                    <div>
                      <span className="text-muted-foreground">Group:</span>
                      <div className="font-medium">
                        {(groups as any[])?.find(
                          (g) => String(g._id) === selectedGroupId,
                        )?.name || selectedGroupId}
                      </div>
                    </div>
                  )}
                  {selectedLecturerId && (
                    <div>
                      <span className="text-muted-foreground">Lecturer:</span>
                      <div className="font-medium">
                        {(lecturerProfiles as any[])?.find(
                          (p) => String(p._id) === selectedLecturerId,
                        )?.fullName || selectedLecturerId}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {selectedGroupId !== "__bulk__" && (
                <div>
                  <Label>Group</Label>
                  <Select
                    value={selectedGroupId}
                    onValueChange={setSelectedGroupId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {(groups as any[]).map((g) => (
                        <SelectItem key={String(g._id)} value={String(g._id)}>
                          {g.name || String(g._id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Lecturer</Label>
                <Select
                  value={selectedLecturerId}
                  onValueChange={setSelectedLecturerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lecturer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(lecturerProfiles as any[] | undefined)?.map((p) => (
                      <SelectItem key={String(p._id)} value={String(p._id)}>
                        {p.fullName} ({p.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hours override (optional)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={hoursOverride}
                  onChange={(e) => setHoursOverride(e.target.value)}
                  placeholder="Enter number of hours"
                  min="0"
                  max="1000"
                />
                {hoursOverride.trim() && (
                  <div className="mt-1 text-xs">
                    {isNaN(Number(hoursOverride)) ? (
                      <span className="text-destructive">
                        Please enter a valid number
                      </span>
                    ) : Number(hoursOverride) < 0 ? (
                      <span className="text-destructive">
                        Hours cannot be negative
                      </span>
                    ) : Number(hoursOverride) > 1000 ? (
                      <span className="text-destructive">
                        Hours cannot exceed 1000
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Override: {hoursOverride}h (computed:{" "}
                        {moduleHours?.computedHours || 0}h)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Computed hours preview */}
              {moduleHours && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                  <div className="text-sm font-medium text-muted-foreground">
                    Module Hours Preview
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Module:</span>
                      <div className="font-medium">
                        {moduleHours.moduleCode} - {moduleHours.moduleName}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Credits:</span>
                      <div className="font-medium">{moduleHours.credits}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Computed Hours:
                      </span>
                      <div className="font-medium">
                        {moduleHours.computedHours}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Total Module Hours:
                      </span>
                      <div className="font-medium">
                        {moduleHours.totalHours}
                      </div>
                    </div>
                  </div>
                  {hoursOverride.trim() && (
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Override Hours:{" "}
                        <span className="font-medium text-foreground">
                          {hoursOverride}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Lecturer totals preview */}
              {lecturerTotals && (
                <div className="space-y-2 p-3 bg-blue-50 rounded-md">
                  <div className="text-sm font-medium text-blue-700">
                    Lecturer Current Allocation
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-blue-600">Teaching:</span>
                      <div className="font-medium text-blue-800">
                        {lecturerTotals.allocatedTeaching}h
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-600">Admin:</span>
                      <div className="font-medium text-blue-800">
                        {lecturerTotals.allocatedAdmin}h
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-600">Total:</span>
                      <div className="font-medium text-blue-800">
                        {lecturerTotals.allocatedTotal}h
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-blue-600">
                    Active allocations: {lecturerTotals.allocationCount}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                disabled={
                  !selectedGroupId ||
                  !selectedLecturerId ||
                  isSubmitting ||
                  (hoursOverride.trim() !== "" &&
                    (isNaN(Number(hoursOverride)) ||
                      Number(hoursOverride) < 0 ||
                      Number(hoursOverride) > 1000))
                }
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await withToast(
                      async () => {
                        const result = await assignLecturer({
                          groupId: selectedGroupId as any,
                          lecturerId: selectedLecturerId as any,
                          academicYearId: currentYear._id as any,
                          organisationId: moduleData.organisationId as any,
                          type: "teaching",
                          ...(hoursOverride.trim()
                            ? { hoursOverride: Number(hoursOverride) }
                            : {}),
                        } as any);
                        // metric
                        analytics.track("allocation.assigned", {
                          groupId: selectedGroupId,
                          lecturerId: selectedLecturerId,
                          academicYearId: String(currentYear._id),
                          organisationId: String(moduleData.organisationId),
                          hasOverride: hoursOverride.trim() !== "",
                        });
                        return result;
                      },
                      {
                        success: {
                          title: "Lecturer assigned",
                          description: `Lecturer assigned to group for ${currentYear.name}.`,
                        },
                        error: { title: "Error assigning lecturer" },
                      },
                      toast,
                    );
                    handleAssignDialogClose(false);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                {isSubmitting ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
            {!!selectedGroupId && (
              <div className="mt-4 border-t pt-3 space-y-2">
                <div className="text-sm font-medium">Existing allocations</div>
                {!Array.isArray(groupAllocations) ? (
                  <div className="text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : groupAllocations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">None</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lecturer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="w-24 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupAllocations.map(({ allocation, lecturer }) => {
                        const hours =
                          typeof allocation.hoursOverride === "number"
                            ? `${allocation.hoursOverride} (override)`
                            : typeof allocation.hoursComputed === "number"
                              ? String(allocation.hoursComputed)
                              : "-";
                        return (
                          <TableRow key={String(allocation._id)}>
                            <TableCell className="py-2">
                              <div className="leading-tight">
                                <div className="font-medium text-sm">
                                  {lecturer?.fullName || allocation.lecturerId}
                                </div>
                                {lecturer?.email && (
                                  <div className="text-xs text-muted-foreground">
                                    {lecturer.email}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-sm capitalize">
                              {allocation.type}
                            </TableCell>
                            <TableCell className="py-2 text-right text-sm tabular-nums">
                              {hours}
                            </TableCell>
                            <TableCell className="py-2 text-right space-x-3">
                              <button
                                className="text-xs underline"
                                onClick={async () => {
                                  const input = prompt(
                                    "Change allocation type (teaching/admin)",
                                    allocation.type,
                                  );
                                  if (input === null) return;
                                  const next = input.trim().toLowerCase();
                                  if (next !== "teaching" && next !== "admin") {
                                    toast({
                                      title: "Invalid type",
                                      description:
                                        "Type must be 'teaching' or 'admin'",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  try {
                                    await updateAllocation({
                                      allocationId: allocation._id,
                                      type: next,
                                    } as any);
                                    analytics.track("allocation.updated", {
                                      allocationId: String(allocation._id),
                                      field: "type",
                                      value: next,
                                    });
                                    toast({
                                      title: "Allocation updated",
                                      description: `Type set to ${next}`,
                                    });
                                  } catch (e: unknown) {
                                    toastError(toast, e, "Update failed");
                                  }
                                }}
                              >
                                Type
                              </button>
                              <button
                                className="text-xs underline"
                                onClick={async () => {
                                  const input = prompt(
                                    "Set hours override (leave blank to clear)",
                                    typeof allocation.hoursOverride === "number"
                                      ? String(allocation.hoursOverride)
                                      : "",
                                  );
                                  if (input === null) return; // cancelled
                                  const trimmed = input.trim();
                                  try {
                                    if (trimmed === "") {
                                      await updateAllocation({
                                        allocationId: allocation._id,
                                        hoursOverride: null,
                                      } as any);
                                      analytics.track("allocation.updated", {
                                        allocationId: String(allocation._id),
                                        field: "hoursOverride",
                                        value: null,
                                      });
                                      toast({
                                        title: "Override cleared",
                                        description:
                                          "Hours override removed; using computed hours.",
                                      });
                                    } else {
                                      const value = Number(trimmed);
                                      if (
                                        !Number.isFinite(value) ||
                                        value < 0 ||
                                        value > 1000
                                      ) {
                                        throw new Error(
                                          "Enter a number between 0 and 1000",
                                        );
                                      }
                                      await updateAllocation({
                                        allocationId: allocation._id,
                                        hoursOverride: value,
                                      } as any);
                                      analytics.track("allocation.updated", {
                                        allocationId: String(allocation._id),
                                        field: "hoursOverride",
                                        value,
                                      });
                                      toast({
                                        title: "Allocation updated",
                                        description: `Override set to ${value}h`,
                                      });
                                    }
                                  } catch (e: unknown) {
                                    toastError(toast, e, "Update failed");
                                  }
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="text-xs text-destructive underline"
                                onClick={async () => {
                                  if (
                                    confirm(
                                      `Are you sure you want to remove ${lecturer?.fullName || allocation.lecturerId} from this group?`,
                                    )
                                  ) {
                                    try {
                                      await removeAllocation({
                                        allocationId: allocation._id,
                                      } as any);
                                      analytics.track("allocation.deleted", {
                                        allocationId: String(allocation._id),
                                      });
                                      toast({
                                        title: "Allocation removed",
                                        description: `Lecturer ${lecturer?.fullName || allocation.lecturerId} removed from group.`,
                                      });
                                    } catch (e: unknown) {
                                      toastError(
                                        toast,
                                        e,
                                        "Error removing allocation",
                                      );
                                    }
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Edit Hours Dialog */}
        <Dialog
          open={bulkEditOpen}
          onOpenChange={(o) => {
            if (!o) setBulkEditHours("");
            setBulkEditOpen(o);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Set hours override for selected allocations
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label>Hours override</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={bulkEditHours}
                onChange={(e) => setBulkEditHours(e.target.value)}
                placeholder="e.g., 12"
                min="0"
                max="1000"
              />
              <div className="text-xs text-muted-foreground">
                Leave blank to clear override.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const parsed =
                    bulkEditHours.trim() === "" ? null : Number(bulkEditHours);
                  if (
                    parsed !== null &&
                    (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000)
                  ) {
                    toast({
                      title: "Invalid hours",
                      description: "Enter a number 0-1000 or leave blank.",
                      variant: "destructive",
                    });
                    return;
                  }
                  // For each selected group, update all allocations hoursOverride
                  const groupIds = Object.entries(bulkSelected)
                    .filter(([, v]) => v)
                    .map(([id]) => id as any);
                  if (groupIds.length === 0) {
                    setBulkEditOpen(false);
                    return;
                  }
                  for (const gid of groupIds) {
                    const rows = await (
                      api as any
                    ).allocations.listForGroup._query({ groupId: gid });
                    for (const { allocation } of rows as any[]) {
                      await (api as any).allocations.update._mutation({
                        allocationId: allocation._id,
                        hoursOverride: parsed,
                      });
                    }
                  }
                  analytics.track("allocation.bulkHoursUpdated", {
                    groupCount: groupIds.length,
                    value: parsed,
                  });
                  toast({
                    title: "Overrides updated",
                    description: `Applied to allocations in ${groupIds.length} group(s).`,
                  });
                  setBulkEditOpen(false);
                }}
              >
                Apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit iteration dialog */}
        <Dialog open={editIterOpen} onOpenChange={setEditIterOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openEditIteration}>
              Edit iteration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit iteration</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Total hours</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={iterTotalHours}
                  onChange={(e) => setIterTotalHours(e.target.value)}
                  placeholder="e.g. 96"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={async () => {
                  const val = iterTotalHours.trim();
                  const num = val === "" ? 0 : Number(val);
                  if (!Number.isFinite(num) || num < 0 || num > 2000) {
                    toastError(toast, "Invalid hours", "Enter 0-2000");
                    return;
                  }
                  await withToast(
                    () =>
                      updateIteration({
                        id: iterationId as any,
                        totalHours: num,
                      } as any),
                    {
                      success: {
                        title: "Iteration updated",
                        description: `Total hours set to ${num}`,
                      },
                      error: { title: "Failed to update iteration" },
                    },
                    toast,
                  );
                  setEditIterOpen(false);
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk create groups per campus */}
        <Dialog open={bulkGroupsOpen} onOpenChange={setBulkGroupsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBulkGroupsOpen(true)}
            >
              Bulk create groups
            </Button>
          </DialogTrigger>
          <BulkGroupsForm
            campuses={
              (moduleData as any)?.campuses || (course as any)?.campuses || []
            }
            onClose={() => setBulkGroupsOpen(false)}
            onCreate={async (defs) => {
              // defs: Array<{ campus: string; groups: { name: string; sizePlanned?: number }[] }>
              for (const def of defs) {
                for (const g of def.groups) {
                  await withToast(
                    () =>
                      createGroup({
                        moduleIterationId: iterationId as any,
                        name: g.name,
                        ...(g.sizePlanned
                          ? { sizePlanned: g.sizePlanned }
                          : {}),
                      } as any),
                    {
                      success: { title: "Group created" },
                      error: { title: "Failed to create group" },
                    },
                    toast,
                  );
                }
              }
              setBulkGroupsOpen(false);
            }}
          />
        </Dialog>

        {/* Bulk Remove Confirmation */}
        <GenericDeleteModal
          open={bulkRemoveOpen}
          onOpenChange={setBulkRemoveOpen}
          title="Remove allocations from selected groups?"
          description="This will remove all lecturer allocations for the selected groups. This action cannot be undone."
          confirmText="Remove"
          onConfirm={async () => {
            const groupIds = Object.entries(bulkSelected)
              .filter(([, v]) => v)
              .map(([id]) => id as any);
            if (groupIds.length === 0) return;
            await withToast(
              () =>
                (api as any).allocations.removeAllocationsForGroups._mutation({
                  groupIds,
                }),
              {
                success: {
                  title: "Allocations removed",
                  description: `Removed from ${groupIds.length} group(s).`,
                },
                error: { title: "Bulk remove failed" },
              },
              toast,
            );
            analytics.track("allocation.bulkRemoved", {
              groupCount: groupIds.length,
            });
            setBulkSelected({});
            setBulkRemoveOpen(false);
          }}
        />
      </div>
    </StandardizedSidebarLayout>
  );
}

function BulkGroupsForm({
  campuses,
  onClose,
  onCreate,
}: {
  campuses: string[];
  onClose: () => void;
  onCreate: (
    defs: Array<{
      campus: string;
      groups: { name: string; sizePlanned?: number }[];
    }>,
  ) => Promise<void> | void;
}) {
  const anyApi = api as any;
  const settings = useQuery(anyApi.organisationSettings.getForActor) as
    | { campusOptions?: string[]; maxClassSizePerGroup?: number }
    | undefined;
  const [entries, setEntries] = useState<
    Array<{ campus: string; students: string }>
  >((campuses || []).map((c) => ({ campus: c, students: "" })));
  const [maxSize, setMaxSize] = useState<string>(
    settings?.maxClassSizePerGroup
      ? String(settings.maxClassSizePerGroup)
      : "25",
  );

  const parsed = entries
    .map((e) => ({ campus: e.campus, students: Number(e.students || 0) }))
    .filter((e) => e.campus && Number.isFinite(e.students) && e.students > 0);
  const max = Number(maxSize || 0);

  const plan = parsed.map((e) => {
    const groupsNeeded = max > 0 ? Math.ceil(e.students / max) : 0;
    const sizes: number[] = [];
    if (groupsNeeded > 0) {
      const base = Math.floor(e.students / groupsNeeded);
      let remainder = e.students - base * groupsNeeded;
      for (let i = 0; i < groupsNeeded; i++) {
        sizes.push(base + (remainder > 0 ? 1 : 0));
        if (remainder > 0) remainder--;
      }
    }
    return {
      campus: e.campus,
      groups: sizes.map((sz, idx) => ({
        name: `${e.campus} G${idx + 1}`,
        sizePlanned: sz,
      })),
    };
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Bulk create groups per campus</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Max class size</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={maxSize}
            onChange={(e) => setMaxSize(e.target.value)}
            placeholder="e.g. 25"
          />
          <p className="text-xs text-muted-foreground">
            Default from org settings: {settings?.maxClassSizePerGroup ?? 25}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Students per campus</Label>
          <div className="space-y-2">
            {(settings?.campusOptions || campuses || []).map((c) => (
              <div key={c} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-7 text-sm">{c}</div>
                <div className="col-span-5">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={entries.find((e) => e.campus === c)?.students || ""}
                    onChange={(e) =>
                      setEntries((prev) => {
                        const next = [...prev];
                        const i = next.findIndex((x) => x.campus === c);
                        if (i >= 0)
                          next[i] = { campus: c, students: e.target.value };
                        else next.push({ campus: c, students: e.target.value });
                        return next;
                      })
                    }
                    placeholder="e.g. 120"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Plan preview</Label>
          <div className="space-y-2 text-sm">
            {plan.length === 0 || max <= 0 ? (
              <div className="text-muted-foreground">
                Enter student numbers and a valid max size to see plan.
              </div>
            ) : (
              plan.map((p) => (
                <div key={p.campus} className="rounded border p-2">
                  <div className="font-medium">{p.campus}</div>
                  {p.groups.length === 0 ? (
                    <div className="text-muted-foreground">
                      No groups needed
                    </div>
                  ) : (
                    <ul className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {p.groups.map((g, idx) => (
                        <li key={idx} className="rounded bg-muted px-2 py-1">
                          {g.name} — {g.sizePlanned} students
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={plan.every((p) => p.groups.length === 0)}
          onClick={async () => {
            await onCreate(plan);
          }}
        >
          Create groups
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function GroupCard({
  group,
  onDelete,
  onAssignLecturer,
  selected,
  onToggleSelected,
}: {
  group: any;
  onDelete: () => void;
  onAssignLecturer: () => void;
  selected?: boolean;
  onToggleSelected?: () => void;
}) {
  const { currentYear } = useAcademicYear();

  // Fetch allocations for this group
  const allocations = useQuery((api as any).allocations.listForGroup, {
    groupId: group._id as any,
  });

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggleSelected}
          />
          <h3 className="font-medium text-lg">{group.name}</h3>
          {group.sizePlanned && (
            <p className="text-sm text-muted-foreground">
              Planned size: {group.sizePlanned} students
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onAssignLecturer}>
            Assign Lecturer
          </Button>
          <Button size="sm" variant="destructive" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      <Separator className="my-3" />

      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">
          Lecturer Allocations
        </h4>
        {!Array.isArray(allocations) ? (
          <div className="text-sm text-muted-foreground">
            Loading allocations...
          </div>
        ) : allocations.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No lecturers assigned
          </div>
        ) : (
          <div className="space-y-2">
            {allocations.map(({ allocation, lecturer }) => {
              const hours =
                typeof allocation.hoursOverride === "number"
                  ? allocation.hoursOverride
                  : allocation.hoursComputed || 0;

              return (
                <div
                  key={String(allocation._id)}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {lecturer?.fullName || "Unknown Lecturer"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {lecturer?.email} • {allocation.type}
                    </div>
                  </div>
                  <div className="text-sm font-medium">{hours}h</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
