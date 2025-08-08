'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PermissionFormData {
  id: string;
  group: string;
  description: string;
  defaultRoles: string[];
}

interface PermissionFormProps {
  onSubmit: (data: PermissionFormData | Omit<PermissionFormData, 'id'>) => Promise<void>;
  onCancel: () => void;
  title: string;
  initialData?: Partial<PermissionFormData>;
  isEditing?: boolean;
}

// No fallback roles; if no templates exist, show no default-role options

export function PermissionForm({
  onSubmit,
  onCancel,
  title,
  initialData,
  isEditing = false,
}: PermissionFormProps) {
  const [formData, setFormData] = useState<PermissionFormData>({
    id: initialData?.id || '',
    group: initialData?.group || '',
    description: initialData?.description || '',
    defaultRoles: initialData?.defaultRoles || [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load dynamic default role templates (sysadmin-managed)
  const templates = useQuery(api.permissions.listSystemRoleTemplates);
  const dynamicRoles: string[] = (templates && templates.length > 0)
    ? templates.map((t: { name: string }) => t.name)
    : [];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = 'Permission ID is required';
    } else if (!/^[A-Za-z]\w*(?:\.[A-Za-z]\w*)+$/.test(formData.id)) {
      newErrors.id = 'Permission ID must be dot-separated segments (e.g., "users.create" or "reports.view.basic")';
    }

    if (!formData.group.trim()) {
      newErrors.group = 'Permission group is required';
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.group)) {
      newErrors.group = 'Group must contain only letters, numbers, and underscores';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // For editing, exclude the id field as it's not needed for updates
      const submitData = isEditing 
        ? { group: formData.group, description: formData.description, defaultRoles: formData.defaultRoles }
        : formData;
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleToggle = (role: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      defaultRoles: checked
        ? [...prev.defaultRoles, role]
        : prev.defaultRoles.filter(r => r !== role),
    }));
  };

  // Auto-populate group from ID
  useEffect(() => {
    if (!isEditing && formData.id.includes('.')) {
      const group = formData.id.split('.')[0];
      setFormData(prev => ({ ...prev, group }));
    }
  }, [formData.id, isEditing]);

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/20 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                {isEditing 
                  ? 'Update permission details and default role assignments'
                  : 'Create a new system permission with default role assignments'
                }
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Permission ID */}
            <div>
              <Label htmlFor="id">Permission ID *</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                placeholder="e.g., users.create, staff.edit"
                disabled={isEditing}
                className={errors.id ? 'border-red-500' : ''}
              />
              {errors.id && <p className="text-sm text-red-500 mt-1">{errors.id}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Format: group.action (e.g., &quot;users.create&quot;, &quot;modules.edit&quot;)
              </p>
            </div>

            {/* Group */}
            <div>
              <Label htmlFor="group">Group *</Label>
              <Input
                id="group"
                value={formData.group}
                onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
                placeholder="e.g., users, staff, modules"
                className={errors.group ? 'border-red-500' : ''}
              />
              {errors.group && <p className="text-sm text-red-500 mt-1">{errors.group}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Logical grouping for organizing permissions
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this permission allows users to do"
                rows={3}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
            </div>

            {/* Default Roles */}
            <div>
              <Label>Default Roles</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Select which roles should have this permission by default in new organisations
              </p>
              <div className="space-y-2">
                {dynamicRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No default role templates defined.</p>
                ) : (
                  dynamicRoles.map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={formData.defaultRoles.includes(role)}
                        onCheckedChange={(checked) => handleRoleToggle(role, checked as boolean)}
                      />
                      <Label htmlFor={`role-${role}`} className="text-sm">
                        {role}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {templates && templates.length > 0 && (
                <div className="mt-4">
                  <Label className="mb-2 block">Available Default Role Templates</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Name</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((t: { _id: string; name: string; description?: string }) => (
                        <TableRow key={t._id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-muted-foreground">{t.description || ''}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}