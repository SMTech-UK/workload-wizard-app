"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { OrganisationForm } from "@/components/domain/OrganisationForm";
import { OrganisationsList } from "@/components/domain/OrganisationsList";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { hasAnyRole } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function AdminOrganisationsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const convexUser = useQuery(
    api.users.getBySubject,
    user?.id ? { subject: user.id } : "skip",
  );

  const hasByClerk =
    hasAnyRole(user, ["sysadmin", "developer"]) ||
    (user?.publicMetadata as Record<string, unknown> | undefined)?.[
      "devLoginSession"
    ] === true;
  const hasByConvex =
    !!convexUser &&
    Array.isArray(convexUser.systemRoles) &&
    convexUser.systemRoles.some(
      (r: string) => r === "sysadmin" || r === "developer",
    );

  useEffect(() => {
    if (isLoaded && !(hasByClerk || hasByConvex)) {
      router.replace("/unauthorised");
    }
  }, [isLoaded, hasByClerk, hasByConvex, router]);

  if (!isLoaded) return <p>Loading...</p>;

  if (!(hasByClerk || hasByConvex)) {
    return null; // Will redirect in useEffect
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Admin", href: "/admin" },
    { label: "Organisations" },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Organisation Management"
      subtitle="Manage organisations and their settings"
      headerActions={headerActions}
    >
      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sidebar - Create Organisation Form */}
        <div className="xl:col-span-1">
          <OrganisationForm />
        </div>

        {/* Main Content - Organisations List */}
        <div className="xl:col-span-2">
          <OrganisationsList />
        </div>
      </div>
    </StandardizedSidebarLayout>
  );
}
