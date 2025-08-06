'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CreateUserForm } from '@/components/domain/CreateUserForm';
import { UsersList } from '@/components/domain/UsersList';
import { UserSyncButton } from '@/components/domain/UserSyncButton';

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users and organisations</p>
        </div>
      </div>

      {/* User Sync Section */}
      <UserSyncButton />

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Sidebar - Create User Form */}
        <div className="xl:col-span-1">
          <CreateUserForm />
        </div>
        
        {/* Main Content - Users List */}
        <div className="xl:col-span-3">
          <UsersList />
        </div>
      </div>
    </div>
  );
}
