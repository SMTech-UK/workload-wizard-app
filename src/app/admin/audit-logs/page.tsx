'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { StandardizedSidebarLayout } from '@/components/layout/StandardizedSidebarLayout';
import { AuditLogsViewer } from '@/components/domain/AuditLogsViewer';
import { Button } from '@/components/ui/button';
import { Download, Settings } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && (user?.publicMetadata?.role !== 'sysadmin' && user?.publicMetadata?.role !== 'developer')) {
      router.replace('/unauthorised');
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) return <p>Loading...</p>;

  if (user?.publicMetadata?.role !== 'sysadmin' && user?.publicMetadata?.role !== 'developer') {
    return null; // Will redirect in useEffect
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Admin", href: "/admin" },
    { label: "Audit Logs" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export
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