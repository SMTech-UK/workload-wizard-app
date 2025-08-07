'use client';

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { StandardizedSidebarLayout } from '@/components/layout/StandardizedSidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building2, Shield, FileText, RefreshCw, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import { listUsers } from '@/lib/actions/userActions';
import { api } from '../../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { hasAnyRole } from '@/lib/utils';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function AdminDashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrganisations: 0,
    activeUsers: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      const [users, organisations] = await Promise.all([
        listUsers(),
        convex.query(api.organisations.list),
      ]);
      
      const activeUsers = users.filter(user => user.isActive).length;
      
      setStats({
        totalUsers: users.length,
        totalOrganisations: organisations.length,
        activeUsers,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isLoaded && !hasAnyRole(user, ['sysadmin', 'developer'])) {
      router.replace('/unauthorised');
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (isLoaded && hasAnyRole(user, ['sysadmin', 'developer'])) {
      fetchStats();
    }
  }, [isLoaded, user]);

  if (!isLoaded) return <p>Loading...</p>;

  if (!hasAnyRole(user, ['sysadmin', 'developer'])) {
    return null; // Will redirect in useEffect
  }

  const adminCards = [
    {
      title: 'User Management',
      description: 'Invite, view, and manage users across all organisations',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      title: 'Organisation Management',
      description: 'Create and manage organisations in the system',
      icon: Building2,
      href: '/admin/organisations',
      color: 'bg-green-500',
    },
    {
      title: 'Permission Registry',
      description: 'Manage system permissions and default role assignments',
      icon: Shield,
      href: '/admin/permissions',
      color: 'bg-indigo-500',
    },
    {
      title: 'Audit Logs',
      description: 'View system activity and user actions',
      icon: FileText,
      href: '/admin/audit-logs',
      color: 'bg-orange-500',
    },
  ];

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Admin" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoadingStats}>
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Quick Action
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Admin Dashboard"
      subtitle="Manage your WorkloadWizard system"
      headerActions={headerActions}
    >

      {/* Admin Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {adminCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${card.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                  </div>
                  <CardDescription className="mt-2">{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Overview of your system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {isLoadingStats ? '...' : stats.totalUsers}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Total Users</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {isLoadingStats ? '...' : stats.totalOrganisations}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Organisations</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {isLoadingStats ? '...' : stats.activeUsers}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Active Users</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </StandardizedSidebarLayout>
  );
} 