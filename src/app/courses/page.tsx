"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CoursesPage() {
  const { user } = useUser();
  const organisationId = (user?.publicMetadata?.organisationId as string) || "";

  const courses = useQuery(
    api.courses.listByOrganisation,
    organisationId
      ? {
          organisationId: organisationId as string & {
            __tableName: "organisations";
          },
        }
      : "skip",
  );

  const createCourse = useMutation(api.courses.create);
  const [form, setForm] = useState({
    code: "",
    name: "",
    leaderProfileId: "",
    studentCount: "",
    campuses: "",
  });
  const [leaders, setLeaders] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  useEffect(() => {
    // Lightweight leader list via lecturer_profiles.list using Clerk subject
    // We can't call directly without user id here; skip population for now
    setLeaders([]);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = useMemo(
    () => form.code.trim().length > 0 && form.name.trim().length > 0,
    [form],
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Courses" },
      ]}
      title="Courses"
      subtitle="Create and manage courses for your organisation"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Create Course</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                try {
                  const payload: any = {
                    code: form.code.trim(),
                    name: form.name.trim(),
                  };
                  if (form.leaderProfileId)
                    payload.leaderProfileId = form.leaderProfileId as string & {
                      __tableName: "lecturer_profiles";
                    };
                  if (form.studentCount)
                    payload.studentCount = Number(form.studentCount);
                  if (form.campuses)
                    payload.campuses = form.campuses
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                  await createCourse(payload);
                  setForm({
                    code: "",
                    name: "",
                    leaderProfileId: "",
                    studentCount: "",
                    campuses: "",
                  });
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Failed to create course",
                  );
                }
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value }))
                  }
                  placeholder="BSC-COMP"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="BSc Computer Science"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leader">
                  Course Leader (Lecturer Profile ID)
                </Label>
                <Input
                  id="leader"
                  value={form.leaderProfileId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, leaderProfileId: e.target.value }))
                  }
                  placeholder="lecturer_profile_id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="students">Student Count</Label>
                <Input
                  id="students"
                  type="number"
                  min={0}
                  value={form.studentCount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, studentCount: e.target.value }))
                  }
                  placeholder="e.g. 120"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campuses">Campuses (comma separated)</Label>
                <Input
                  id="campuses"
                  value={form.campuses}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, campuses: e.target.value }))
                  }
                  placeholder="Main, City, West"
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 border border-red-200 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
              <Button type="submit" disabled={!canSubmit} className="w-full">
                Create
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>All Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {courses?.length ? (
                <ul className="divide-y">
                  {courses.map((c) => (
                    <li
                      key={c._id}
                      className="py-2 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{c.code}</div>
                        <div className="text-sm text-muted-foreground">
                          {c.name}
                        </div>
                      </div>
                      <Link
                        href={`/courses/${c._id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No courses yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  );
}
