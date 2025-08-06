'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { createUser } from '@/lib/actions/userActions';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

interface CreateUserFormProps {
  organisationId: string;
  onClose: () => void;
  onUserCreated: () => void;
}

export function CreateUserForm({ organisationId, onClose, onUserCreated }: CreateUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Get organisational roles for this organisation
  const organisationalRoles = useQuery(api.organisationalRoles.listByOrganisation, { 
    organisationId: organisationId as any // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const data = {
      email: formData.get('email') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      role: 'user' as const, // Always create as 'user' system role
      organisationId: organisationId,
      sendEmailInvitation: formData.get('sendEmailInvitation') === 'true',
      organisationalRoleId: formData.get('organisationalRole') as string,
    };

    try {
      await createUser(data);
      setMessage({ type: 'success', text: 'User created successfully!' });
      onUserCreated();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to create user' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add User</CardTitle>
              <CardDescription>Add a new user to your organisation</CardDescription>
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
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                name="lastName"
                required
                placeholder="Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                name="username"
                required
                placeholder="johndoe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organisationalRole">Organisational Role *</Label>
              <Select name="organisationalRole" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select organisational role" />
                </SelectTrigger>
                <SelectContent>
                  {organisationalRoles?.map((role) => (
                    <SelectItem key={role._id} value={role._id}>
                      {role.name}
                    </SelectItem>
                  )) || []}
                </SelectContent>
              </Select>
              {organisationalRoles?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No organisational roles found. Please create roles first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sendEmailInvitation">Send Email Invitation</Label>
              <Select name="sendEmailInvitation" defaultValue="true">
                <SelectTrigger>
                  <SelectValue placeholder="Send invitation email?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes, send invitation email</SelectItem>
                  <SelectItem value="false">No, I&apos;ll contact them separately</SelectItem>
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
                {isLoading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 