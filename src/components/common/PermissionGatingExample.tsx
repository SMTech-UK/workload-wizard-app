"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePermissionGating } from "@/hooks/usePermissionGating";
import { PERMISSIONS } from "@/lib/permissions";

/**
 * Example component demonstrating centralized permission gating
 * Shows how to disable/hide forbidden actions based on org vs system roles
 */
export function PermissionGatingExample({
  organisationId,
}: {
  organisationId?: string;
}) {
  const { gateElement, gateButton, gateField, hasPermission } =
    usePermissionGating(organisationId);

  // Example: Gate a button based on permission
  const buttonState = gateButton("users.create", {
    isSystemAction: false,
    disabledText: "Only admins can create users",
  });

  // Example: Gate a form field
  const fieldState = gateField("users.edit", {
    isSystemAction: false,
    readonly: false,
  });

  // Example: Gate an entire element
  const elementState = gateElement("flags.manage", {
    hideForbidden: true,
    isSystemAction: true,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Permission Gating Examples</CardTitle>
          <CardDescription>
            Demonstrates centralized gating for org vs system roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gated Button */}
          <div className="space-y-2">
            <Label>Create User Button</Label>
            <Button
              disabled={buttonState.disabled}
              title={buttonState.disabledText}
            >
              Create User
            </Button>
            {buttonState.disabled && (
              <p className="text-sm text-muted-foreground">
                {buttonState.disabledText}
              </p>
            )}
          </div>

          {/* Gated Form Field */}
          <div className="space-y-2">
            <Label>Edit User Field</Label>
            <Input
              placeholder="User name"
              readOnly={fieldState.readonly}
              disabled={fieldState.disabled}
            />
            {fieldState.disabled && (
              <p className="text-sm text-muted-foreground">
                You don't have permission to edit users
              </p>
            )}
          </div>

          {/* Gated Element */}
          {elementState.visible && (
            <div className="space-y-2">
              <Label>Feature Flag Management</Label>
              <Button variant="outline">Manage Flags</Button>
            </div>
          )}

          {/* Permission Status */}
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-2">Permission Status</h4>
            <div className="space-y-1 text-sm">
              <div>
                Can create users: {hasPermission("users.create") ? "✅" : "❌"}
              </div>
              <div>
                Can edit users: {hasPermission("users.edit") ? "✅" : "❌"}
              </div>
              <div>
                Can manage flags:{" "}
                {hasPermission("flags.manage", true) ? "✅" : "❌"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
