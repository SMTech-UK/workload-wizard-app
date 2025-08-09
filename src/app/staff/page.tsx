"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { useAcademicYear } from "@/components/providers/AcademicYearProvider";

export default function StaffCapacityPage() {
  const { currentYear } = useAcademicYear();
  const { user } = useUser();

  const profiles = useQuery(
    (api as any).staff.list,
    user?.id ? ({ userId: user.id } as any) : ("skip" as any),
  ) as Array<any> | undefined;

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Staff" },
      ]}
      title="Staff capacity"
      subtitle={
        currentYear ? `Academic Year: ${currentYear.name}` : "Select an academic year"
      }
    >
      <div className="space-y-4">
        {(!Array.isArray(profiles) || profiles.length === 0) && (
          <div className="text-sm text-muted-foreground">No lecturer profiles yet.</div>
        )}
        {Array.isArray(profiles) && profiles.length > 0 && (
          <ul className="divide-y border rounded-md">
            {profiles.map((p) => (
              <a key={String(p._id)} href={`/staff/${p._id}`} className="block hover:bg-accent/50">
                <StaffRow profile={p} yearId={currentYear?._id} />
              </a>
            ))}
          </ul>
        )}
      </div>
    </StandardizedSidebarLayout>
  );
}

function StaffRow({ profile, yearId }: { profile: any; yearId?: any }) {
  const totals = useQuery(
    (api as any).allocations.computeLecturerTotals,
    profile && yearId
      ? ({ lecturerId: profile._id, academicYearId: yearId } as any)
      : ("skip" as any),
  ) as { allocatedTeaching: number; allocatedAdmin: number; allocatedTotal: number } | undefined;

  return (
    <li className="p-3 flex items-center justify-between text-sm">
      <div>
        <div className="font-medium">{profile.fullName}</div>
        <div className="text-muted-foreground">{profile.email}</div>
      </div>
      <div className="flex-1 px-4">
        <div className="w-full h-3 bg-muted rounded overflow-hidden">
          {(() => {
            const total = totals ? totals.allocatedTotal : 0;
            const percent = Math.max(0, Math.min(100, total));
            const color = percent < 80 ? "bg-emerald-500" : percent < 100 ? "bg-amber-500" : "bg-red-500";
            return <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />;
          })()}
        </div>
      </div>
      <div className="text-right">
        <div>Teaching: {totals ? totals.allocatedTeaching : 0}h</div>
        <div>Admin: {totals ? totals.allocatedAdmin : 0}h</div>
        <div className="font-medium">Total: {totals ? totals.allocatedTotal : 0}h</div>
      </div>
    </li>
  );
}


