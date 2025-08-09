"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";

export default function CreateLecturerProfilePage() {
  const { user } = useUser();
  const create = useMutation((api as any).staff.create);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "Lecturer",
    teamName: "",
    contract: "FT",
    fte: "1.0",
    maxTeachingHours: "400",
    totalContract: "550",
    prefWorkingLocation: "",
    prefSpecialism: "",
    prefNotes: "",
  });

  const canSubmit = useMemo(
    () => form.fullName.trim() && form.email.trim(),
    [form],
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[{ label: "Staff", href: "/staff" }, { label: "Create Profile" }]}
      title="Create Lecturer Profile"
    >
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await create({
                userId: user!.id,
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                role: form.role.trim(),
                teamName: form.teamName.trim(),
                contract: form.contract,
                fte: Number(form.fte),
                maxTeachingHours: Number(form.maxTeachingHours),
                totalContract: Number(form.totalContract),
                prefWorkingLocation: form.prefWorkingLocation.trim(),
                prefSpecialism: form.prefSpecialism.trim(),
                prefNotes: form.prefNotes.trim(),
              } as any);
              window.location.href = "/staff";
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="fullName">Name</Label>
              <Input id="fullName" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Input id="team" value={form.teamName} onChange={(e) => setForm((f) => ({ ...f, teamName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract">Contract</Label>
              <Input id="contract" value={form.contract} onChange={(e) => setForm((f) => ({ ...f, contract: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fte">FTE</Label>
              <Input id="fte" type="number" inputMode="decimal" value={form.fte} onChange={(e) => setForm((f) => ({ ...f, fte: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTeaching">Max Teaching Hours</Label>
              <Input id="maxTeaching" type="number" inputMode="numeric" value={form.maxTeachingHours} onChange={(e) => setForm((f) => ({ ...f, maxTeachingHours: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalContract">Total Contract Hours</Label>
              <Input id="totalContract" type="number" inputMode="numeric" value={form.totalContract} onChange={(e) => setForm((f) => ({ ...f, totalContract: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="prefWork">Preferred Working Location</Label>
              <Input id="prefWork" value={form.prefWorkingLocation} onChange={(e) => setForm((f) => ({ ...f, prefWorkingLocation: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="specialism">Specialism</Label>
              <Input id="specialism" value={form.prefSpecialism} onChange={(e) => setForm((f) => ({ ...f, prefSpecialism: e.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={form.prefNotes} onChange={(e) => setForm((f) => ({ ...f, prefNotes: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full" disabled={!canSubmit || !user?.id}>
                Create Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </StandardizedSidebarLayout>
  );
}


