'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuditLogsViewer } from '@/components/domain/AuditLogsViewer';

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

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Monitor system activity and user actions</p>
        </div>
      </div>

      <AuditLogsViewer />
    </div>
  );
} 