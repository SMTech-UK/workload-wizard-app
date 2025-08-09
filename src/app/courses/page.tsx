"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

export default function CoursesPage() {
  const { user } = useUser();
  const organisationId = (user?.publicMetadata?.organisationId as string) || "";
  const courses = useQuery(
    api.courses.listByOrganisation,
    organisationId
      ? ({
          organisationId: organisationId as string & {
            __tableName: "organisations";
          },
        } as any)
      : ("skip" as any),
  );

  const createCourse = useMutation(api.courses.create);
  const [form, setForm] = useState({ code: "", name: "" });
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
      subtitle="View courses and manage years"
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
                await createCourse({ code: form.code.trim(), name: form.name.trim() } as any);
                setForm({ code: "", name: "" });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="CSE100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Computer Science"
                />
              </div>
              <button className="btn btn-primary w-full" disabled={!canSubmit} type="submit">
                Create
              </button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>All Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.isArray(courses) && courses.length ? (
                <ul className="divide-y">
                  {courses.map((c: any) => (
                    <li key={c._id} className="py-2">
                      <Link href={`/courses/${c._id}`} className="hover:underline">
                        <span className="font-medium">{c.code}</span> — {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No courses yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  );
}
