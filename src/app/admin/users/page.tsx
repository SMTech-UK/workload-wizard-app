'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { StandardizedSidebarLayout } from '@/components/layout/StandardizedSidebarLayout';
import { UsersList } from '@/components/domain/UsersList';
import { UserSyncButton } from '@/components/domain/UserSyncButton';
import { Button } from '@/components/ui/button';
import { Users, Plus, Settings } from 'lucide-react';

export default function AdminUsersPage() {
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
    { label: "Users" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
      <Button size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Add User
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="User Management"
      subtitle="Manage users and organisations"
      headerActions={headerActions}
    >
      {/* User Sync Section */}
      <UserSyncButton />

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Users List */}
        <UsersList />
      </div>
    </StandardizedSidebarLayout>
  );
}
