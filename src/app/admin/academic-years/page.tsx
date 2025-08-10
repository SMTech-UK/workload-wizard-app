"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { withToast } from "@/lib/utils";
import { useFeatureFlag, FeatureFlags } from "@/hooks/useFeatureFlag";

export default function AcademicYearsAdminPage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isSettingStatus, setIsSettingStatus] = useState<string | null>(null);

  const years = useQuery(
    (api as any).academicYears.listForOrganisation,
    user?.id ? ({ userId: user.id } as any) : ("skip" as any),
  ) as any[] | undefined;

  const create = useMutation((api as any).academicYears.create);
  const update = useMutation((api as any).academicYears.update);
  const setStatus = useMutation((api as any).academicYears.setStatus);
  const cloneYear = useMutation((api as any).academicYears.clone);
  const bulkSetStatus = useMutation((api as any).academicYears.bulkSetStatus);

  const { enabled: bulkEnabled } = useFeatureFlag(
    FeatureFlags.ACADEMIC_YEAR_BULK_OPS,
  );

  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    status: "draft" as "draft" | "published",
    isDefaultForOrg: false,
  });

  const canCreate = useMemo(
    () => form.name.trim() && form.startDate && form.endDate,
    [form],
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Academic Years" },
      ]}
      title="Academic Years (Admin)"
      subtitle="Create, publish, archive, and set default year"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Create Academic Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="2025/26"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">Start date</Label>
                <Input
                  id="start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End date</Label>
                <Input
                  id="end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isDefaultForOrg}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        isDefaultForOrg: e.target.checked,
                      }))
                    }
                  />
                  Set as default for organisation
                </label>
              </div>
              <Button
                className="w-full"
                disabled={!canCreate || !user?.id || isLoading}
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await withToast(
                      () =>
                        create({
                          userId: user!.id,
                          name: form.name.trim(),
                          startDate: form.startDate,
                          endDate: form.endDate,
                          status: form.status,
                          isDefaultForOrg: form.isDefaultForOrg,
                        } as any),
                      {
                        success: {
                          title: "Academic Year Created",
                          description: `Academic year "${form.name.trim()}" has been created successfully.`,
                        },
                        error: { title: "Failed to create academic year" },
                      },
                      toast,
                    );
                    setForm({
                      name: "",
                      startDate: "",
                      endDate: "",
                      status: "draft",
                      isDefaultForOrg: false,
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                {isLoading ? "Creating..." : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Years</CardTitle>
              {bulkEnabled && Array.isArray(years) && years.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select
                    value={""}
                    onValueChange={async (v) => {
                      if (!user?.id) return;
                      const ids = years.map((y) => y._id);
                      setIsSettingStatus("bulk");
                      try {
                        await withToast(
                          () =>
                            bulkSetStatus({
                              userId: user!.id,
                              ids,
                              status: v,
                            } as any),
                          {
                            success: {
                              title: "Bulk Status Updated",
                              description: `All ${years.length} years → ${v}.`,
                            },
                            error: { title: "Failed bulk update" },
                          },
                          toast,
                        );
                      } finally {
                        setIsSettingStatus(null);
                      }
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Bulk set status…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Publish all</SelectItem>
                      <SelectItem value="draft">Mark all draft</SelectItem>
                      <SelectItem value="archived">Archive all</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.isArray(years) && years.length ? (
                <ul className="divide-y rounded border">
                  {years.map((y) => (
                    <li
                      key={String(y._id)}
                      className="p-3 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">
                          {y.name}{" "}
                          {y.isDefaultForOrg ? (
                            <span className="text-xs text-muted-foreground">
                              • default
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {y.startDate} → {y.endDate} · {y.status}
                          {y.staging ? " · staging" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUpdating === String(y._id)}
                          onClick={async () => {
                            setIsUpdating(String(y._id));
                            try {
                              await withToast(
                                () =>
                                  update({
                                    userId: user!.id,
                                    id: y._id,
                                    isDefaultForOrg: true,
                                  } as any),
                                {
                                  success: {
                                    title: "Default Set",
                                    description: `"${y.name}" is now the default academic year.`,
                                  },
                                  error: { title: "Failed to set default" },
                                },
                                toast,
                              );
                            } finally {
                              setIsUpdating(null);
                            }
                          }}
                        >
                          {isUpdating === String(y._id)
                            ? "Setting..."
                            : "Set default"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!user?.id) return;
                            setIsLoading(true);
                            try {
                              await withToast(
                                () =>
                                  cloneYear({
                                    userId: user!.id,
                                    sourceId: y._id,
                                    name: `${y.name} (copy)`,
                                    startDate: y.startDate,
                                    endDate: y.endDate,
                                  } as any),
                                {
                                  success: {
                                    title: "Year Cloned",
                                    description: `Created a draft copy of "${y.name}".`,
                                  },
                                  error: { title: "Failed to clone year" },
                                },
                                toast,
                              );
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                        >
                          Clone
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isSettingStatus === String(y._id)}
                          onClick={async () => {
                            setIsSettingStatus(String(y._id));
                            try {
                              await withToast(
                                () =>
                                  setStatus({
                                    userId: user!.id,
                                    id: y._id,
                                    status: "published",
                                  } as any),
                                {
                                  success: {
                                    title: "Status Updated",
                                    description: `"${y.name}" has been published.`,
                                  },
                                  error: { title: "Failed to publish" },
                                },
                                toast,
                              );
                            } finally {
                              setIsSettingStatus(null);
                            }
                          }}
                        >
                          {isSettingStatus === String(y._id)
                            ? "Publishing..."
                            : "Publish"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSettingStatus === String(y._id)}
                          onClick={async () => {
                            setIsSettingStatus(String(y._id));
                            try {
                              await withToast(
                                () =>
                                  setStatus({
                                    userId: user!.id,
                                    id: y._id,
                                    status: "draft",
                                  } as any),
                                {
                                  success: {
                                    title: "Status Updated",
                                    description: `"${y.name}" has been marked as draft.`,
                                  },
                                  error: { title: "Failed to update status" },
                                },
                                toast,
                              );
                            } finally {
                              setIsSettingStatus(null);
                            }
                          }}
                        >
                          {isSettingStatus === String(y._id)
                            ? "Updating..."
                            : "Mark draft"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isSettingStatus === String(y._id)}
                          onClick={async () => {
                            setIsSettingStatus(String(y._id));
                            try {
                              await withToast(
                                () =>
                                  setStatus({
                                    userId: user!.id,
                                    id: y._id,
                                    status: "archived",
                                  } as any),
                                {
                                  success: {
                                    title: "Status Updated",
                                    description: `"${y.name}" has been archived.`,
                                  },
                                  error: { title: "Failed to archive" },
                                },
                                toast,
                              );
                            } finally {
                              setIsSettingStatus(null);
                            }
                          }}
                        >
                          {isSettingStatus === String(y._id)
                            ? "Archiving..."
                            : "Archive"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No academic years found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  );
}
