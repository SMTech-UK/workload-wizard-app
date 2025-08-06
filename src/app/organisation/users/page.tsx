'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, UserX } from 'lucide-react';
import Link from 'next/link';
import { getUsersByOrganisationId, deactivateUser } from '@/lib/actions/userActions';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organisationId: string;
  createdAt: number;
  lastSignInAt: number | null;
  isActive: boolean;
}

export default function OrganisationUsersPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user?.publicMetadata?.role !== 'orgadmin' && user?.publicMetadata?.role !== 'sysadmin' && user?.publicMetadata?.role !== 'developer') {
      router.replace('/unauthorised');
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!user?.publicMetadata?.organisationId) {
        setError('No organisation ID found');
        setLoading(false);
        return;
      }

      try {
        const organisationId = user.publicMetadata.organisationId as string;
        const usersData = await getUsersByOrganisationId(organisationId);
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && user) {
      fetchUsers();
    }
  }, [isLoaded, user]);

  if (!isLoaded) return <p>Loading...</p>;

  if (user?.publicMetadata?.role !== 'orgadmin' && user?.publicMetadata?.role !== 'sysadmin' && user?.publicMetadata?.role !== 'developer') {
    return null; // Will redirect in useEffect
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'orgadmin':
        return 'default';
      case 'sysadmin':
        return 'destructive';
      case 'developer':
        return 'secondary';
      case 'user':
        return 'outline';
      case 'trial':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await deactivateUser(userId);
      // Refresh the users list
      const organisationId = user?.publicMetadata?.organisationId as string;
      const usersData = await getUsersByOrganisationId(organisationId);
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/organisation">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organisation
            </Link>
          </Button>
        </div>
        
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Organisation Users</h1>
            <p className="text-muted-foreground">
              Manage users within your organisation
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8">
            <p className="text-center">Loading users...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8">
            <p className="text-center text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
            <CardDescription>
              All active users in your organisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No users found in this organisation
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Sign In</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.lastSignInAt)}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivateUser(user.id)}
                          disabled={user.role === 'orgadmin' || user.role === 'sysadmin'}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Deactivate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 