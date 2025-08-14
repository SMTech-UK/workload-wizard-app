"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { withToast } from "@/lib/utils";
import { GenericDeleteModal } from "@/components/domain/GenericDeleteModal";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id as string;
  const { toast } = useToast();

  const course = useQuery(
    api.courses.getById,
    courseId ? ({ id: courseId as any } as any) : ("skip" as any),
  );
  const years = useQuery(
    api.courses.listYears,
    courseId ? ({ courseId: courseId as any } as any) : ("skip" as any),
  );
  const addYear = useMutation(api.courses.addYear);

  const [yearInput, setYearInput] = useState<string>("1");
  const [isAddingYear, setIsAddingYear] = useState(false);
  const canAdd = useMemo(() => {
    const val = Number(yearInput);
    const formatOk = Number.isFinite(val) && val >= 1 && val <= 10;
    const exists = Array.isArray(years)
      ? (years as any[]).some((y) => Number((y as any).yearNumber) === val)
      : false;
    return formatOk && !exists;
  }, [yearInput, years]);

  if (!course) {
    return (
      <StandardizedSidebarLayout
        breadcrumbs={[
          { label: "Courses", href: "/courses" },
          { label: "Loading..." },
        ]}
        title="Course"
      >
        <div className="text-sm text-muted-foreground">Loading...</div>
      </StandardizedSidebarLayout>
    );
  }

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Courses", href: "/courses" },
        { label: (course as any).code },
      ]}
      title={`${(course as any).code} — ${(course as any).name}`}
    >
      <Tabs defaultValue="years" className="w-full">
        <TabsList>
          <TabsTrigger value="years">Years</TabsTrigger>
        </TabsList>
        <TabsContent value="years">
          <div className="mb-6 text-sm text-muted-foreground">
            {(course as any).leaderProfileId && (
              <div>
                Leader Profile:{" "}
                <code>{String((course as any).leaderProfileId)}</code>
              </div>
            )}
            {typeof (course as any).studentCount === "number" && (
              <div>Students: {(course as any).studentCount}</div>
            )}
            {Array.isArray((course as any).campuses) &&
              (course as any).campuses!.length > 0 && (
                <div>Campuses: {(course as any).campuses!.join(", ")}</div>
              )}
          </div>
          <div className="flex gap-4 items-end mb-4">
            <div className="space-y-2">
              <Label htmlFor="yearNumber">Add Year</Label>
              <Input
                id="yearNumber"
                data-testid="year-number-input"
                type="number"
                min={1}
                max={10}
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="w-24"
              />
              {(() => {
                const val = Number(yearInput);
                const exists = Array.isArray(years)
                  ? (years as any[]).some(
                      (y) => Number((y as any).yearNumber) === val,
                    )
                  : false;
                return Number.isFinite(val) && exists ? (
                  <p className="text-xs text-destructive">
                    Year already exists for this course
                  </p>
                ) : null;
              })()}
            </div>
            <Button
              data-testid="add-year-btn"
              disabled={!canAdd || isAddingYear}
              onClick={async () => {
                const yearNumber = Number(yearInput);
                setIsAddingYear(true);
                try {
                  await addYear({ courseId: course._id, yearNumber } as any);
                  setYearInput(String(yearNumber + 1));
                  toast({
                    title: "Year added",
                    description: `Year ${yearNumber} has been added successfully.`,
                    variant: "success",
                  });
                } catch (error) {
                  toast({
                    title: "Failed to add year",
                    description:
                      error instanceof Error
                        ? error.message
                        : "An error occurred",
                    variant: "destructive",
                  });
                } finally {
                  setIsAddingYear(false);
                }
              }}
            >
              {isAddingYear ? "Adding..." : "Add Year"}
            </Button>
          </div>
          <div>
            {Array.isArray(years) && years.length ? (
              <ul
                className="flex gap-2 flex-wrap"
                data-testid="course-years-list"
              >
                {years.map((y: any) => (
                  <li
                    key={y._id}
                    className="basis-full"
                    data-testid={`course-year-${y.yearNumber}`}
                  >
                    <div className="mb-2 inline-flex items-center px-3 py-1 rounded-full bg-muted text-sm">
                      Y{y.yearNumber}
                    </div>
                    <CourseYearModules yearId={y._id as any} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">
                No years added yet.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </StandardizedSidebarLayout>
  );
}

function CourseYearModules({ yearId }: { yearId: string }) {
  const { toast } = useToast();
  const attached = useQuery(api.modules.listForCourseYear, {
    courseYearId: yearId as string & { __tableName: "course_years" },
  } as any);
  const allModules = useQuery(api.modules.listByOrganisation);
  const attach = useMutation(api.modules.attachToCourseYear);
  const detach = useMutation(api.modules.detachFromCourseYear);

  const [selected, setSelected] = useState<string>("");
  const [isCore, setIsCore] = useState<boolean>(true);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isDetaching, setIsDetaching] = useState(false);
  const [detaching, setDetaching] = useState<{
    moduleId: string;
    moduleCode: string;
    moduleName: string;
  } | null>(null);

  const available = useMemo(() => {
    const used = new Set(
      (attached || []).map((a: any) => String(a.module?._id)),
    );
    return (allModules || []).filter((m: any) => !used.has(String(m._id)));
  }, [attached, allModules]);

  return (
    <div className="border rounded-md p-3" data-testid="module-attachment-form">
      <div className="flex items-end gap-2">
        <div className="w-64">
          <Label>Attach Module</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger data-testid="attach-module-trigger">
              <SelectValue placeholder="Select module" />
            </SelectTrigger>
            <SelectContent>
              {available.map((m: any) => (
                <SelectItem key={m._id} value={String(m._id)}>
                  {m.code} — {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!!selected &&
            (attached || []).some(
              (a: any) => String(a.module?._id) === selected,
            ) && (
              <p className="text-xs text-destructive mt-1">
                Module already attached to this year
              </p>
            )}
        </div>
        <div>
          <Label className="block">Core?</Label>
          <button
            type="button"
            data-testid="core-toggle-btn"
            className={`px-3 py-2 border rounded-md text-sm ${isCore ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            onClick={() => setIsCore((v) => !v)}
          >
            {isCore ? "Core" : "Optional"}
          </button>
        </div>
        <Button
          data-testid="attach-module-btn"
          disabled={
            !selected ||
            (attached || []).some(
              (a: any) => String(a.module?._id) === selected,
            ) ||
            isAttaching
          }
          onClick={async () => {
            setIsAttaching(true);
            try {
              await withToast(
                () =>
                  attach({
                    courseYearId: yearId as any,
                    moduleId: selected as any,
                    isCore,
                  }),
                {
                  success: {
                    title: "Module attached",
                    description: "Module has been attached successfully.",
                  },
                  error: { title: "Failed to attach module" },
                },
                toast,
              );
              setSelected("");
            } finally {
              setIsAttaching(false);
            }
          }}
        >
          {isAttaching ? "Attaching..." : "Attach"}
        </Button>
      </div>
      <div className="mt-3">
        {attached?.length ? (
          <ul
            className="flex gap-2 flex-wrap"
            data-testid="attached-modules-list"
          >
            {attached.map((a: any) => (
              <li
                key={a.link._id}
                data-testid={`attached-module-${a.module?.code}`}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm">
                  <span>
                    {a.module?.code} {a.link.isCore ? "(Core)" : "(Optional)"}
                  </span>
                  <ModuleIterationAndGroupsAndAllocations
                    moduleId={String(a.module?._id)}
                  />
                  <button
                    className="ml-1 text-destructive"
                    disabled={isDetaching}
                    onClick={() => {
                      setDetaching({
                        moduleId: String(a.module?._id),
                        moduleCode: String(a.module?.code || "Unknown"),
                        moduleName: String(a.module?.name || ""),
                      });
                    }}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted-foreground">
            No modules attached.
          </div>
        )}
      </div>

      {detaching && (
        <GenericDeleteModal
          entityType="Module from Course Year"
          entityName={detaching.moduleName}
          entityCode={detaching.moduleCode}
          onConfirm={async () => {
            try {
              setIsDetaching(true);
              await withToast(
                () =>
                  detach({
                    courseYearId: yearId as any,
                    moduleId: detaching.moduleId as any,
                  }),
                {
                  success: {
                    title: "Module detached",
                    description: `${detaching.moduleCode} has been detached successfully.`,
                  },
                  error: { title: "Failed to detach module" },
                },
                toast,
              );
              setDetaching(null);
            } finally {
              setIsDetaching(false);
            }
          }}
          onCancel={() => setDetaching(null)}
          isDeleting={isDetaching}
        />
      )}
    </div>
  );
}

function ModuleIterationAndGroupsAndAllocations({
  moduleId,
}: {
  moduleId: string;
}) {
  const { currentYear } = useAcademicYear();
  const { toast } = useToast();
  const { user } = useUser();
  const params = useParams();
  const iteration = useQuery(
    api.modules.getIterationForYear,
    currentYear?._id
      ? ({ moduleId: moduleId as any, academicYearId: currentYear._id } as any)
      : ("skip" as any),
  );
  const createIteration = useMutation(api.modules.createIterationForYear);

  const [isCreating, setIsCreating] = useState(false);
  const hasIteration = Boolean(iteration?._id);

  const groups = useQuery(
    (api as any).groups.listByIteration,
    hasIteration
      ? ({ moduleIterationId: (iteration as any)._id } as any)
      : ("skip" as any),
  );
  const createGroup = useMutation((api as any).groups.create);

  // Allocations UI bits
  const profiles = useQuery(
    (api as any).staff.list,
    user?.id ? ({ userId: user.id } as any) : ("skip" as any),
  );
  const assign = useMutation((api as any).allocations.assignLecturer);
  const removeAllocation = useMutation((api as any).allocations.remove);
  const updateAllocation = useMutation((api as any).allocations.update);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>("");
  const [hoursOverride, setHoursOverride] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [detaching, setDetaching] = useState<{
    moduleId: string;
    moduleCode: string;
    moduleName: string;
  } | null>(null);
  const listAllocations = useQuery(
    (api as any).allocations.listForGroup,
    selectedGroupId
      ? ({ groupId: selectedGroupId as any } as any)
      : ("skip" as any),
  ) as Array<{ allocation: any; lecturer: any }> | undefined;

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
    selectedLecturerId
      ? ({
          lecturerId: selectedLecturerId as any,
          academicYearId: (currentYear as any)?._id,
        } as any)
      : ("skip" as any),
  );

  const resetDialogState = () => {
    setSelectedGroupId("");
    setSelectedLecturerId("");
    setHoursOverride("");
    setIsSubmitting(false);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetDialogState();
    }
    setAssignOpen(open);
  };

  if (!currentYear)
    return <span className="text-muted-foreground">Select AY</span>;

  return (
    <div
      className="inline-flex items-center gap-2"
      data-testid="module-iteration-section"
    >
      {hasIteration ? (
        <>
          <span className="text-emerald-700">
            Iteration: {currentYear.name}
          </span>
          {/* Link to dedicated iteration details page */}
          <Link
            href={`/courses/${String((params as any)?.id)}/iterations/${String((iteration as any)?._id)}`}
            className="text-xs underline"
          >
            View details
          </Link>
          <button
            data-testid="add-group-btn"
            className="text-xs underline"
            disabled={isCreatingGroup}
            onClick={async () => {
              const name = prompt("Group name?");
              if (!name) return;
              setIsCreatingGroup(true);
              try {
                await withToast(
                  () =>
                    createGroup({
                      moduleIterationId: (iteration as any)._id,
                      name,
                    } as any),
                  {
                    success: {
                      title: "Group created",
                      description: `Group "${name}" has been created successfully.`,
                    },
                    error: { title: "Failed to create group" },
                  },
                  toast,
                );
              } finally {
                setIsCreatingGroup(false);
              }
            }}
          >
            {isCreatingGroup ? "Creating..." : "+ Add Group"}
          </button>
          {Array.isArray(groups) && groups.length > 0 ? (
            <span
              className="text-xs text-muted-foreground"
              data-testid="groups-count"
            >
              {groups.length} group(s)
            </span>
          ) : null}
          {Array.isArray(groups) && groups.length > 0 ? (
            <Dialog open={assignOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <button
                  data-testid="assign-lecturer-btn"
                  className="text-xs underline"
                >
                  Assign lecturer
                </button>
              </DialogTrigger>
              <DialogContent data-testid="assign-lecturer-dialog">
                <DialogHeader>
                  <DialogTitle>Assign Lecturer</DialogTitle>
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
                          <span className="text-muted-foreground">
                            Lecturer:
                          </span>
                          <div className="font-medium">
                            {(profiles as any[])?.find(
                              (p) => String(p._id) === selectedLecturerId,
                            )?.fullName || selectedLecturerId}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4" data-testid="allocation-form">
                  <div>
                    <Label>Group</Label>
                    <Select
                      value={selectedGroupId}
                      onValueChange={setSelectedGroupId}
                    >
                      <SelectTrigger data-testid="group-select-trigger">
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
                  <div>
                    <Label>Lecturer</Label>
                    <Select
                      value={selectedLecturerId}
                      onValueChange={setSelectedLecturerId}
                    >
                      <SelectTrigger data-testid="lecturer-select-trigger">
                        <SelectValue placeholder="Select lecturer" />
                      </SelectTrigger>
                      <SelectContent>
                        {(profiles as any[] | undefined)?.map((p) => (
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
                      data-testid="hours-override-input"
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
                          <span className="text-muted-foreground">
                            Credits:
                          </span>
                          <div className="font-medium">
                            {moduleHours.credits}
                          </div>
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
                    data-testid="assign-lecturer-submit-btn"
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
                        await assign({
                          groupId: selectedGroupId as any,
                          lecturerId: selectedLecturerId as any,
                          academicYearId: (currentYear as any)._id,
                          type: "teaching",
                          ...(hoursOverride.trim()
                            ? { hoursOverride: Number(hoursOverride) }
                            : {}),
                        } as any);
                        toast({
                          title: "Lecturer assigned",
                          description: `Lecturer ${selectedLecturerId} assigned to group ${selectedGroupId} for ${currentYear.name}.`,
                        });
                        handleDialogClose(false);
                      } catch (e: unknown) {
                        const errorMessage =
                          e instanceof Error
                            ? e.message
                            : "Unknown error occurred";
                        toast({
                          title: "Error assigning lecturer",
                          description: `Failed to assign lecturer: ${errorMessage}`,
                          variant: "destructive",
                        });
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
                    <div className="text-sm font-medium">
                      Existing allocations
                    </div>
                    {!Array.isArray(listAllocations) ? (
                      <div className="text-sm text-muted-foreground">
                        Loading...
                      </div>
                    ) : listAllocations.length === 0 ? (
                      <div className="text-sm text-muted-foreground">None</div>
                    ) : (
                      <Table data-testid="allocations-table">
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
                          {listAllocations.map(({ allocation, lecturer }) => {
                            const hours =
                              typeof allocation.hoursOverride === "number"
                                ? `${allocation.hoursOverride} (override)"`
                                : typeof allocation.hoursComputed === "number"
                                  ? String(allocation.hoursComputed)
                                  : "-";
                            return (
                              <TableRow
                                key={String(allocation._id)}
                                data-testid={`allocation-row-${allocation._id}`}
                              >
                                <TableCell className="py-2">
                                  <div className="leading-tight">
                                    <div className="font-medium text-sm">
                                      {lecturer?.fullName ||
                                        allocation.lecturerId}
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
                                    data-testid={`change-type-btn-${allocation._id}`}
                                    className="text-xs underline"
                                    onClick={async () => {
                                      const input = prompt(
                                        "Change allocation type (teaching/admin)",
                                        allocation.type,
                                      );
                                      if (input === null) return;
                                      const next = input.trim().toLowerCase();
                                      if (
                                        next !== "teaching" &&
                                        next !== "admin"
                                      ) {
                                        toast({
                                          title: "Invalid type",
                                          description:
                                            "Type must be 'teaching' or 'admin'",
                                          variant: "destructive",
                                        });
                                        return;
                                      }
                                      await withToast(
                                        () =>
                                          updateAllocation({
                                            allocationId: allocation._id,
                                            type: next,
                                          } as any),
                                        {
                                          success: {
                                            title: "Allocation updated",
                                            description: `Type set to ${next}`,
                                          },
                                          error: { title: "Update failed" },
                                        },
                                        toast,
                                      );
                                    }}
                                  >
                                    Type
                                  </button>
                                  <button
                                    data-testid={`edit-hours-btn-${allocation._id}`}
                                    className="text-xs underline"
                                    onClick={async () => {
                                      const input = prompt(
                                        "Set hours override (leave blank to clear)",
                                        typeof allocation.hoursOverride ===
                                          "number"
                                          ? String(allocation.hoursOverride)
                                          : "",
                                      );
                                      if (input === null) return; // cancelled
                                      const trimmed = input.trim();
                                      if (trimmed === "") {
                                        await withToast(
                                          () =>
                                            updateAllocation({
                                              allocationId: allocation._id,
                                              hoursOverride: null,
                                            } as any),
                                          {
                                            success: {
                                              title: "Override cleared",
                                              description:
                                                "Hours override removed; using computed hours.",
                                            },
                                            error: { title: "Update failed" },
                                          },
                                          toast,
                                        );
                                      } else {
                                        const value = Number(trimmed);
                                        if (
                                          !Number.isFinite(value) ||
                                          value < 0 ||
                                          value > 1000
                                        ) {
                                          toast({
                                            title: "Update failed",
                                            description:
                                              "Enter a number between 0 and 1000",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                        await withToast(
                                          () =>
                                            updateAllocation({
                                              allocationId: allocation._id,
                                              hoursOverride: value,
                                            } as any),
                                          {
                                            success: {
                                              title: "Allocation updated",
                                              description: `Override set to ${value}h`,
                                            },
                                            error: { title: "Update failed" },
                                          },
                                          toast,
                                        );
                                      }
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    data-testid={`remove-allocation-btn-${allocation._id}`}
                                    className="text-xs text-destructive underline"
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          `Are you sure you want to remove ${lecturer?.fullName || allocation.lecturerId} from this group?`,
                                        )
                                      ) {
                                        await withToast(
                                          () =>
                                            removeAllocation({
                                              allocationId: allocation._id,
                                            } as any),
                                          {
                                            success: {
                                              title: "Allocation removed",
                                              description: `Lecturer ${lecturer?.fullName || allocation.lecturerId} removed from group.`,
                                            },
                                            error: {
                                              title:
                                                "Error removing allocation",
                                            },
                                          },
                                          toast,
                                        );
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
          ) : null}
        </>
      ) : (
        <Button
          data-testid="create-iteration-btn"
          size="sm"
          variant="secondary"
          disabled={isCreating}
          onClick={async () => {
            try {
              setIsCreating(true);
              await withToast(
                () =>
                  createIteration({
                    moduleId: moduleId as any,
                    academicYearId: (currentYear as any)._id,
                  } as any),
                {
                  success: {
                    title: "Iteration created",
                    description:
                      "Module iteration has been created successfully.",
                  },
                  error: { title: "Failed to create iteration" },
                },
                toast,
              );
            } finally {
              setIsCreating(false);
            }
          }}
        >
          {isCreating ? "Creating…" : "Create iteration (selected AY)"}
        </Button>
      )}
    </div>
  );
}
