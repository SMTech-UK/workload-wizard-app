"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { useAcademicYear } from "@/components/providers/AcademicYearProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ModulesPage() {
  const modules = useQuery(api.modules.listByOrganisation);
  const { currentYear } = useAcademicYear();
  const create = useMutation(api.modules.create);

  const [form, setForm] = useState({ code: "", name: "", credits: "" });
  const canSubmit = useMemo(
    () => form.code.trim().length > 0 && form.name.trim().length > 0,
    [form],
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Modules" },
      ]}
      title="Modules"
      subtitle="Create and manage modules"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Create Module</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                await create({
                  code: form.code.trim(),
                  name: form.name.trim(),
                  ...(form.credits.trim()
                    ? { credits: Number(form.credits) }
                    : {}),
                });
                setForm({ code: "", name: "", credits: "" });
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
                  placeholder="MOD101"
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
                  placeholder="Introduction to Something"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Credits (optional)</Label>
                <Input
                  id="credits"
                  type="number"
                  inputMode="numeric"
                  value={form.credits}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, credits: e.target.value }))
                  }
                  placeholder="20"
                />
              </div>
              <Button type="submit" disabled={!canSubmit} className="w-full">
                Create
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              All Modules {currentYear ? `— ${currentYear.name}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {modules?.length ? (
                <ul className="divide-y">
                  {modules.map((m) => (
                    <li
                      key={m._id}
                      className="py-2 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{m.code}</div>
                        <div className="text-sm text-muted-foreground">
                          {m.name}
                          {typeof m.credits === "number"
                            ? ` · ${m.credits} credits`
                            : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No modules yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  );
}
