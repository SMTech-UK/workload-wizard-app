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
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organisation Management</h1>
          <p className="text-muted-foreground">Manage organisations and their settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <OrganisationForm />
        </div>
        <div className="lg:col-span-2">
          <OrganisationsList />
        </div>
      </div>
    </div>
  );
} 