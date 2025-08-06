'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { updateUser } from '@/lib/actions/userActions';
import { X, Save, Eye, EyeOff } from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import type { Organisation } from '@/lib/types';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const ROLES = [
  { value: 'orgadmin', label: 'Organisation Admin' },
  { value: 'sysadmin', label: 'System Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'user', label: 'User' },
  { value: 'trial', label: 'Trial' },
] as const;

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
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

interface EditUserFormProps {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditUserForm({ user, onClose, onUpdate }: EditUserFormProps) {
  console.log('EditUserForm - User data:', user);
  console.log('EditUserForm - User role:', user.role);
  console.log('EditUserForm - User organisationId:', user.organisationId);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
    role: user.role || 'user',
    organisationId: user.organisationId || '',
    isActive: user.isActive,
    password: '',
  });
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(user.role || 'user');
  const [selectedOrganisationId, setSelectedOrganisationId] = useState(user.organisationId || '');

  useEffect(() => {
    async function fetchOrgs() {
      setOrgLoading(true);
      try {
        console.log('Fetching organisations...');
        const orgs = await convex.query(api.organisations.list);
        console.log('Raw organisations from Convex:', orgs);
        console.log('User organisationId:', user.organisationId);
        console.log('User organisationId type:', typeof user.organisationId);
        
        // Transform Convex format to match Organisation interface
        const transformedOrgs = orgs
          .filter(org => org._id && org.name && org.code) // Filter out invalid organisations
          .map(org => ({
            id: org._id,
            name: org.name || '',
            code: org.code || '',
            contactEmail: org.contactEmail || '',
            contactPhone: org.contactPhone || '',
            domain: org.domain || '',
            isActive: org.isActive || false,
            status: (org.status as 'active' | 'inactive' | 'suspended') || 'active',
            website: org.website || '',
            createdAt: org.createdAt || Date.now(),
            updatedAt: org.updatedAt || Date.now(),
          }));
        console.log('Transformed organisations:', transformedOrgs);
        console.log('Transformed organisation IDs:', transformedOrgs.map(org => ({ id: org.id, type: typeof org.id })));
        setOrganisations(transformedOrgs);
        
        // Find the user's current organisation and set the selectedOrganisationId
        if (user.organisationId && transformedOrgs.length > 0) {
          console.log('Looking for user organisationId:', user.organisationId);
          console.log('Available organisation IDs:', transformedOrgs.map(org => org.id));
          
          // Try exact match first
          let userOrg = transformedOrgs.find(org => org.id === user.organisationId);
          
          // If no exact match, try string comparison
          if (!userOrg) {
            userOrg = transformedOrgs.find(org => String(org.id) === String(user.organisationId));
          }
          
          // If still no match, try to find by name (for "Unallocated Users")
          if (!userOrg) {
            userOrg = transformedOrgs.find(org => org.name === 'Unallocated Users');
          }
          
          if (userOrg) {
            console.log('Found user organisation:', userOrg);
            setSelectedOrganisationId(userOrg.id);
            setFormData(prev => ({
              ...prev,
              organisationId: userOrg.id
            }));
          } else {
            console.log('User organisation not found in list, setting to first available');
            console.log('First available organisation:', transformedOrgs[0]);
            setSelectedOrganisationId(transformedOrgs[0].id);
            setFormData(prev => ({
              ...prev,
              organisationId: transformedOrgs[0].id
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching organisations:', error);
        setOrganisations([]);
      } finally {
        setOrgLoading(false);
      }
    }
    fetchOrgs();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const updates: {
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        organisationId: string;
        isActive: boolean;
        password?: string;
      } = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        organisationId: formData.organisationId,
        isActive: formData.isActive,
      };

      // Only include password if it's been changed
      if (formData.password.trim()) {
        updates.password = formData.password;
      }

      await updateUser(user.id, updates);
      
      setMessage({ 
        type: 'success', 
        text: 'User updated successfully!' 
      });
      
      // Call the onUpdate callback to refresh the user list
      onUpdate();
      
      // Close the form after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to update user' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update the selected values for dropdowns
    if (field === 'role') {
      setSelectedRole(value as string);
    } else if (field === 'organisationId') {
      setSelectedOrganisationId(value as string);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.06)' }}>
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>
                Update user information and permissions
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

                        <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select 
                value={selectedRole || ''}
                onValueChange={(value) => handleInputChange('role', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organisationId">Organisation</Label>
              {orgLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  <span className="text-sm text-gray-600">Loading organisations...</span>
                </div>
              ) : organisations.length === 0 ? (
                <div className="text-sm text-red-600 p-2 bg-red-50 border border-red-200 rounded">
                  No organisations found. Please create an organisation first.
                </div>
              ) : (
                <Select
                  value={selectedOrganisationId || ''}
                  onValueChange={(value) => handleInputChange('organisationId', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations
                      .filter(org => org && org.id && org.name && org.code)
                      .map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({org.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password (leave blank to keep current)</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked: boolean | 'indeterminate') => 
                  handleInputChange('isActive', checked === true)
                }
              />
              <Label htmlFor="isActive" className="text-sm">
                User is active
              </Label>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Updating...' : 'Update User'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 