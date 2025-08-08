'use client';

import { useState } from 'react';
import { StandardizedSidebarLayout } from '@/components/layout/StandardizedSidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Paperclip,
  Settings
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import { useUser } from '@clerk/nextjs';

interface Role {
  _id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  permissions: string[];
  organisationId: string;
}

interface Permission {
  id: string;
  group: string;
  description: string;
  defaultRoles: string[];
  isActive: boolean;
}

interface RoleWithPermissions extends Role {
  permissionDetails: Array<{
    id: string;
    group: string;
    description: string;
    isGranted: boolean;
    isOverride: boolean;
    source: 'system_default' | 'custom';
  }>;
}

export default function OrganisationRolesPage() {
  const { user } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // Form state
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');

  // Get current user's organisation
  const currentUser = useQuery(api.users.getBySubject, user?.id ? { subject: user.id } : 'skip');

  // Get organisation roles (skip until orgId is available)
  const organisationRoles = useQuery(
    api.permissions.getOrganisationRoles,
    currentUser?.organisationId ? { organisationId: currentUser.organisationId as unknown as Id<'organisations'> } : 'skip'
  );

  // Get system permissions
  const systemPermissions = useQuery(api.permissions.getSystemPermissions);
  const stagedForRole = useQuery(
    api.permissions.getOrganisationPermissions,
    editingRole?._id ? { roleId: editingRole._id as unknown as Id<'user_roles'> } : 'skip'
  );

  // Mutations
  const createRole = useMutation(api.permissions.createOrganisationRole);
  const updateRole = useMutation(api.permissions.updateOrganisationRole);
  const deleteRole = useMutation(api.permissions.deleteOrganisationRole);
  const updateRolePermissions = useMutation(api.permissions.updateRolePermissions);

  const handleCreateRole = async () => {
    if (!roleName.trim() || !currentUser?.organisationId) return;

    try {
      await createRole({
        name: roleName.trim(),
        ...(roleDescription.trim() ? { description: roleDescription.trim() } : {}),
        organisationId: currentUser.organisationId,
        permissions: selectedPermissions,
        ...(user?.id ? { performedBy: user.id } : {}),
        ...((user?.fullName || user?.emailAddresses?.[0]?.emailAddress) ? { performedByName: (user?.fullName || (user?.emailAddresses?.[0]?.emailAddress as string)) } : {}),
      });

      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setSelectedPermissions(role.permissions);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingRole || !roleName.trim()) return;

    try {
      await updateRole({
        roleId: editingRole._id as unknown as Id<'user_roles'>,
        name: roleName.trim(),
        ...(roleDescription.trim() ? { description: roleDescription.trim() } : {}),
        permissions: selectedPermissions,
        ...(user?.id ? { performedBy: user.id } : {}),
        ...((user?.fullName || user?.emailAddresses?.[0]?.emailAddress) ? { performedByName: (user?.fullName || (user?.emailAddresses?.[0]?.emailAddress as string)) } : {}),
      });

      setEditingRole(null);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await deleteRole({ 
        roleId: roleId as unknown as Id<'user_roles'>,
        ...(user?.id ? { performedBy: user.id } : {}),
        ...((user?.fullName || user?.emailAddresses?.[0]?.emailAddress) ? { performedByName: (user?.fullName || (user?.emailAddresses?.[0]?.emailAddress as string)) } : {}),
      });
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handlePermissionToggle = async (roleId: string, permissionId: string, isGranted: boolean, acceptStaged?: boolean) => {
    try {
      await updateRolePermissions({
        roleId: roleId as unknown as Id<'user_roles'>,
        permissionId,
        isGranted,
        ...(acceptStaged ? { acceptStaged: !!acceptStaged } : {}),
        ...(user?.id ? { performedBy: user.id } : {}),
        ...((user?.fullName || user?.emailAddresses?.[0]?.emailAddress) ? { performedByName: (user?.fullName || (user?.emailAddresses?.[0]?.emailAddress as string)) } : {}),
      });
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  const [confirmApply, setConfirmApply] = useState<{ roleId: string; permissionId: string; details: { id: string; group: string; description: string } } | null>(null);

  const getPermissionSource = (roleName: string, permissionId: string) => {
    const permission = systemPermissions?.find(p => p.id === permissionId);
    if (!permission) return 'custom';
    
    return permission.defaultRoles.includes(roleName) ? 'system_default' : 'custom';
  };

  const getPermissionDetails = (role: Role): RoleWithPermissions => {
    const permissionDetails = systemPermissions?.map(perm => {
      const isGranted = role.permissions.includes(perm.id);
      const source: 'system_default' | 'custom' = getPermissionSource(role.name, perm.id) === 'system_default' ? 'system_default' : 'custom';
      const isOverride = source === 'custom' && isGranted;
      
      return {
        id: perm.id,
        group: perm.group,
        description: perm.description,
        isGranted,
        isOverride,
        source,
      };
    }) || [];

    return {
      ...role,
      permissionDetails,
    };
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
    { label: "Roles" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Settings
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Role Management"
      subtitle="Manage roles and permissions for your organisation"
      headerActions={headerActions}
    >
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Create a new role with specific permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleName">Role Name</Label>
                <Input
                  id="roleName"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g., Department Head"
                />
              </div>
              <div>
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Describe the role's responsibilities"
                />
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {systemPermissions?.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPermissions([...selectedPermissions, permission.id]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter(p => p !== permission.id));
                          }
                        }}
                      />
                      <Label htmlFor={permission.id} className="text-sm">
                        {permission.description}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRole}>
                  Create Role
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      <div className="space-y-6">
        {organisationRoles?.map((role) => {
          const roleWithPermissions = getPermissionDetails(role);
          
          return (
            <Card key={role._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {role.name}
                      {role.isDefault && (
                        <Badge variant="secondary">Default</Badge>
                      )}
                    </CardTitle>
                    {role.description && (
                      <CardDescription>{role.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog open={isEditDialogOpen && editingRole?._id === role._id} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Role</DialogTitle>
                          <DialogDescription>
                            Update role details and permissions
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="editRoleName">Role Name</Label>
                            <Input
                              id="editRoleName"
                              value={roleName}
                              onChange={(e) => setRoleName(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="editRoleDescription">Description</Label>
                            <Textarea
                              id="editRoleDescription"
                              value={roleDescription}
                              onChange={(e) => setRoleDescription(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Permissions</Label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {systemPermissions?.map((permission) => (
                                <div key={permission.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`edit-${permission.id}`}
                                    checked={selectedPermissions.includes(permission.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedPermissions([...selectedPermissions, permission.id]);
                                      } else {
                                        setSelectedPermissions(selectedPermissions.filter(p => p !== permission.id));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`edit-${permission.id}`} className="text-sm">
                                    {permission.description}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleUpdateRole}>
                              Update Role
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {!role.isDefault && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Role</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the role &quot;{role.name}&quot;? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRole(role._id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleWithPermissions.permissionDetails.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell className="font-mono text-sm">
                          {permission.id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{permission.group}</Badge>
                        </TableCell>
                        <TableCell>{permission.description}</TableCell>
                        <TableCell>
                          <Badge variant={permission.isGranted ? "default" : "secondary"}>
                            {permission.isGranted ? "Granted" : "Denied"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {permission.source === 'system_default' ? (
                                  <Paperclip className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <Settings className="w-4 h-4 text-green-500" />
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                {permission.source === 'system_default'
                                  ? 'Default: granted to this role by the system permission defaults'
                                  : 'Custom: explicitly assigned to this role in your organisation'}
                              </TooltipContent>
                            </Tooltip>
                            <span className="text-sm">
                              {permission.source === 'system_default' ? 'System Default' : 'Custom'}
                            </span>
                            <Badge variant={permission.source === 'system_default' ? 'secondary' : 'outline'} className="text-[10px] uppercase">
                              {permission.source === 'system_default' ? 'default' : 'custom'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={permission.isGranted}
                              onCheckedChange={(checked) => 
                                handlePermissionToggle(role._id, permission.id, !!checked)
                              }
                              disabled={permission.source === 'system_default' && !permission.isOverride}
                            />
                            {!permission.isGranted && permission.source === 'system_default' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => setConfirmApply({ roleId: role._id, permissionId: permission.id, details: { id: permission.id, group: permission.group, description: permission.description } })}
                                    >
                                      Staged change
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="space-y-1">
                                    <div className="text-xs font-mono">{permission.id}</div>
                                    <div className="text-xs"><span className="font-semibold">Group:</span> {permission.group}</div>
                                    <div className="text-xs text-muted-foreground">{permission.description}</div>
                                    <div className="text-[10px] uppercase tracking-wide text-orange-600">Pushed from system (staged)</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Confirm Apply Default Dialog */}
      {confirmApply && (
        <Dialog open onOpenChange={(o) => { if (!o) setConfirmApply(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply default permission?</DialogTitle>
            <DialogDescription>
              This will apply the staged system default permission to this role.
            </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div><span className="font-semibold">Permission:</span> <code className="bg-muted px-1 py-0.5 rounded">{confirmApply.details.id}</code></div>
              <div><span className="font-semibold">Group:</span> {confirmApply.details.group}</div>
              <div className="text-muted-foreground">{confirmApply.details.description}</div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setConfirmApply(null)}>Cancel</Button>
              <Button onClick={() => {
                handlePermissionToggle(confirmApply.roleId, confirmApply.permissionId, true, true);
                setConfirmApply(null);
              }}>Apply</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </StandardizedSidebarLayout>
  );
} 