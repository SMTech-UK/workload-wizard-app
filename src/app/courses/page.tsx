"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { EditCourseForm } from "@/components/domain/EditCourseForm";
import { PermissionGate } from "@/components/common/PermissionGate";
import { GenericDeleteModal } from "@/components/domain/GenericDeleteModal";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2 } from "lucide-react";
import { withToast } from "@/lib/utils";

export default function CoursesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  // Derive organisation on the server from the authenticated actor, not from client public metadata
  const courses = useQuery((api as any).courses.listForActor);

  const createCourse = useMutation(api.courses.create);
  const deleteCourse = useMutation(api.courses.remove);
  const [form, setForm] = useState({ code: "", name: "", campuses: "" });
  const codeAvailability = useQuery(
    (api as any).courses.isCodeAvailable,
    form.code.trim() ? ({ code: form.code.trim() } as any) : ("skip" as any),
  ) as { available: boolean } | undefined;
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [deletingCourse, setDeletingCourse] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState<
    Set<string>
  >(new Set());

  const canSubmit = useMemo(
    () =>
      form.code.trim().length > 0 &&
      form.name.trim().length > 0 &&
      (codeAvailability ? codeAvailability.available : true),
    [form, codeAvailability],
  );

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCourse({
        code: form.code.trim(),
        name: form.name.trim(),
        ...(form.campuses.trim()
          ? {
              campuses: form.campuses
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : {}),
      } as any);
      setForm({ code: "", name: "", campuses: "" });
      toast({
        title: "Course created",
        description: `${form.code.trim()} has been created successfully.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Failed to create course",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
  };

  const handleDeleteCourse = (course: any) => {
    setDeletingCourse(course);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    const toDelete = deletingCourse;
    setIsDeleting(true);
    try {
      setOptimisticallyRemovedIds((prev) => {
        const next = new Set(prev);
        next.add(String(toDelete._id));
        return next;
      });
      await withToast(
        () => deleteCourse({ id: toDelete._id as any }),
        {
          success: {
            title: "Course deleted",
            description: `${toDelete.code} has been deleted successfully.`,
          },
          error: { title: "Failed to delete course" },
        },
        toast,
      );
      setDeletingCourse(null);
    } catch (error) {
      // handled by withToast
      setOptimisticallyRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(String(toDelete._id));
        return next;
      });
    } finally {
      setIsDeleting(false);
      setTimeout(() => {
        setOptimisticallyRemovedIds((prev) => {
          const next = new Set(prev);
          next.delete(String(toDelete._id));
          return next;
        });
      }, 600);
    }
  };

  const handleCourseUpdated = () => {
    setEditingCourse(null);
  };

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
            <form className="space-y-3" onSubmit={handleCreateCourse}>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value }))
                  }
                  placeholder="CSE100"
                />
                {form.code.trim() &&
                  codeAvailability &&
                  !codeAvailability.available && (
                    <p className="text-xs text-destructive">
                      Course code already exists in your organisation
                    </p>
                  )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Computer Science"
                />
              </div>
              {/* Campuses chip multi-select */}
              <div className="space-y-2">
                <Label>Campuses (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {(form.campuses || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const list = (form.campuses || "")
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .filter((x) => x !== c);
                          setForm((f) => ({ ...f, campuses: list.join(", ") }));
                        }}
                        className="px-2 py-1 rounded-full text-xs bg-muted hover:bg-muted/70"
                        title="Click to remove"
                      >
                        {c} ×
                      </button>
                    ))}
                </div>
                <div className="flex gap-2">
                  <select
                    className="h-9 rounded-md border px-2 bg-background"
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const list = (form.campuses || "")
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (!list.includes(val)) list.push(val);
                      setForm((f) => ({ ...f, campuses: list.join(", ") }));
                      e.currentTarget.value = "";
                    }}
                  >
                    <option value="">Add campus…</option>
                    {(
                      (useQuery as any)(api.organisationSettings.getForActor) ||
                      {}
                    )?.campusOptions?.map((c: string) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <PermissionGate
                permission="courses.create"
                fallback={
                  <Button
                    data-testid="create-course-disabled"
                    className="w-full"
                    disabled
                    title="Insufficient permissions"
                  >
                    Create
                  </Button>
                }
              >
                <Button
                  data-testid="create-course"
                  className="w-full"
                  disabled={!canSubmit}
                  type="submit"
                >
                  Create
                </Button>
              </PermissionGate>
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
                    <li key={c._id} className="py-3">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/courses/${c._id}`}
                          className="hover:underline flex-1"
                        >
                          <span className="font-medium">{c.code}</span> —{" "}
                          {c.name}
                        </Link>
                        <div className="flex items-center space-x-2">
                          <PermissionGate
                            permission="courses.edit"
                            fallback={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-50 cursor-not-allowed"
                                disabled
                                title="Insufficient permissions"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCourse(c)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </PermissionGate>
                          <PermissionGate
                            permission="courses.delete"
                            fallback={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 opacity-50 cursor-not-allowed"
                                disabled
                                title="Insufficient permissions"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            }
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCourse(c)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </div>
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

      {/* Edit Course Modal */}
      {editingCourse && (
        <EditCourseForm
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onCourseUpdated={handleCourseUpdated}
        />
      )}

      {/* Delete Course Modal */}
      {deletingCourse && (
        <GenericDeleteModal
          entityType="Course"
          entityName={deletingCourse.name}
          entityCode={deletingCourse.code}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingCourse(null)}
          isDeleting={isDeleting}
        />
      )}
    </StandardizedSidebarLayout>
  );
}
