'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createUser, CreateUserData } from '@/lib/actions/userActions';
import { api } from '../../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import type { Organisation } from '@/lib/types';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const ROLES = [
  { value: 'sysadmin', label: 'System Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'orgadmin', label: 'Organisation Admin' },
  { value: 'user', label: 'User' },
  { value: 'trial', label: 'Trial' },
] as const;

export function CreateUserForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [sendEmailInvitation, setSendEmailInvitation] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [selectedOrganisationId, setSelectedOrganisationId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('user');

  useEffect(() => {
    async function fetchOrgs() {
      setOrgLoading(true);
      try {
        const orgs = await convex.query(api.organisations.list);
        // Transform Convex format to match Organisation interface
        const transformedOrgs = orgs.map(org => ({
          id: org._id,
          name: org.name,
          code: org.code,
          contactEmail: org.contactEmail,
          contactPhone: org.contactPhone,
          domain: org.domain,
          isActive: org.isActive,
          status: org.status as 'active' | 'inactive' | 'suspended',
          website: org.website,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
        }));
        setOrganisations(transformedOrgs);
        // Set default to "Unallocated Users" if it exists, otherwise first organisation
        const unallocatedOrg = transformedOrgs.find(org => org.name === 'Unallocated Users');
        if (unallocatedOrg) {
          setSelectedOrganisationId(unallocatedOrg.id);
        } else if (transformedOrgs.length > 0) {
          setSelectedOrganisationId(transformedOrgs[0].id);
        }
      } finally {
        setOrgLoading(false);
      }
    }
    fetchOrgs();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);
    setGeneratedPassword(null);

    const formData = new FormData(event.currentTarget);
    const data: CreateUserData = {
      email: formData.get('email') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      username: formData.get('username') as string,
      password: '', // Will be generated automatically
      role: selectedRole as 'orgadmin' | 'sysadmin' | 'developer' | 'user' | 'trial',
      organisationId: selectedOrganisationId,
      sendEmailInvitation,
    };

    try {
      const result = await createUser(data);
      
      if (result.success) {
        if (result.emailSent) {
          setMessage({ 
            type: 'success', 
            text: 'User created successfully! Invitation email sent with temporary password.' 
          });
        } else if (result.temporaryPassword) {
          setGeneratedPassword(result.temporaryPassword);
          setMessage({ 
            type: 'success', 
            text: 'User created successfully! Temporary password generated (email not sent).' 
          });
        } else {
          setMessage({ 
            type: 'success', 
            text: 'User created successfully!' 
          });
        }
        
        (event.target as HTMLFormElement).reset();
        setSendEmailInvitation(true);
      } else {
        setMessage({ type: 'error', text: 'Failed to create user' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to create user' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create User</CardTitle>
        <CardDescription>Create a new user account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                required
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                required
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              placeholder="johndoe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organisation">Organisation</Label>
            <Select 
              value={selectedOrganisationId} 
              onValueChange={setSelectedOrganisationId}
              disabled={orgLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={orgLoading ? 'Loading organisations...' : 'Select organisation'} />
              </SelectTrigger>
              <SelectContent>
                {organisations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name} ({org.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              value={selectedRole} 
              onValueChange={setSelectedRole}
              required
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendEmailInvitation"
              checked={sendEmailInvitation}
              onCheckedChange={(checked: boolean | 'indeterminate') => setSendEmailInvitation(checked === true)}
            />
            <Label htmlFor="sendEmailInvitation" className="text-sm">
              Send email invitation to user
            </Label>
          </div>

          {!sendEmailInvitation && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> A temporary password will be generated. The user will need to change it on first login.
              </p>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating...' : 'Create User'}
          </Button>

          {message && (
            <div className={`p-3 rounded-md text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {generatedPassword && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-blue-900 mb-2">Temporary Password Generated</h3>
              <div className="bg-white p-3 border border-blue-300 rounded font-mono text-sm">
                <strong>Password:</strong> {generatedPassword}
              </div>
              <p className="text-sm text-blue-700 mt-2">
                <strong>Important:</strong> Please communicate this password securely to the user. 
                They should change it immediately after their first login.
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
} 