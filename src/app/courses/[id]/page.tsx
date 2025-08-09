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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
                  <ModuleIterationControl moduleId={String(a.module?._id)} />
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

function ModuleIterationControl({ moduleId }: { moduleId: string }) {
  const iteration = useQuery(api.modules.getIterationForDefaultYear, {
    moduleId: moduleId as any,
  } as any);
  const create = useMutation(api.modules.createIterationForDefaultYear);

  const [isCreating, setIsCreating] = useState(false);
  const hasIteration = Boolean(iteration?._id);

  return hasIteration ? (
    <span className="text-emerald-700">AY iteration created</span>
  ) : (
    <Button
      size="sm"
      variant="secondary"
      disabled={isCreating}
      onClick={async () => {
        try {
          setIsCreating(true);
          await create({ moduleId: moduleId as any } as any);
        } finally {
          setIsCreating(false);
        }
      }}
    >
      {isCreating ? "Creating…" : "Create iteration (current AY)"}
    </Button>
  );
}
