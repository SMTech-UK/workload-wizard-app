'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { inviteUser, InviteUserData } from '@/lib/actions/userActions';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'lecturer', label: 'Lecturer' },
  { value: 'staff', label: 'Staff' },
] as const;

export function InviteUserForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const organisations = useQuery(api.organisations.list);

  // Handle case where Convex might not be ready
  if (organisations === undefined && typeof window !== 'undefined') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <span>Loading organisations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const data: InviteUserData = {
      email: formData.get('email') as string,
      role: formData.get('role') as 'admin' | 'lecturer' | 'staff',
      organisationId: formData.get('organisationId') as string,
    };

    try {
      await inviteUser(data);
      setMessage({ type: 'success', text: 'User invited successfully!' });
      (event.target as HTMLFormElement).reset();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to invite user' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Invite User</CardTitle>
        <CardDescription>Send an invitation to a new user</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="role">Role</Label>
            <Select name="role" required>
              <SelectTrigger>
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
            <Select name="organisationId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select an organisation" />
              </SelectTrigger>
              <SelectContent>
                {organisations?.map((org) => (
                  <SelectItem key={org._id} value={org._id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Inviting...' : 'Send Invitation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 