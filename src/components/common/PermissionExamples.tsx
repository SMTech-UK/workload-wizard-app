import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  PermissionGate,
  PermissionButton,
  PermissionPageWrapper,
  UsersViewGate,
  UsersCreateGate,
  UsersEditGate,
  UsersDeleteGate,
  CreateUserButton,
  EditUserButton,
  DeleteUserButton,
  AdminPageWrapper,
} from "./index";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserActions, useAdminActions } from "@/hooks/usePermissionActions";
import { usePermissionActions } from "@/hooks/usePermissionActions";

export function PermissionExamples() {
  const [message, setMessage] = useState("");
  const permissions = usePermissions();
  const userActions = useUserActions();
  const adminActions = useAdminActions();
  const permissionActions = usePermissionActions();

  const handleAction = async (
    actionName: string,
    action: () => Promise<any>,
  ) => {
    try {
      const result = await action();
      setMessage(`Successfully executed: ${actionName}`);
      return result;
    } catch (error) {
      setMessage(`Error executing ${actionName}: ${error}`);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Permission-Aware UI Examples</CardTitle>
          <CardDescription>
            Examples of how to use the new permission-aware components and
            utilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Permission Gates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Basic Permission Gates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <UsersViewGate>
                  <Badge variant="default">Can View Users</Badge>
                </UsersViewGate>

                <UsersCreateGate>
                  <Badge variant="secondary">Can Create Users</Badge>
                </UsersCreateGate>

                <UsersEditGate>
                  <Badge variant="outline">Can Edit Users</Badge>
                </UsersEditGate>

                <UsersDeleteGate>
                  <Badge variant="destructive">Can Delete Users</Badge>
                </UsersDeleteGate>
              </CardContent>
            </Card>

            {/* Permission Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Permission Buttons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <CreateUserButton
                  onClick={() =>
                    handleAction("Create User", () =>
                      Promise.resolve("User created"),
                    )
                  }
                  size="sm"
                >
                  Create User
                </CreateUserButton>

                <EditUserButton
                  onClick={() =>
                    handleAction("Edit User", () =>
                      Promise.resolve("User edited"),
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  Edit User
                </EditUserButton>

                <DeleteUserButton
                  onClick={() =>
                    handleAction("Delete User", () =>
                      Promise.resolve("User deleted"),
                    )
                  }
                  size="sm"
                  variant="destructive"
                >
                  Delete User
                </DeleteUserButton>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Advanced Permission Gates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Advanced Permission Gates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hide forbidden actions */}
                <div>
                  <h4 className="font-medium mb-2">Hide Forbidden</h4>
                  <UsersDeleteGate hide>
                    <Badge variant="destructive">
                      Delete Button (Hidden if no permission)
                    </Badge>
                  </UsersDeleteGate>
                </div>

                {/* Disable forbidden actions */}
                <div>
                  <h4 className="font-medium mb-2">Disable Forbidden</h4>
                  <UsersEditGate disabled>
                    <Badge variant="outline">
                      Edit Button (Disabled if no permission)
                    </Badge>
                  </UsersEditGate>
                </div>

                {/* Custom fallback */}
                <div>
                  <h4 className="font-medium mb-2">Custom Fallback</h4>
                  <UsersCreateGate
                    fallback={
                      <Badge variant="secondary">
                        No permission to create users
                      </Badge>
                    }
                  >
                    <Badge variant="default">Create Button</Badge>
                  </UsersCreateGate>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Permission Actions Hook */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Permission Actions Hook</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">User Actions</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        handleAction("Create User", () =>
                          userActions.createUser(() =>
                            Promise.resolve("User created"),
                          ),
                        )
                      }
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Create User (with hook)
                    </button>

                    <button
                      onClick={() =>
                        handleAction("Edit User", () =>
                          userActions.editUser(() =>
                            Promise.resolve("User edited"),
                          ),
                        )
                      }
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Edit User (with hook)
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Admin Actions</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        handleAction("Manage Permissions", () =>
                          adminActions.managePermissions(() =>
                            Promise.resolve("Permissions managed"),
                          ),
                        )
                      }
                      className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
                    >
                      Manage Permissions
                    </button>

                    <button
                      onClick={() =>
                        handleAction("Manage Flags", () =>
                          adminActions.manageFlags(() =>
                            Promise.resolve("Flags managed"),
                          ),
                        )
                      }
                      className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                      Manage Feature Flags
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Permission State Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Current Permission States
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <strong>Role:</strong> {permissions.userRole || "Loading..."}
                </div>
                <div>
                  <strong>Can View Users:</strong>{" "}
                  {permissions.canViewUsers() ? "✅" : "❌"}
                </div>
                <div>
                  <strong>Can Create Users:</strong>{" "}
                  {permissions.canCreateUsers() ? "✅" : "❌"}
                </div>
                <div>
                  <strong>Can Edit Users:</strong>{" "}
                  {permissions.canEditUsers() ? "✅" : "❌"}
                </div>
                <div>
                  <strong>Can Delete Users:</strong>{" "}
                  {permissions.canDeleteUsers() ? "✅" : "❌"}
                </div>
                <div>
                  <strong>Can Manage Permissions:</strong>{" "}
                  {permissions.canManagePermissions() ? "✅" : "❌"}
                </div>
                <div>
                  <strong>Can Manage Flags:</strong>{" "}
                  {permissions.canManageFlags() ? "✅" : "❌"}
                </div>
                <div>
                  <strong>Is System Admin:</strong>{" "}
                  {permissions.isSystemAdmin() ? "✅" : "❌"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Results */}
          {message && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Action Result</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{message}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Example of wrapping a page with permission checks
export function ExampleProtectedPage() {
  return (
    <AdminPageWrapper
      organisationId="org123"
      fallback={<div>You need admin permissions to view this page</div>}
      redirectOnDenied={false}
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p>This page is only visible to users with admin permissions.</p>

        {/* Page content here */}
        <PermissionExamples />
      </div>
    </AdminPageWrapper>
  );
}
