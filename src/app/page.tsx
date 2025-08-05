'use client';

import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserButton } from '@clerk/nextjs';
import { Building2, Users, Settings } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-screen">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const isAdmin = (user?.publicMetadata?.role as string) === 'admin';
  const organisationId = user?.publicMetadata?.organisationId as string;

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Workload Wizard</h1>
          <p className="text-muted-foreground">Academic workload management system</p>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* User Info */}
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

      {/* Admin Section */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>Manage your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/admin/users">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">User Management</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/admin/organisations">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Organisations</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/admin">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Admin Dashboard</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main App Section */}
      <Card>
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
          <CardDescription>Access your workload management tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Welcome to Workload Wizard. This system helps academic institutions manage teaching workloads, 
              allocate resources, and track academic staff assignments.
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              {isAdmin && (
                <Button variant="outline" asChild>
                  <Link href="/admin">Admin Panel</Link>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
