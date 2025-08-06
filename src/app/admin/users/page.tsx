'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UsersList } from '@/components/domain/UsersList';
import { UserSyncButton } from '@/components/domain/UserSyncButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

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
      <div className="grid grid-cols-1 gap-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage users across all organisations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href="/admin/users">View All Users</a>
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Users List */}
        <UsersList />
      </div>
    </div>
  );
}
