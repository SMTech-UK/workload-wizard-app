'use client';

import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Workload Wizard</h1>
        <p className="text-xl text-muted-foreground">Academic workload management system</p>
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
    </div>
  );
}
