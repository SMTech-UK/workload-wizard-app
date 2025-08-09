"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";

export default function AcademicYearsAdminPage() {
  const { user } = useUser();
  const years = useQuery(
    (api as any).academicYears.listForOrganisation,
    user?.id ? ({ userId: user.id } as any) : ("skip" as any),
  ) as any[] | undefined;

  const create = useMutation((api as any).academicYears.create);
  const update = useMutation((api as any).academicYears.update);
  const setStatus = useMutation((api as any).academicYears.setStatus);

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
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start">Start date</Label>
                <Input
                  id="start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End date</Label>
                <Input
                  id="end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}
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
                    onChange={(e) => setForm((f) => ({ ...f, isDefaultForOrg: e.target.checked }))}
                  />
                  Set as default for organisation
                </label>
              </div>
              <Button
                className="w-full"
                disabled={!canCreate || !user?.id}
                onClick={async () => {
                  await create({
                    userId: user!.id,
                    name: form.name.trim(),
                    startDate: form.startDate,
                    endDate: form.endDate,
                    status: form.status,
                    isDefaultForOrg: form.isDefaultForOrg,
                  } as any);
                  setForm({ name: "", startDate: "", endDate: "", status: "draft", isDefaultForOrg: false });
                }}
              >
                Create
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>All Years</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.isArray(years) && years.length ? (
                <ul className="divide-y rounded border">
                  {years.map((y) => (
                    <li key={String(y._id)} className="p-3 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {y.name} {y.isDefaultForOrg ? <span className="text-xs text-muted-foreground">• default</span> : null}
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
                          onClick={async () => {
                            await update({ userId: user!.id, id: y._id, isDefaultForOrg: true } as any);
                          }}
                        >
                          Set default
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            await setStatus({ userId: user!.id, id: y._id, status: "published" } as any);
                          }}
                        >
                          Publish
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await setStatus({ userId: user!.id, id: y._id, status: "draft" } as any);
                          }}
                        >
                          Mark draft
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={async () => {
                            await setStatus({ userId: user!.id, id: y._id, status: "archived" } as any);
                          }}
                        >
                          Archive
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No academic years found.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  );
}


