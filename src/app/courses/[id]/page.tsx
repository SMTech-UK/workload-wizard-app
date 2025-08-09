"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id as string;

  const course = useQuery(
    api.courses.getById,
    courseId ? { id: courseId as string & { __tableName: "courses" } } : "skip",
  );
  const years = useQuery(
    api.courses.listYears,
    courseId
      ? { courseId: courseId as string & { __tableName: "courses" } }
      : "skip",
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
        { label: course.code },
      ]}
      title={`${course.code} — ${course.name}`}
    >
      <Tabs defaultValue="years" className="w-full">
        <TabsList>
          <TabsTrigger value="years">Years</TabsTrigger>
        </TabsList>
        <TabsContent value="years">
          <div className="mb-6 text-sm text-muted-foreground">
            {course.leaderProfileId && (
              <div>
                Leader Profile: <code>{String(course.leaderProfileId)}</code>
              </div>
            )}
            {typeof course.studentCount === "number" && (
              <div>Students: {course.studentCount}</div>
            )}
            {Array.isArray(course.campuses) && course.campuses.length > 0 && (
              <div>Campuses: {course.campuses.join(", ")}</div>
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
                await addYear({ courseId: course._id, yearNumber });
                setYearInput(String(yearNumber + 1));
              }}
            >
              Add Year
            </Button>
          </div>
          <div>
            {years?.length ? (
              <ul className="flex gap-2 flex-wrap">
                {years.map((y) => (
                  <li key={y._id}>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-sm">
                      Y{y.yearNumber}
                    </span>
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
