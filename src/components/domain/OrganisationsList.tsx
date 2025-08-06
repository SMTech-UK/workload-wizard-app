'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, RefreshCw, Edit } from 'lucide-react';
import { EditOrganisationForm } from './EditOrganisationForm';

export function OrganisationsList() {
  const organisations = useQuery(api.organisations.list);
  const deleteOrganisation = useMutation(api.organisations.remove);
  const [editingOrganisation, setEditingOrganisation] = useState<any>(null);

  // Handle case where Convex might not be ready
  if (organisations === undefined && typeof window !== 'undefined') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading organisations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDeleteOrganisation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organisation?')) return;
    
    try {
      await deleteOrganisation({ id: id as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete organisation');
    }
  };

  const handleEditOrganisation = (organisation: any) => {
    setEditingOrganisation(organisation);
  };

  const handleCloseEdit = () => {
    setEditingOrganisation(null);
  };

  const handleOrganisationUpdated = () => {
    // The list will automatically refresh due to Convex reactivity
    setEditingOrganisation(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (organisations === undefined) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading organisations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Organisations</CardTitle>
          <CardDescription>Manage all organisations in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organisations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No organisations found
                    </TableCell>
                  </TableRow>
                ) : (
                  organisations.map((org) => (
                    <TableRow key={org._id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.code}</TableCell>
                      <TableCell>{org.contactEmail || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          org.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : org.status === 'inactive'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {org.status}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(org.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            onClick={() => handleEditOrganisation(org)}
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            title="Edit organisation"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteOrganisation(org._id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            title="Delete organisation"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Organisation Modal */}
      {editingOrganisation && (
        <EditOrganisationForm
          organisation={editingOrganisation}
          onClose={handleCloseEdit}
          onUpdate={handleOrganisationUpdated}
        />
      )}
    </>
  );
} 