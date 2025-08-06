'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, UserX, Building2, Edit } from 'lucide-react';
import Link from 'next/link';
import { deactivateUser, reactivateUser, getAllUsersByOrganisationIdWithOverride, getAllOrganisations } from '@/lib/actions/userActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeactivateConfirmationModal } from '@/components/domain/DeactivateConfirmationModal';
import { CreateUserForm } from '@/components/domain/CreateUserForm';
import { EditUserForm } from '@/components/domain/EditUserForm';

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
  organisationalRole?: {
    name: string;
    description: string;
  } | null;
}

interface Organisation {
  id: string;
  name: string;
  code: string;
}

export default function OrganisationUsersPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    if (isLoaded && user?.publicMetadata?.role !== 'orgadmin' && user?.publicMetadata?.role !== 'sysadmin' && user?.publicMetadata?.role !== 'developer') {
      router.replace('/unauthorised');
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    const initializePage = async () => {
      if (!user?.publicMetadata?.organisationId) {
        setError('No organisation ID found');
        setLoading(false);
        return;
      }

      try {
        // Check if user is admin
        const adminRole = user.publicMetadata?.role === 'sysadmin' || user.publicMetadata?.role === 'developer';
        setIsAdmin(adminRole);

        // Load organisations if admin
        if (adminRole) {
          try {
            const orgsData = await getAllOrganisations();
            setOrganisations(orgsData);
          } catch (orgError) {
            console.warn('Failed to load organisations:', orgError);
          }
        }

        // Set initial organisation ID
        const organisationId = user.publicMetadata.organisationId as string;
        setSelectedOrganisationId(organisationId);

        // Fetch users (active only by default)
        const usersData = await getAllUsersByOrganisationIdWithOverride(organisationId);
        setUsers(usersData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    if (isLoaded && user) {
      initializePage();
    }
  }, [isLoaded, user]);

  const handleOrganisationChange = async (organisationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
              const usersData = await getAllUsersByOrganisationIdWithOverride(
          user?.publicMetadata?.organisationId as string,
          organisationId
        );
      setUsers(usersData);
      setSelectedOrganisationId(organisationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInactiveUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const newShowInactive = !showInactiveUsers;
      const usersData = await getAllUsersByOrganisationIdWithOverride(
        user?.publicMetadata?.organisationId as string,
        selectedOrganisationId
      );
      setUsers(usersData);
      setShowInactiveUsers(newShowInactive);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return <p>Loading...</p>;

  if (user?.publicMetadata?.role !== 'orgadmin' && user?.publicMetadata?.role !== 'sysadmin' && user?.publicMetadata?.role !== 'developer') {
    return null; // Will redirect in useEffect
  }

  // Removed unused function

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };

  const handleDeactivateUser = (user: User) => {
    setDeactivatingUser(user);
  };

  const handleConfirmDeactivate = async (userId: string) => {
    setIsDeactivating(true);
    try {
      await deactivateUser(userId);
      // Refresh the users list
      const usersData = await getAllUsersByOrganisationIdWithOverride(
        user?.publicMetadata?.organisationId as string,
        selectedOrganisationId
      );
      setUsers(usersData);
      setDeactivatingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleCancelDeactivate = () => {
    setDeactivatingUser(null);
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await reactivateUser(userId);
      // Refresh the users list
      const usersData = await getAllUsersByOrganisationIdWithOverride(
        user?.publicMetadata?.organisationId as string,
        selectedOrganisationId
      );
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate user');
    }
  };

  const handleCreateUser = () => {
    setShowCreateUser(true);
  };

  const handleCloseCreateUser = () => {
    setShowCreateUser(false);
  };

  const handleUserCreated = async () => {
    // Refresh the users list
    const usersData = await getAllUsersByOrganisationIdWithOverride(
      user?.publicMetadata?.organisationId as string,
      selectedOrganisationId
    );
    setUsers(usersData);
  };

  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
  };

  const handleCloseEditUser = () => {
    setEditingUser(null);
  };

  const handleUserUpdated = async () => {
    // Refresh the users list
    const usersData = await getAllUsersByOrganisationIdWithOverride(
      user?.publicMetadata?.organisationId as string,
      selectedOrganisationId
    );
    setUsers(usersData);
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
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Organisation Users</h1>
              <p className="text-muted-foreground">
                Manage users within your organisation
              </p>
            </div>
          </div>
          <Button onClick={handleCreateUser} className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Toggle for showing inactive users */}
        <div className="flex items-center gap-4 mt-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            <span className="font-medium">Show Inactive Users:</span>
          </div>
          <Button
            variant={showInactiveUsers ? "default" : "outline"}
            size="sm"
            onClick={handleToggleInactiveUsers}
            disabled={loading}
          >
            {showInactiveUsers ? "Hide Inactive" : "Show Inactive"}
          </Button>
          {showInactiveUsers && (
            <span className="text-sm text-muted-foreground">
              Showing {users.filter(u => !u.isActive).length} inactive users
            </span>
          )}
        </div>

        {/* Organisation Selector for Admins */}
        {isAdmin && organisations.length > 0 && (
          <div className="flex items-center gap-4 mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span className="font-medium">View Organisation:</span>
            </div>
            <Select value={selectedOrganisationId} onValueChange={handleOrganisationChange}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select organisation" />
              </SelectTrigger>
              <SelectContent>
                {organisations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-2">
              Admin Mode
            </Badge>
          </div>
        )}
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
              {showInactiveUsers 
                ? 'All users in your organisation (including inactive)' 
                : 'Active users in your organisation'
              }
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
                      <TableHead>Organisational Role</TableHead>
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
                        {user.organisationalRole ? (
                          <Badge variant="outline">
                            {user.organisationalRole.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No role assigned</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.lastSignInAt)}</TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.isActive ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeactivateUser(user)}
                              disabled={user.role === 'orgadmin' || user.role === 'sysadmin'}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivateUser(user.id)}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deactivate Confirmation Modal */}
      {deactivatingUser && (
        <DeactivateConfirmationModal
          user={deactivatingUser}
          onConfirm={handleConfirmDeactivate}
          onCancel={handleCancelDeactivate}
          isDeactivating={isDeactivating}
        />
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUserForm
          organisationId={selectedOrganisationId}
          onClose={handleCloseCreateUser}
          onUserCreated={handleUserCreated}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserForm
          user={editingUser}
          onClose={handleCloseEditUser}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
} 