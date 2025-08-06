'use client';

import { useUser } from '@clerk/nextjs';
import { StandardizedSidebarLayout } from '@/components/layout/StandardizedSidebarLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Users, Shield } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { user, isLoaded } = useUser();
  const isSystemAdmin = user?.publicMetadata?.role === 'sysadmin' || user?.publicMetadata?.role === 'developer';
  const isOrgAdmin = user?.publicMetadata?.role === 'orgadmin';
  const organisationId = user?.publicMetadata?.organisationId as string;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  const breadcrumbs = [
    { label: "Home" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      {isSystemAdmin && (
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin">
            <Shield className="h-4 w-4 mr-2" />
            Admin
          </Link>
        </Button>
      )}
      {(isOrgAdmin || isSystemAdmin) && (
        <Button size="sm" asChild>
          <Link href="/organisation">
            <Users className="h-4 w-4 mr-2" />
            Organisation
          </Link>
        </Button>
      )}
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Workload Wizard"
      subtitle="Academic workload management system"
      headerActions={headerActions}
    >
      {/* Welcome Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <p className="text-lg text-muted-foreground">
            Welcome to your academic workload management hub. Organize your teaching assignments, 
            research commitments, and administrative tasks all in one place.
          </p>
        </div>
      </div>

      {/* User Info Card */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{user.emailAddresses[0]?.emailAddress}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                <p className="capitalize">{(user.publicMetadata?.role as string) || 'No role assigned'}</p>
              </div>
              {organisationId && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organisation</p>
                  <p>{organisationId}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Access your workload management tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Welcome to Workload Wizard. This system helps academic institutions manage teaching workloads, 
              allocate resources, and track academic staff assignments.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              {isSystemAdmin && (
                <Button variant="outline" asChild>
                  <Link href="/admin">System Admin Panel</Link>
                </Button>
              )}
              {(isOrgAdmin || isSystemAdmin) && (
                <Button variant="outline" asChild>
                  <Link href="/organisation">Organisation Admin Panel</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </StandardizedSidebarLayout>
  );
}
