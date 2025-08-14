"use client";

import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { AuditLogsViewer } from "@/components/domain/AuditLogsViewer";
import { Button } from "@/components/ui/button";
import { Download, Settings } from "lucide-react";
import { AuditViewGate } from "@/components/common/PermissionGate";

export default function AdminAuditLogsPage() {
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
    <AuditViewGate
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          You don&apos;t have permission to view audit logs.
        </div>
      }
      redirectOnDeny={false}
    >
      <StandardizedSidebarLayout
        breadcrumbs={breadcrumbs}
        title="Audit Logs"
        subtitle="Monitor system activity and user actions"
        headerActions={headerActions}
      >
        <p className="text-sm text-muted-foreground">
          View and search audit logs for all user actions and system events. Use
          the filters above to narrow down results by date range, user, action
          type, or search terms.
        </p>
        <AuditLogsViewer />
      </StandardizedSidebarLayout>
    </AuditViewGate>
  );
}
