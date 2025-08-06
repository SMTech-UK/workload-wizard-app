'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { X } from 'lucide-react';

interface Organisation {
  _id: string;
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  domain?: string;
  website?: string;
  status: string;
  isActive: boolean;
}

interface EditOrganisationFormProps {
  organisation: Organisation;
  onClose: () => void;
  onUpdate: () => void;
}

export function EditOrganisationForm({ organisation, onClose, onUpdate }: EditOrganisationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const updateOrganisation = useMutation(api.organisations.update);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const data = {
      id: organisation._id as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      contactEmail: formData.get('contactEmail') as string || undefined,
      contactPhone: formData.get('contactPhone') as string || undefined,
      domain: formData.get('domain') as string || undefined,
      website: formData.get('website') as string || undefined,
      status: formData.get('status') as string,
    };

    try {
      await updateOrganisation(data);
      setMessage({ type: 'success', text: 'Organisation updated successfully!' });
      onUpdate();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update organisation' });
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
              <CardTitle>Edit Organisation</CardTitle>
              <CardDescription>Update organisation details</CardDescription>
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
              <Label htmlFor="name">Organisation Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={organisation.name}
                placeholder="University of Cambridge"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Organisation Code *</Label>
              <Input
                id="code"
                name="code"
                required
                defaultValue={organisation.code}
                placeholder="UOC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={organisation.contactEmail || ''}
                placeholder="admin@university.ac.uk"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                defaultValue={organisation.contactPhone || ''}
                placeholder="+44 1223 763 000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                name="domain"
                defaultValue={organisation.domain || ''}
                placeholder="university.ac.uk"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                defaultValue={organisation.website || ''}
                placeholder="https://university.ac.uk"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={organisation.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
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
                {isLoading ? 'Updating...' : 'Update Organisation'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 