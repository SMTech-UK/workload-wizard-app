"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaffProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params?.id as string;
  const profile = useQuery(
    (api as any).staff.get,
    profileId ? ({ profileId: profileId as any } as any) : ("skip" as any),
  );

  const adminAllocations = useQuery(
    (api as any).adminAllocations?.listForLecturer,
    "skip" as any,
  );
  const groupAllocations = useQuery(
    (api as any).allocations.listForLecturer,
    "skip" as any,
  );

  if (!profile) {
    return (
      <StandardizedSidebarLayout
        breadcrumbs={[{ label: "Staff", href: "/staff" }, { label: "Profile" }]}
        title="Lecturer Profile"
      >
        <div className="text-sm text-muted-foreground">Loading…</div>
      </StandardizedSidebarLayout>
    );
  }

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Staff", href: "/staff" },
        { label: profile.fullName },
      ]}
      title={profile.fullName}
      subtitle={profile.email}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Role: {profile.role || "—"}</div>
            <div>Team: {profile.teamName || "—"}</div>
            <div>Contract: {profile.contract}</div>
            <div>FTE: {profile.fte}</div>
            <div>Max Teaching: {profile.maxTeachingHours}h</div>
            <div>Total Contract: {profile.totalContract}h</div>
            <div>Pref Location: {profile.prefWorkingLocation || "—"}</div>
            <div>Specialism: {profile.prefSpecialism || "—"}</div>
            <div>Notes: {profile.prefNotes || "—"}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Module Allocations (current AY)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Coming soon: list allocations scoped to selected AY.
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Admin Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Coming soon: list admin allocations by category.
            </div>
          </CardContent>
        </Card>
      </div>
    </StandardizedSidebarLayout>
  );
}
