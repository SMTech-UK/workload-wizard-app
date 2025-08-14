"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { createUser } from "@/lib/actions/userActions";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { toastError } from "@/lib/utils";
import { analytics } from "@/lib/analytics";

interface CreateUserFormProps {
  organisationId?: string; // Optional for sysadmin use
  onClose: () => void;
  onUserCreated: () => void;
  isSysadmin?: boolean; // Flag to indicate if this is for sysadmin use
}

export function CreateUserForm({
  organisationId,
  onClose,
  onUserCreated,
  isSysadmin = false,
}: CreateUserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [selectedOrganisationId, setSelectedOrganisationId] = useState(
    organisationId || null,
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["user"]);
  const [selectedOrgRoleIds, setSelectedOrgRoleIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Get all organisations for sysadmin use
  const organisations = useQuery(api.organisations.list);

  // Get organisational roles for the selected organisation
  const organisationalRoles = useQuery(
    api.organisationalRoles.listByOrganisation,
    selectedOrganisationId
      ? {
          organisationId:
            selectedOrganisationId as unknown as Id<"organisations">,
        }
      : "skip",
  );

  const Schema = z.object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Invalid email"),
    username: z
      .string()
      .trim()
      .min(3, "Min 3 chars")
      .max(20, "Max 20 chars")
      .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, _ or -"),
    organisationId: z.string().min(1, "Organisation is required"),
    roles: z.array(z.string()).min(1, "Select at least one role"),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const targetOrganisationId = isSysadmin
      ? selectedOrganisationId
      : organisationId;

    let data: any;
    try {
      data = Schema.parse({
        email: formData.get("email") as string,
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        username: formData.get("username") as string,
        roles: selectedRoles,
        organisationId: String(targetOrganisationId || ""),
      });
    } catch (err) {
      toast({
        title: "Validation error",
        description:
          err instanceof Error ? err.message : "Please check the form",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    data.password = ""; // auto-generated server-side
    data.sendEmailInvitation = true;
    data.organisationalRoleId = undefined as unknown as string;

    try {
      await createUser(data);
      analytics.track("user.created", {
        organisationId: data.organisationId,
        roleCount: data.roles?.length,
      });
      toast({
        title: "User created",
        description: "User created successfully!",
        variant: "success",
      });
      setMessage({ type: "success", text: "User created successfully!" });
      onUserCreated();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      toastError(toast, error, "Failed to create user");
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create user",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/20 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add User</CardTitle>
              <CardDescription>
                {isSysadmin
                  ? "Add a new user to any organisation"
                  : "Add a new user to your organisation"}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                name="firstName"
                required
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" name="lastName" required placeholder="Doe" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                name="username"
                required
                placeholder="johndoe"
              />
            </div>

            {/* Organisation Selection for Sysadmin */}
            {isSysadmin && (
              <div className="space-y-2">
                <Label htmlFor="organisation">Organisation *</Label>
                <Select
                  value={selectedOrganisationId || ""}
                  onValueChange={setSelectedOrganisationId}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organisation" />
                  </SelectTrigger>
                  <SelectContent>
                    {organisations?.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name}
                      </SelectItem>
                    )) || []}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* System Role Selection for Sysadmin */}
            {isSysadmin && (
              <div className="space-y-2">
                <Label>System Roles *</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-user"
                      checked={selectedRoles.includes("user")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, "user"]);
                        } else {
                          setSelectedRoles(
                            selectedRoles.filter((role) => role !== "user"),
                          );
                        }
                      }}
                    />
                    <Label htmlFor="role-user" className="text-sm font-normal">
                      User
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-orgadmin"
                      checked={selectedRoles.includes("orgadmin")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, "orgadmin"]);
                        } else {
                          setSelectedRoles(
                            selectedRoles.filter((role) => role !== "orgadmin"),
                          );
                        }
                      }}
                    />
                    <Label
                      htmlFor="role-orgadmin"
                      className="text-sm font-normal"
                    >
                      Organisation Admin
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-sysadmin"
                      checked={selectedRoles.includes("sysadmin")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, "sysadmin"]);
                        } else {
                          setSelectedRoles(
                            selectedRoles.filter((role) => role !== "sysadmin"),
                          );
                        }
                      }}
                    />
                    <Label
                      htmlFor="role-sysadmin"
                      className="text-sm font-normal"
                    >
                      System Admin
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-developer"
                      checked={selectedRoles.includes("developer")}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedRoles([...selectedRoles, "developer"]);
                        } else {
                          setSelectedRoles(
                            selectedRoles.filter(
                              (role) => role !== "developer",
                            ),
                          );
                        }
                      }}
                    />
                    <Label
                      htmlFor="role-developer"
                      className="text-sm font-normal"
                    >
                      Developer
                    </Label>
                  </div>
                </div>
                {selectedRoles.length === 0 && (
                  <p className="text-sm text-red-600">
                    Please select at least one role
                  </p>
                )}
              </div>
            )}

            {/* Organisational Roles (multi-select) */}
            {(selectedOrganisationId || !isSysadmin) && (
              <div className="space-y-2">
                <Label>Organisational Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {organisationalRoles?.map((role) => {
                    const checked = selectedOrgRoleIds.includes(role._id);
                    return (
                      <button
                        key={role._id}
                        type="button"
                        onClick={() =>
                          setSelectedOrgRoleIds(
                            checked
                              ? selectedOrgRoleIds.filter(
                                  (id) => id !== role._id,
                                )
                              : [...selectedOrgRoleIds, role._id],
                          )
                        }
                        className={`px-2 py-1 rounded border text-xs ${checked ? "bg-slate-900 text-white" : "bg-white"}`}
                      >
                        {role.name}
                      </button>
                    );
                  }) || []}
                </div>
                {(!organisationalRoles || organisationalRoles.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    {isSysadmin && !selectedOrganisationId
                      ? "Please select an organisation first"
                      : "No organisational roles found. Please create roles first."}
                  </p>
                )}
              </div>
            )}

            {message && (
              <div
                className={`p-3 rounded-md text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
