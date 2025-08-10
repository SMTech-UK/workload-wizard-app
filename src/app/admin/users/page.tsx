"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { UsersList } from "@/components/domain/UsersList";
import { UserSyncButton } from "@/components/domain/UserSyncButton";
import { Button } from "@/components/ui/button";
import { Users, Plus, Settings } from "lucide-react";
import {
  PermissionGate,
  UsersCreateGate,
  UsersViewGate,
} from "@/components/common/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { handleClientPermissionError } from "@/lib/permission-errors";

export default function AdminUsersPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const usersListRef = useRef<{ handleCreateUser: () => void }>(null);
  const permissions = usePermissions();

  useEffect(() => {
    if (isLoaded && !permissions.canViewUsers()) {
      router.replace("/unauthorised");
    }
  }, [isLoaded, permissions, router]);

  if (!isLoaded) return <p>Loading...</p>;

  if (!permissions.canViewUsers()) {
    return null; // Will redirect in useEffect
  }

  const handleAddUser = () => {
    try {
      if (usersListRef.current) {
        usersListRef.current.handleCreateUser();
      }
    } catch (error) {
      handleClientPermissionError(error as Error, "create users");
    }
  };

  const handleSettingsClick = () => {
    try {
      router.push("/admin/settings");
    } catch (error) {
      handleClientPermissionError(error as Error, "access settings");
    }
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Admin", href: "/admin" },
    { label: "Users" },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <PermissionGate permission="permissions.manage">
        <Button variant="outline" size="sm" onClick={handleSettingsClick}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </PermissionGate>
      <UsersCreateGate>
        <Button size="sm" onClick={handleAddUser}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </UsersCreateGate>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="User Management"
      subtitle="Manage users and organisations"
      headerActions={headerActions}
    >
      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Users List */}
        <UsersViewGate>
          <UsersList ref={usersListRef} />
        </UsersViewGate>
      </div>
    </StandardizedSidebarLayout>
  );
}
