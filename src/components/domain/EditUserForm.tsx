'use client';

import posthog from 'posthog-js';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Key } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

interface User {
  _id?: string;
  id?: string;
  email: string;
  username?: string;
  givenName?: string;
  familyName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  systemRoles?: string[];
  roles?: string[];
  organisationId: string;
  isActive: boolean;
  subject?: string; // Clerk user ID
  organisationalRoles?: {
    id: string;
    name: string;
  }[];
  organisation?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface EditUserFormProps {
  user: User;
  onClose: () => void;
  onUserUpdated: () => void;
  isSysadmin?: boolean; // Flag to indicate if this is for sysadmin use
}

export function EditUserForm({ user, onClose, onUserUpdated, isSysadmin = false }: EditUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedOrganisationId, setSelectedOrganisationId] = useState(user.organisationId);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    user.systemRoles || user.roles || []
  );
  const [selectedOrgRoleIds, setSelectedOrgRoleIds] = useState<string[]>([]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Get all organisations for sysadmin use
  const organisations = useQuery(api.organisations.list);
  
  // Get organisational roles for the selected organisation
  const organisationalRoles = useQuery(
    api.organisationalRoles.listByOrganisation, 
    selectedOrganisationId
      ? { organisationId: selectedOrganisationId as unknown as Id<'organisations'> }
      : "skip"
  );

  useEffect(() => {
    const incoming = ((user as unknown as { organisationalRoles?: { id: string }[] }).organisationalRoles || []).map((r) => r.id);
    setSelectedOrgRoleIds(incoming);
  }, [user]);


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const data = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      username: formData.get('username') as string,
      email: formData.get('email') as string,
      systemRoles: selectedRoles,
      organisationalRoleIds: selectedOrgRoleIds,
      organisationId: isSysadmin ? selectedOrganisationId : user.organisationId,
    };

    try {
      // Update user details in both Clerk and Convex
      const updatePromises = [];
      
      // Check if email has changed
      const emailChanged = data.email && data.email.trim() !== user.email;

      if (user.subject) {
        
        if (emailChanged) {
          // If email changed, use the email update API
          updatePromises.push(
            fetch('/api/update-user-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.subject,
                newEmail: data.email.trim(),
              }),
            })
          );
        }

        // Update other user details (excluding email if it's being updated separately)
        updatePromises.push(
          fetch('/api/update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.subject,
              firstName: data.firstName,
              lastName: data.lastName,
              username: data.username?.trim() || undefined,
              systemRoles: data.systemRoles,
              organisationalRoleIds: data.organisationalRoleIds,
              organisationId: data.organisationId,
              // Don't include email - it's handled separately if changed
            }),
          })
        );
      }

      // Execute all updates in parallel
      const responses = await Promise.all(updatePromises);
      
      // Check if any updates failed
      for (const response of responses) {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update user');
        }
      }

      posthog.capture('user-details-updated', {
        user_id: user.subject,
        email_changed: emailChanged,
        is_sysadmin: isSysadmin,
      });

      const successMessage = emailChanged 
        ? 'User updated successfully! Email has been updated and verified.' 
        : 'User updated successfully!';
      setMessage({ type: 'success', text: successMessage });
      onUserUpdated();
      
      // Close modal after showing success message
      timeoutRef.current = setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      // Clear any pending timeout if there's an error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update user' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!user.subject) {
      setMessage({ type: 'error', text: 'Cannot reset password: User not found in Clerk' });
      return;
    }

    setIsResettingPassword(true);
    setMessage(null);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.subject,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send password reset email');
      }

      posthog.capture('user-password-reset-initiated', {
        user_id: user.subject,
        is_sysadmin: isSysadmin,
      });

      const result = await response.json();
      setMessage({ 
        type: 'success', 
        text: result.action === 'password_disabled' 
          ? `✅ Password disabled for ${result.userEmail}. User must use "Forgot Password?" on the sign-in page to set a new password.`
          : result.message 
      });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to send password reset email' });
    } finally {
      setIsResettingPassword(false);
    }
  }



  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/20 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>Update user details</CardDescription>
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
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                name="firstName"
                required
                defaultValue={user.givenName || user.firstName || ''}
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                name="lastName"
                required
                defaultValue={user.familyName || user.lastName || ''}
                placeholder="Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                placeholder="username"
                defaultValue={user.username || ''}
              />
              <p className="text-xs text-muted-foreground">
                3-20 characters, letters, numbers, underscore, or dash only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={user.email}
                placeholder="user@example.com"
              />
            </div>

            {/* Organisation Selection for Sysadmin */}
            {isSysadmin && (
              <div className="space-y-2">
                <Label htmlFor="organisation">Organisation *</Label>
                <Select 
                  value={selectedOrganisationId || ''} 
                  onValueChange={setSelectedOrganisationId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations?.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name}
                      </SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>System Roles *</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="role-user"
                    checked={selectedRoles.includes('user')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRoles([...selectedRoles, 'user']);
                      } else {
                        setSelectedRoles(selectedRoles.filter(role => role !== 'user'));
                      }
                    }}
                  />
                  <Label htmlFor="role-user" className="text-sm font-normal">User</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="role-orgadmin"
                    checked={selectedRoles.includes('orgadmin')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRoles([...selectedRoles, 'orgadmin']);
                      } else {
                        setSelectedRoles(selectedRoles.filter(role => role !== 'orgadmin'));
                      }
                    }}
                  />
                  <Label htmlFor="role-orgadmin" className="text-sm font-normal">Organisation Admin</Label>
                </div>
                {isSysadmin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-sysadmin"
                      checked={selectedRoles.includes('sysadmin')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, 'sysadmin']);
                        } else {
                          setSelectedRoles(selectedRoles.filter(role => role !== 'sysadmin'));
                        }
                      }}
                    />
                    <Label htmlFor="role-sysadmin" className="text-sm font-normal">System Admin</Label>
                  </div>
                )}
                {isSysadmin && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-developer"
                      checked={selectedRoles.includes('developer')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, 'developer']);
                        } else {
                          setSelectedRoles(selectedRoles.filter(role => role !== 'developer'));
                        }
                      }}
                    />
                    <Label htmlFor="role-developer" className="text-sm font-normal">Developer</Label>
                  </div>
                )}
              </div>
              {selectedRoles.length === 0 && (
                <p className="text-sm text-red-600">Please select at least one role</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Organisational Roles</Label>
              <div className="flex flex-wrap gap-2">
                {organisationalRoles?.map((role) => {
                  const checked = selectedOrgRoleIds.includes(role._id);
                  return (
                    <button
                      key={role._id}
                      type="button"
                      onClick={() => setSelectedOrgRoleIds(checked ? selectedOrgRoleIds.filter(id => id !== role._id) : [...selectedOrgRoleIds, role._id])}
                      className={`px-2 py-1 rounded border text-xs ${checked ? 'bg-slate-900 text-white' : 'bg-white'}`}
                    >
                      {role.name}
                    </button>
                  );
                }) || []}
              </div>
            </div>
            {(!organisationalRoles || organisationalRoles.length === 0) && (
              <p className="text-sm text-muted-foreground">
                {isSysadmin && !selectedOrganisationId 
                  ? 'Please select an organisation first' 
                  : 'No organisational roles found for this organisation.'}
              </p>
            )}

            {/* Password Reset Section */}
            <div className="border-t pt-4">
              <div className="space-y-2">
                <Label>Password Management</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetPassword}
                  //disabled={isResettingPassword || !user.subject}
                  className="w-full"
                  disabled={true}
                >
                  <Key className="w-4 h-4 mr-2" />
                  {isResettingPassword ? 'Sending...' : 'Coming Soon'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Sends a password reset code via email to {user.email}
                </p>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-md text-sm ${ 
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 
