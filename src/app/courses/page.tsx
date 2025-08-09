"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";

export default function CoursesPage() {
  const { user } = useUser();
  const organisationId = (user?.publicMetadata?.organisationId as string) || "";
  const courses = useQuery(
    api.courses.listByOrganisation,
    organisationId
      ? ({
          organisationId: organisationId as string & {
            __tableName: "organisations";
          },
        } as any)
      : ("skip" as any),
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Courses" },
      ]}
      title="Courses"
      subtitle="View courses and manage years"
    >
      <div className="space-y-2">
        {Array.isArray(courses) && courses.length ? (
          <ul className="divide-y">
            {courses.map((c: any) => (
              <li key={c._id} className="py-2">
                <Link href={`/courses/${c._id}`} className="hover:underline">
                  <span className="font-medium">{c.code}</span> — {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted-foreground">No courses yet.</div>
        )}
      </div>
    </StandardizedSidebarLayout>
  );
}
