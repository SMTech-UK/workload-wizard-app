"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CampusesPage() {
  const { user } = useUser();
  const organisationId = (user?.publicMetadata?.organisationId as string) || "";
  const campuses = useQuery(
    api.campuses.listByOrganisation,
    organisationId
      ? {
          organisationId: organisationId as string & {
            __tableName: "organisations";
          },
        }
      : "skip",
  );
  const createCampus = useMutation(api.campuses.create);

  const [form, setForm] = useState({ code: "", name: "" });
  const canSubmit = useMemo(
    () => form.code.trim().length > 0 && form.name.trim().length > 0,
    [form],
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Campuses" },
      ]}
      title="Campuses"
      subtitle="Create and manage campuses"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Create Campus</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                await createCampus({
                  code: form.code.trim(),
                  name: form.name.trim(),
                });
                setForm({ code: "", name: "" });
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
                  placeholder="MAIN"
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
                  placeholder="Main Campus"
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
            <CardTitle>All Campuses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {campuses?.length ? (
                <ul className="divide-y">
                  {campuses.map((c) => (
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
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No campuses yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  );
}
