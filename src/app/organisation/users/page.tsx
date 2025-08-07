'use client';

import { useState } from 'react';
import { StandardizedSidebarLayout } from '@/components/layout/StandardizedSidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

import { 
  Plus, 
  Edit, 
  Trash2, 
  User,
  Mail,
  UserCheck,
  UserX,
  RefreshCw,
  GitCompareArrows
} from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import { deleteUser } from '@/lib/actions/userActions';
import { CreateUserForm } from '@/components/domain/CreateUserForm';
import { EditUserForm } from '@/components/domain/EditUserForm';
import { DeleteConfirmationModal } from '@/components/domain/DeleteConfirmationModal';

interface User {
  _id: string;
  email: string;
  username?: string;
  givenName: string;
  familyName: string;
  fullName: string;
  systemRoles: string[];
  organisationId: string;
  isActive: boolean;
  lastSignInAt?: number;
  createdAt: number;
  subject?: string; // Clerk user ID
  pictureUrl?: string;
  organisation?: {
    id: string;
    name: string;
    code: string;
  };
}

export default function OrganisationUsersPage() {
  const { user } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get current user's organisation
  const currentUser = useQuery(api.users.getBySubject, { 
    subject: user?.id || '' 
  });

  // Get organisation users
  const organisationUsers = useQuery(api.users.list, {
    organisationId: currentUser?.organisationId || undefined,
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString();
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

  const handleToggleUserStatus = async (targetUser: User) => {
    if (!targetUser.subject) {
      console.error('Cannot toggle status: User subject not found');
      return;
    }

    setTogglingUserId(targetUser._id);
    
    try {
      const response = await fetch('/api/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUser.subject,
          isActive: !targetUser.isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user status');
      }

      // The query will automatically refetch due to Convex reactivity
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update user status');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = async (userId: string) => {
    setIsDeleting(true);
    try {
      await deleteUser(userId);
      setDeletingUser(null);
      // The organisationUsers query will automatically refetch due to Convex reactivity
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeletingUser(null);
  };

  if (!currentUser?.organisationId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Loading organisation details...</p>
        </CardContent>
      </Card>
    );
  }

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Organisation", href: "/organisation" },
    { label: "Users" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Sync
      </Button>
      <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add User
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Organisation Users"
      subtitle="Manage users within your organisation"
      headerActions={headerActions}
    >

      <Card>
        <CardHeader>
          <CardTitle>Users ({organisationUsers?.length || 0})</CardTitle>
          <CardDescription>
            All users in your organisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organisationUsers && organisationUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organisationUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.pictureUrl ? (
                          <img 
                            src={user.pictureUrl} 
                            alt={`${user.fullName} avatar`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.username || `${user.givenName} ${user.familyName}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.systemRoles[0])}`}>
          {getRoleLabel(user.systemRoles[0])}
        </span>
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
                          disabled={togglingUserId === user._id}
                          className={`h-5 w-5 p-0 hover:bg-transparent ${
                            user.isActive 
                              ? 'hover:text-red-500 text-gray-400' 
                              : 'hover:text-green-500 text-gray-400'
                          }`}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {togglingUserId === user._id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <GitCompareArrows className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.lastSignInAt ? formatDateTime(user.lastSignInAt) : 'Never'}
                    </TableCell>
                    <TableCell>
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        <Button
                          onClick={() => setEditingUser(user)}
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!user.isActive && (
                          <Button
                            onClick={() => handleDeleteUser(user)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Remove user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first user to the organisation.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First User
              </Button>
            </div>
          )}
                 </CardContent>
       </Card>

       {/* Edit User Modal */}
       {editingUser && (
         <EditUserForm
           user={editingUser}
           onClose={() => setEditingUser(null)}
           onUserUpdated={() => {
             setEditingUser(null);
             // The query will automatically refetch
           }}
         />
       )}

       {/* Create User Modal */}
       {isCreateDialogOpen && (
         <CreateUserForm 
           organisationId={currentUser.organisationId}
           onClose={() => setIsCreateDialogOpen(false)}
           onUserCreated={() => {
             setIsCreateDialogOpen(false);
             // The query will automatically refetch
           }}
         />
       )}

       {/* Delete User Modal */}
       {deletingUser && (
         <DeleteConfirmationModal
           user={{
             id: deletingUser.subject || deletingUser._id,
             firstName: deletingUser.givenName,
             lastName: deletingUser.familyName,
             email: deletingUser.email,
             roles: deletingUser.systemRoles,
           }}
           onConfirm={handleConfirmDelete}
           onCancel={handleCancelDelete}
           isDeleting={isDeleting}
         />
       )}
    </StandardizedSidebarLayout>
  );
} 