'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { OrganisationForm } from '@/components/domain/OrganisationForm';
import { OrganisationsList } from '@/components/domain/OrganisationsList';

export default function AdminOrganisationsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user?.publicMetadata?.role !== 'admin') {
      router.replace('/unauthorised');
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) return <p>Loading...</p>;

  if (user?.publicMetadata?.role !== 'admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organisation Management</h1>
          <p className="text-muted-foreground">Manage organisations and their settings</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sidebar - Create Organisation Form */}
        <div className="xl:col-span-1">
          <OrganisationForm />
        </div>
        
        {/* Main Content - Organisations List */}
        <div className="xl:col-span-2">
          <OrganisationsList />
        </div>
      </div>
    </div>
  );
} 