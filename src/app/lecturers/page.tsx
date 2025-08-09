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

export default function LecturersPage() {
  const { user } = useUser();
  const profiles = useQuery(
    api.staff.list,
    user?.id ? { userId: user.id } : "skip",
  );
  const createProfile = useMutation(api.staff.create);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    contract: "FT",
    fte: "1.0",
    maxTeachingHours: "1200",
    totalContract: "1498",
  });
  const canSubmit = useMemo(
    () => form.fullName.trim().length > 0 && form.email.trim().length > 0,
    [form],
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Lecturers" },
      ]}
      title="Lecturers"
      subtitle="Create and manage lecturer profiles"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Create Lecturer</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                await createProfile({
                  fullName: form.fullName.trim(),
                  email: form.email.trim(),
                  contract: form.contract as any,
                  fte: Number(form.fte),
                  maxTeachingHours: Number(form.maxTeachingHours),
                  totalContract: Number(form.totalContract),
                  userId: user!.id,
                });
                setForm({
                  fullName: "",
                  email: "",
                  contract: "FT",
                  fte: "1.0",
                  maxTeachingHours: "1200",
                  totalContract: "1498",
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract">Contract</Label>
                <Input
                  id="contract"
                  value={form.contract}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contract: e.target.value }))
                  }
                  placeholder="FT | PT | Bank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fte">FTE</Label>
                <Input
                  id="fte"
                  type="number"
                  step="0.1"
                  min={0}
                  max={1}
                  value={form.fte}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fte: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mth">Max Teaching Hours</Label>
                <Input
                  id="mth"
                  type="number"
                  min={0}
                  value={form.maxTeachingHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxTeachingHours: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc">Total Contract Hours</Label>
                <Input
                  id="tc"
                  type="number"
                  min={0}
                  value={form.totalContract}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, totalContract: e.target.value }))
                  }
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
            <CardTitle>All Lecturers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profiles?.length ? (
                <ul className="divide-y">
                  {profiles.map((p) => (
                    <li key={p._id} className="py-2">
                      <div className="font-medium">{p.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        {p.email}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No lecturers yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  );
}
