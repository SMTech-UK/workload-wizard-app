"use client";

import { useUser } from "@clerk/nextjs";
import { PermissionGate } from "@/components/common/PermissionGate";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { withToast } from "@/lib/utils";

export default function CreateLecturerProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const create = useMutation((api as any).staff.create);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    role: "Lecturer",
    teamName: "",
    contract: "FT",
    fte: "1.0",
    maxTeachingHours: "400",
    totalContract: "550",
    prefWorkingLocation: "",
    prefSpecialism: "",
    prefNotes: "",
  });

  const canSubmit = useMemo(
    () => form.fullName.trim() && form.email.trim(),
    [form],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await withToast(
        () =>
          create({
            userId: user!.id,
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            role: form.role.trim(),
            teamName: form.teamName.trim(),
            contract: form.contract,
            fte: Number(form.fte),
            maxTeachingHours: Number(form.maxTeachingHours),
            totalContract: Number(form.totalContract),
            prefWorkingLocation: form.prefWorkingLocation.trim(),
            prefSpecialism: form.prefSpecialism.trim(),
            prefNotes: form.prefNotes.trim(),
          } as any),
        {
          success: {
            title: "Profile created",
            description: "Lecturer profile created successfully!",
          },
          error: { title: "Failed to create profile" },
        },
        toast,
      );

      window.location.href = "/staff";
    } catch (error) {
      // handled by withToast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StandardizedSidebarLayout
      breadcrumbs={[
        { label: "Staff", href: "/staff" },
        { label: "Create Profile" },
      ]}
      title="Create Lecturer Profile"
    >
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionGate
            permission="staff.create"
            fallback={
              <div className="text-sm text-muted-foreground">
                You do not have permission to create staff profiles.
              </div>
            }
          >
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              onSubmit={handleSubmit}
            >
              <div className="space-y-2">
                <Label htmlFor="fullName">Name</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Input
                  id="team"
                  value={form.teamName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, teamName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contract">Contract</Label>
                <Input
                  id="contract"
                  value={form.contract}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contract: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fte">FTE</Label>
                <Input
                  id="fte"
                  type="number"
                  inputMode="decimal"
                  value={form.fte}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fte: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTeaching">Max Teaching Hours</Label>
                <Input
                  id="maxTeaching"
                  type="number"
                  inputMode="numeric"
                  value={form.maxTeachingHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxTeachingHours: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalContract">Total Contract Hours</Label>
                <Input
                  id="totalContract"
                  type="number"
                  inputMode="numeric"
                  value={form.totalContract}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, totalContract: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="prefWork">Preferred Working Location</Label>
                <Input
                  id="prefWork"
                  value={form.prefWorkingLocation}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      prefWorkingLocation: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="specialism">Specialism</Label>
                <Input
                  id="specialism"
                  value={form.prefSpecialism}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, prefSpecialism: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={form.prefNotes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, prefNotes: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <PermissionGate
                  permission="staff.create"
                  fallback={
                    <Button
                      type="button"
                      className="w-full"
                      disabled
                      title="Insufficient permissions"
                    >
                      Create Profile
                    </Button>
                  }
                >
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!canSubmit || !user?.id || isLoading}
                  >
                    {isLoading ? "Creating..." : "Create Profile"}
                  </Button>
                </PermissionGate>
              </div>
            </form>
          </PermissionGate>
        </CardContent>
      </Card>
    </StandardizedSidebarLayout>
  );
}
