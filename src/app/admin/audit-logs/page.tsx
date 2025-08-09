"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { AuditLogsViewer } from "@/components/domain/AuditLogsViewer";
import { Button } from "@/components/ui/button";
import { Download, Settings } from "lucide-react";
import { hasAnyRole } from "@/lib/utils";

export default function AdminAuditLogsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded) {
      console.log("Debug - User metadata:", {
        roles: user?.publicMetadata?.roles,
        role: user?.publicMetadata?.role,
        fullMetadata: user?.publicMetadata,
        hasAnyRole: hasAnyRole(user, ["sysadmin", "developer"]),
      });

      if (!hasAnyRole(user, ["sysadmin", "developer"])) {
        console.log("Debug - Access denied, redirecting to unauthorised");
        router.replace("/unauthorised");
      } else {
        console.log("Debug - Access granted");
      }
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) return <p>Loading...</p>;

  if (!hasAnyRole(user, ["sysadmin", "developer"])) {
    return null; // Will redirect in useEffect
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Admin", href: "/admin" },
    { label: "Audit Logs" },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export JSON
      </Button>
      <Button variant="outline" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Audit Logs"
      subtitle="Monitor system activity and user actions"
      headerActions={headerActions}
    >
      <AuditLogsViewer />
    </StandardizedSidebarLayout>
  );
}
