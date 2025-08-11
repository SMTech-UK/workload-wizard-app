"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Course {
  _id: string;
  code: string;
  name: string;
  leaderProfileId?: string;
  studentCount?: number;
  campuses?: string[];
}

interface EditCourseFormProps {
  course: Course;
  onClose: () => void;
  onCourseUpdated: () => void;
}

export function EditCourseForm({
  course,
  onClose,
  onCourseUpdated,
}: EditCourseFormProps) {
  const { toast } = useToast();
  const updateCourse = useMutation(api.courses.update);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    code: course.code,
    name: course.name,
    studentCount: course.studentCount?.toString() || "",
    campuses: course.campuses?.join(", ") || "",
  });
  const codeAvailability = useQuery((api as any).courses.isCodeAvailable, {
    code: form.code,
    excludeId: course._id as any,
  } as any) as { available: boolean } | undefined;

  const canSubmit =
    form.code.trim().length > 0 &&
    form.name.trim().length > 0 &&
    (codeAvailability ? codeAvailability.available : true);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      await updateCourse({
        id: course._id as any,
        code: form.code.trim(),
        name: form.name.trim(),
        ...(form.studentCount.trim()
          ? { studentCount: Number(form.studentCount) }
          : {}),
        ...(form.campuses.trim()
          ? {
              campuses: form.campuses
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : {}),
      });

      toast({
        title: "Course updated",
        description: `${form.code.trim()} has been updated successfully.`,
        variant: "success",
      });

      onCourseUpdated();
      onClose();
    } catch (error) {
      toast({
        title: "Failed to update course",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/20 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Edit Course</CardTitle>
              <CardDescription>Update course details</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                placeholder="CSE100"
                required
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
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Computer Science"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentCount">Student Count</Label>
              <Input
                id="studentCount"
                type="number"
                value={form.studentCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, studentCount: e.target.value }))
                }
                placeholder="100"
              />
            </div>

            {/* Campuses chip multi-select */}
            <div className="space-y-2">
              <Label>Campuses</Label>
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

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="flex-1"
              >
                {isLoading ? "Updating..." : "Update Course"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
