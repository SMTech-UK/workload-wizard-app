'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { StandardizedSidebarLayout } from '@/components/layout/StandardizedSidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Upload
} from 'lucide-react';
import { PermissionForm } from '@/components/domain/PermissionForm';
import { GenericDeleteModal } from '@/components/domain/GenericDeleteModal';
import { SuccessModal } from '@/components/domain/SuccessModal';
import { Id } from '../../../../convex/_generated/dataModel';

interface Permission {
  _id: Id<'system_permissions'>;
  id: string;
  group: string;
  description: string;
  defaultRoles: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export default function AdminPermissionsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [deletingPermission, setDeletingPermission] = useState<Permission | null>(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    title: string;
    message: string;
    details?: Record<string, string | number>;
  } | null>(null);

  // Queries
  const permissionsGrouped = useQuery(api.permissions.getSystemPermissionsGrouped);

  // Mutations
  const createPermission = useMutation(api.permissions.createSystemPermission);
  const updatePermission = useMutation(api.permissions.updateSystemPermission);
  const deletePermission = useMutation(api.permissions.deleteSystemPermission);
  const pushToOrgs = useMutation(api.permissions.pushPermissionsToOrganisations);

  useEffect(() => {
    if (isLoaded && (user?.publicMetadata?.role !== 'sysadmin' && user?.publicMetadata?.role !== 'developer')) {
      router.replace('/unauthorised');
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) return <p>Loading...</p>;

  if (user?.publicMetadata?.role !== 'sysadmin' && user?.publicMetadata?.role !== 'developer') {
    return null;
  }

  const handleCreate = async (data: {
    id: string;
    group: string;
    description: string;
    defaultRoles: string[];
  }) => {
    try {
      await createPermission({
        ...data,
        performedBy: user?.id,
        performedByName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.emailAddresses[0]?.emailAddress,
      });
      setShowCreateForm(false);
      setSuccessModal({
        title: 'Permission Created',
        message: `Permission "${data.id}" has been successfully created.`,
        details: {
          'Permission ID': data.id,
          'Group': data.group,
          'Default Roles': data.defaultRoles.length > 0 ? data.defaultRoles.join(', ') : 'None',
        },
      });
    } catch (error) {
      console.error('Error creating permission:', error);
      alert('Error creating permission: ' + (error as Error).message);
    }
  };

  const handleEdit = async (data: {
    id?: string;
    group: string;
    description: string;
    defaultRoles: string[];
  }) => {
    if (!editingPermission) return;
    
    try {
      await updatePermission({
        permissionId: editingPermission._id,
        ...data,
        performedBy: user?.id,
        performedByName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.emailAddresses[0]?.emailAddress,
      });
      setEditingPermission(null);
      setSuccessModal({
        title: 'Permission Updated',
        message: `Permission "${editingPermission.id}" has been successfully updated.`,
        details: {
          'Permission ID': editingPermission.id,
          'Group': data.group,
          'Default Roles': data.defaultRoles.length > 0 ? data.defaultRoles.join(', ') : 'None',
        },
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      alert('Error updating permission: ' + (error as Error).message);
    }
  };

  const handleDeleteClick = (permission: Permission) => {
    setDeletingPermission(permission);
    setForceDelete(false); // Reset force delete flag
  };

  const handleDelete = async () => {
    if (!deletingPermission) return;
    
    const result = await deletePermission({
      permissionId: deletingPermission._id,
      forceDelete: forceDelete,
      performedBy: user?.id,
      performedByName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.emailAddresses[0]?.emailAddress,
    });
    
    setDeletingPermission(null);
    setForceDelete(false);
    
    // Show success message if result contains a message
    if (result && typeof result === 'object' && 'message' in result) {
      setSuccessModal({
        title: forceDelete ? 'Permission Force Deleted' : 'Permission Deleted',
        message: result.message,
        details: {
          'Permission ID': deletingPermission.id,
          'Group': deletingPermission.group,
          ...(result.wasForceDeleted && {
            'Removed from User Roles': result.removedFromRoles,
            'Removed from Org Roles': result.removedFromOrgRoles,
          }),
        },
      });
    }
  };

  const handlePushToOrgs = async (permissionId: string) => {
    try {
      const result = await pushToOrgs({ 
        permissionId,
        performedBy: user?.id,
        performedByName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.emailAddresses[0]?.emailAddress,
      });
      setSuccessModal({
        title: 'Permissions Pushed Successfully',
        message: `Permission "${permissionId}" has been pushed to all active organisations.`,
        details: {
          'Organisations Updated': result.organisationsUpdated,
          'Total Roles Checked': result.totalRolesChecked,
          'Matching Roles Found': result.matchingRoles,
          'New Assignments Created': result.assignmentsCreated,
          'Already Assigned': result.alreadyAssigned,
          'Default Roles': result.defaultRoles.join(', ') || 'None',
        },
      });
    } catch (error) {
      console.error('Error pushing to organisations:', error);
      alert('Error pushing to organisations: ' + (error as Error).message);
    }
  };

  const getGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      staff: 'bg-blue-100 text-blue-800',
      users: 'bg-green-100 text-green-800',
      modules: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      reports: 'bg-orange-100 text-orange-800',
    };
    return colors[group] || 'bg-gray-100 text-gray-800';
  };

  const getAllPermissions = (): Permission[] => {
    if (!permissionsGrouped) return [];
    return Object.values(permissionsGrouped).flat();
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Admin", href: "/admin" },
    { label: "Permissions" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Upload className="h-4 w-4 mr-2" />
        Import
      </Button>
      <Button size="sm" onClick={() => setShowCreateForm(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Permission
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Permission Registry"
      subtitle="Manage system-wide permissions and default role assignments"
      headerActions={headerActions}
    >

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{getAllPermissions().length}</p>
                <p className="text-sm text-muted-foreground">Total Permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {permissionsGrouped ? Object.keys(permissionsGrouped).length : 0}
                </p>
                <p className="text-sm text-muted-foreground">Permission Groups</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {getAllPermissions().filter(p => p.defaultRoles.length > 0).length}
                </p>
                <p className="text-sm text-muted-foreground">With Default Roles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions List */}
      {permissionsGrouped && Object.keys(permissionsGrouped).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(permissionsGrouped).map(([group, permissions]) => (
            <Card key={group}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Badge className={getGroupColor(group)}>
                        {group.toUpperCase()}
                      </Badge>
                      <span>({permissions.length} permissions)</span>
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {permissions.map((permission) => (
                    <div
                      key={permission._id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {permission.id}
                            </code>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {permission.description}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePushToOrgs(permission.id)}
                            title="Push to all organisations"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingPermission(permission)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(permission)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {permission.defaultRoles.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Default Roles:</p>
                          <div className="flex flex-wrap gap-1">
                            {permission.defaultRoles.map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No permissions found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first system permission.</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Permission
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Permission Modal */}
      {showCreateForm && (
        <PermissionForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          title="Create New Permission"
        />
      )}

      {/* Edit Permission Modal */}
      {editingPermission && (
        <PermissionForm
          onSubmit={handleEdit}
          onCancel={() => setEditingPermission(null)}
          title="Edit Permission"
          initialData={{
            id: editingPermission.id,
            group: editingPermission.group,
            description: editingPermission.description,
            defaultRoles: editingPermission.defaultRoles,
          }}
          isEditing
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingPermission && (
        <GenericDeleteModal
          isOpen={true}
          onClose={() => {
            setDeletingPermission(null);
            setForceDelete(false);
          }}
          onConfirm={handleDelete}
          title="Delete Permission"
          description="This action cannot be undone"
          itemName="permission"
          itemDetails={{
            'Permission ID': deletingPermission.id,
            'Group': deletingPermission.group,
            'Description': deletingPermission.description,
            'Default Roles': deletingPermission.defaultRoles.length > 0 
              ? deletingPermission.defaultRoles.join(', ') 
              : 'None',
          }}
          warningMessage={forceDelete 
            ? "Force delete will automatically remove this permission from ALL roles and organisations before deletion. This cannot be undone!"
            : "This will permanently remove the permission from the system. If deletion fails, you'll need to remove this permission from all roles first, or use Force Delete."
          }
          confirmButtonText="Delete Permission"
          showForceDelete={user?.publicMetadata?.role === 'sysadmin' || user?.publicMetadata?.role === 'developer'}
          forceDelete={forceDelete}
          onForceDeleteChange={setForceDelete}
          onError={(error) => {
            console.error('Delete error:', error);
          }}
        />
      )}

      {/* Success Modal */}
      {successModal && (
        <SuccessModal
          isOpen={true}
          onClose={() => setSuccessModal(null)}
          title={successModal.title}
          message={successModal.message}
          details={successModal.details}
        />
      )}
    </StandardizedSidebarLayout>
  );
}