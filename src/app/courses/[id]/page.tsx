"use client";

import { useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAcademicYear } from "@/components/providers/AcademicYearProvider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id as string;

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
  const canAdd = useMemo(() => {
    const val = Number(yearInput);
    return Number.isFinite(val) && val >= 1 && val <= 10;
  }, [yearInput]);

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
                type="number"
                min={1}
                max={10}
                value={yearInput}
                onChange={(e) => setYearInput(e.target.value)}
                className="w-24"
              />
            </div>
            <Button
              disabled={!canAdd}
              onClick={async () => {
                const yearNumber = Number(yearInput);
                await addYear({ courseId: course._id, yearNumber } as any);
                setYearInput(String(yearNumber + 1));
              }}
            >
              Add Year
            </Button>
          </div>
          <div>
            {Array.isArray(years) && years.length ? (
              <ul className="flex gap-2 flex-wrap">
                {years.map((y: any) => (
                  <li key={y._id} className="basis-full">
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
  const attached = useQuery(api.modules.listForCourseYear, {
    courseYearId: yearId as string & { __tableName: "course_years" },
  } as any);
  const allModules = useQuery(api.modules.listByOrganisation);
  const attach = useMutation(api.modules.attachToCourseYear);
  const detach = useMutation(api.modules.detachFromCourseYear);

  const [selected, setSelected] = useState<string>("");
  const [isCore, setIsCore] = useState<boolean>(true);

  const available = useMemo(() => {
    const used = new Set(
      (attached || []).map((a: any) => String(a.module?._id)),
    );
    return (allModules || []).filter((m: any) => !used.has(String(m._id)));
  }, [attached, allModules]);

  return (
    <div className="border rounded-md p-3">
      <div className="flex items-end gap-2">
        <div className="w-64">
          <Label>Attach Module</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
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
        </div>
        <div>
          <Label className="block">Core?</Label>
          <button
            type="button"
            className={`px-3 py-2 border rounded-md text-sm ${isCore ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            onClick={() => setIsCore((v) => !v)}
          >
            {isCore ? "Core" : "Optional"}
          </button>
        </div>
        <Button
          disabled={!selected}
          onClick={async () => {
            await attach({
              courseYearId: yearId as any,
              moduleId: selected as any,
              isCore,
            });
            setSelected("");
          }}
        >
          Attach
        </Button>
      </div>
      <div className="mt-3">
        {attached?.length ? (
          <ul className="flex gap-2 flex-wrap">
            {attached.map((a: any) => (
              <li key={a.link._id}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-sm">
                  <span>
                    {a.module?.code} {a.link.isCore ? "(Core)" : "(Optional)"}
                  </span>
                  <ModuleIterationAndGroupsAndAllocations moduleId={String(a.module?._id)} />
                  <button
                    className="ml-1 text-destructive"
                    onClick={async () => {
                      await detach({
                        courseYearId: yearId as any,
                        moduleId: a.module?._id as any,
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
    </div>
  );
}

function ModuleIterationAndGroupsAndAllocations({ moduleId }: { moduleId: string }) {
  const { currentYear } = useAcademicYear();
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
    hasIteration ? ({ moduleIterationId: (iteration as any)._id } as any) : ("skip" as any),
  );
  const createGroup = useMutation((api as any).groups.create);

  // Allocations UI bits
  const profiles = useQuery((api as any).staff.list, (api as any) ? ({ userId: "me" } as any) : ("skip" as any));
  const assign = useMutation((api as any).allocations.assignLecturer);
  const removeAllocation = useMutation((api as any).allocations.remove);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>("");
  const [hoursOverride, setHoursOverride] = useState<string>("");
  const listAllocations = useQuery(
    (api as any).allocations.listForGroup,
    selectedGroupId ? ({ groupId: selectedGroupId as any } as any) : ("skip" as any),
  ) as Array<{ allocation: any; lecturer: any }> | undefined;

  if (!currentYear) return <span className="text-muted-foreground">Select AY</span>;

  return (
    <div className="inline-flex items-center gap-2">
      {hasIteration ? (
        <>
          <span className="text-emerald-700">Iteration: {currentYear.name}</span>
          <button
            className="text-xs underline"
            onClick={async () => {
              const name = prompt("Group name?");
              if (!name) return;
              await createGroup({
                moduleIterationId: (iteration as any)._id,
                name,
              } as any);
            }}
          >
            + Add Group
          </button>
          {Array.isArray(groups) && groups.length > 0 ? (
            <span className="text-xs text-muted-foreground">{groups.length} group(s)</span>
          ) : null}
          {Array.isArray(groups) && groups.length > 0 ? (
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger asChild>
                <button className="text-xs underline">Assign lecturer</button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Lecturer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Group</Label>
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
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
                  <div>
                    <Label>Lecturer</Label>
                    <Select value={selectedLecturerId} onValueChange={setSelectedLecturerId}>
                      <SelectTrigger>
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
                      type="number"
                      inputMode="decimal"
                      value={hoursOverride}
                      onChange={(e) => setHoursOverride(e.target.value)}
                      placeholder="Enter number of hours"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={!selectedGroupId || !selectedLecturerId}
                    onClick={async () => {
                      await assign({
                        groupId: selectedGroupId as any,
                        lecturerId: selectedLecturerId as any,
                        academicYearId: (currentYear as any)._id,
                        organisationId:
                          (groups as any[])[0]?.organisationId ||
                          (iteration as any)?.organisationId,
                        type: "teaching",
                        ...(hoursOverride.trim()
                          ? { hoursOverride: Number(hoursOverride) }
                          : {}),
                      } as any);
                      setAssignOpen(false);
                      setSelectedGroupId("");
                      setSelectedLecturerId("");
                      setHoursOverride("");
                    }}
                  >
                    Assign
                  </Button>
                </DialogFooter>
                {!!selectedGroupId && Array.isArray(listAllocations) && (
                  <div className="mt-4 border-t pt-3 space-y-2">
                    <div className="text-sm font-medium">Existing allocations</div>
                    {listAllocations.length === 0 ? (
                      <div className="text-sm text-muted-foreground">None</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lecturer</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="w-24 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {listAllocations.map(({ allocation, lecturer }) => {
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
                                <TableCell className="py-2 text-right">
                                  <button
                                    className="text-xs text-destructive underline"
                                    onClick={async () => {
                                      await removeAllocation({ allocationId: allocation._id } as any);
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
          size="sm"
          variant="secondary"
          disabled={isCreating}
          onClick={async () => {
            try {
              setIsCreating(true);
              await createIteration({
                moduleId: moduleId as any,
                academicYearId: (currentYear as any)._id,
              } as any);
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
