'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { StandardizedSidebarLayout } from '@/components/layout/StandardizedSidebarLayout';
import { hasAnyRole } from '@/lib/utils';
import { UsersList } from '@/components/domain/UsersList';
import { UserSyncButton } from '@/components/domain/UserSyncButton';
import { Button } from '@/components/ui/button';
import { Users, Plus, Settings } from 'lucide-react';

export default function AdminUsersPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const usersListRef = useRef<{ handleCreateUser: () => void }>(null);

  useEffect(() => {
    if (isLoaded && !hasAnyRole(user, ['sysadmin', 'developer'])) {
      router.replace('/unauthorised');
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) return <p>Loading...</p>;

  if (!hasAnyRole(user, ['sysadmin', 'developer'])) {
    return null; // Will redirect in useEffect
  }

  const handleAddUser = () => {
    if (usersListRef.current) {
      usersListRef.current.handleCreateUser();
    }
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Admin", href: "/admin" },
    { label: "Users" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => {
        router.push('/admin/settings');
      }}>
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
      <Button size="sm" onClick={handleAddUser}>
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
      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Users List */}
        <UsersList ref={usersListRef} />
      </div>
    </StandardizedSidebarLayout>
  );
}
