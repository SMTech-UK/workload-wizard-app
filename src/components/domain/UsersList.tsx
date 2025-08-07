'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listUsers, deleteUser } from '@/lib/actions/userActions';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Trash2, RefreshCw, UserCheck, UserX, Edit, Filter, Building2, Plus, GitCompareArrows } from 'lucide-react';
import { EditUserForm } from './EditUserForm';
import { CreateUserForm } from './CreateUserForm';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  subject?: string; // Clerk user ID for password reset and email updates
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  role: string;
  organisationId: string;
  organisation?: {
    id: string;
    name: string;
    code: string;
  } | null;
  createdAt: number;
  lastSignInAt: number | null;
  isActive: boolean;
}

export function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  
  const updateLastSignIn = useMutation(api.users.updateLastSignIn);
  const organisations = useQuery(api.organisations.list);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [organisationFilter, setOrganisationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<string>('all');

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userList = await listUsers();
      setUsers(userList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = async (userId: string) => {
    setIsDeleting(true);
    try {
      await deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
      setDeletingUser(null);
    } catch (err) {
      toast.error('Failed to delete user', err instanceof Error ? err.message : undefined);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeletingUser(null);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
  };

  const handleUserUpdated = () => {
    fetchUsers(); // Refresh the user list
  };

  const handleCreateUser = () => {
    setCreatingUser(true);
  };

  const handleCloseCreate = () => {
    setCreatingUser(false);
  };

  const handleUserCreated = () => {
    fetchUsers(); // Refresh the user list
  };

  const handleToggleUserStatus = async (user: User) => {
    if (!user.subject) {
      console.error('Cannot toggle status: User subject not found');
      return;
    }

    setTogglingUserId(user.id);
    
    try {
      const response = await fetch('/api/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.subject,
          isActive: !user.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user status');
      }

      // Refresh the user list
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update user status');
    } finally {
      setTogglingUserId(null);
    }
  };

  // Get unique organisations for filter dropdown
  const getUniqueOrganisations = () => {
    const orgs = users
      .map(user => user.organisation)
      .filter(org => org !== null && org !== undefined)
      .map(org => ({ id: org!.id, name: org!.name, code: org!.code }));
    
    // Remove duplicates based on id
    return Array.from(new Map(orgs.map(org => [org.id, org])).values());
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        (user.firstName && user.firstName.toLowerCase().includes(term)) ||
        (user.lastName && user.lastName.toLowerCase().includes(term)) ||
        (user.email && user.email.toLowerCase().includes(term))
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Organisation filter
    if (organisationFilter !== 'all') {
      filtered = filtered.filter(user => user.organisation?.id === organisationFilter);
    }

    // Selected organisation filter (for admin cross-organisation viewing)
    if (selectedOrganisationId !== 'all') {
      filtered = filtered.filter(user => user.organisationId === selectedOrganisationId);
    }

    // Status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    setFilteredUsers(filtered);
  };

  // Apply filters whenever filters or users change
  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, roleFilter, organisationFilter, statusFilter, selectedOrganisationId]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'orgadmin': return 'Organisation Admin';
      case 'sysadmin': return 'System Admin';
      case 'developer': return 'Developer';
      case 'user': return 'User';
      case 'trial': return 'Trial';
      default: return role;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'orgadmin': return 'bg-red-100 text-red-800';
      case 'sysadmin': return 'bg-purple-100 text-purple-800';
      case 'developer': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600">
            <p>Error: {error}</p>
            <Button onClick={fetchUsers} variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Manage all users in the system ({filteredUsers.length} of {users.length} total)
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleCreateUser}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
            <Button 
              onClick={() => setShowFilters(!showFilters)} 
              variant="outline" 
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button onClick={fetchUsers} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              onClick={async () => {
                try {
                  // Get current user ID from the first user in the list (for testing)
                  if (users.length > 0) {
                    await updateLastSignIn({ userId: users[0].id });
                    await fetchUsers();
                  }
                } catch (error) {
                  console.error('Failed to update last sign in:', error);
                }
              }} 
              variant="outline" 
              size="sm"
            >
              Update Last Sign In
            </Button>
          </div>
        </div>
        
        {/* Organisation Selector for Cross-Organisation Viewing */}
        {organisations && organisations.length > 0 && (
          <div className="flex items-center gap-4 mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <span className="font-medium">View Specific Organisation:</span>
            </div>
            <Select value={selectedOrganisationId} onValueChange={setSelectedOrganisationId}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="All organisations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organisations</SelectItem>
                {organisations.map((org) => (
                  <SelectItem key={org._id} value={org._id}>
                    {org.name} ({org.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOrganisationId !== 'all' && (
              <Badge variant="outline" className="ml-2">
                Filtered View
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      
            <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {users.length === 0 ? 'No users found' : 'No users match the current filters'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : 'N/A'
                        }
                      </div>
                    </TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.organisation?.name || user.organisationId || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {user.isActive ? (
                            <>
                              <UserCheck className="h-4 w-4 text-green-600 mr-1" />
                              <span className="text-green-600 text-sm">Active</span>
                            </>
                          ) : (
                            <>
                              <UserX className="h-4 w-4 text-red-600 mr-1" />
                              <span className="text-red-600 text-sm">Inactive</span>
                            </>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={togglingUserId === user.id}
                          className={`h-5 w-5 p-0 hover:bg-transparent ${
                            user.isActive 
                              ? 'hover:text-red-500 text-gray-400' 
                              : 'hover:text-green-500 text-gray-400'
                          }`}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {togglingUserId === user.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <GitCompareArrows className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      {user.lastSignInAt ? formatDateTime(user.lastSignInAt) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          onClick={() => handleEditUser(user)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteUser(user)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          disabled={user.isActive}
                          title={user.isActive ? 'User must be inactive before deletion' : 'Delete user'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    
            {editingUser && (
          <EditUserForm
            user={editingUser}
            onClose={handleCloseEdit}
            onUserUpdated={handleUserUpdated}
            isSysadmin={true}
          />
        )}

        {creatingUser && (
          <CreateUserForm
            onClose={handleCloseCreate}
            onUserCreated={handleUserCreated}
            isSysadmin={true}
          />
        )}
    
    {deletingUser && (
      <DeleteConfirmationModal
        user={deletingUser}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={isDeleting}
      />
    )}
  </>
  );
} 