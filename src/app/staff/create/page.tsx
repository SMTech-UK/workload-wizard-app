"use client";

import { useUser } from "@clerk/nextjs";
import { PermissionGate } from "@/components/common/PermissionGate";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { withToast } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    fte: "1",
  });

  const orgSettings = useQuery(
    (api as any).organisationSettings.getOrganisationSettings,
    {
      userId: user?.id || "",
    },
  );

  const ROLE_OPTIONS = orgSettings?.staffRoleOptions ?? [
    "Lecturer",
    "Senior Lecturer",
    "Teaching Fellow",
    "Associate Lecturer",
    "Professor",
  ];

  const TEAM_OPTIONS = orgSettings?.teamOptions ?? [
    "Computing",
    "Engineering",
    "Business",
    "Design",
  ];

  const BASE_MAX_TEACHING_AT_FTE_1 = orgSettings?.baseMaxTeachingAtFTE1 ?? 400; // hours at FTE=1
  const BASE_TOTAL_CONTRACT_AT_FTE_1 =
    orgSettings?.baseTotalContractAtFTE1 ?? 550; // hours at FTE=1

  const fteNum = useMemo(() => {
    const n = Number(form.fte);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }, [form.fte]);

  const derivedMaxTeaching = useMemo(() => {
    // If a per-role rule exists, apply it; else use base = %100 of FTE1
    const rules = (orgSettings as any)?.roleMaxTeachingRules as
      | { role: string; mode: "percent" | "fixed"; value: number }[]
      | undefined;
    const match = rules?.find((r) => r.role === form.role);
    const fte1 = BASE_TOTAL_CONTRACT_AT_FTE_1;
    let baseAtFte1: number;
    if (match) {
      baseAtFte1 =
        match.mode === "percent" ? (match.value / 100) * fte1 : match.value;
    } else {
      baseAtFte1 = BASE_MAX_TEACHING_AT_FTE_1;
    }
    return Math.round(baseAtFte1 * fteNum);
  }, [
    fteNum,
    BASE_TOTAL_CONTRACT_AT_FTE_1,
    BASE_MAX_TEACHING_AT_FTE_1,
    (orgSettings as any)?.roleMaxTeachingRules,
    form.role,
  ]);
  const derivedTotalContract = useMemo(
    () => Math.round(BASE_TOTAL_CONTRACT_AT_FTE_1 * fteNum),
    [fteNum, BASE_TOTAL_CONTRACT_AT_FTE_1],
  );

  // Keep form.role and form.teamName valid when org settings update
  useEffect(() => {
    const roles = ROLE_OPTIONS;
    const teams = TEAM_OPTIONS;
    setForm((prev) => {
      let next = prev;
      if (roles.length > 0 && !roles.includes(prev.role)) {
        next = { ...next, role: roles[0] };
      }
      if (teams.length > 0 && !teams.includes(prev.teamName)) {
        next = { ...next, teamName: teams[0] };
      }
      return next;
    });
  }, [orgSettings?.staffRoleOptions, orgSettings?.teamOptions]);

  const canSubmit = useMemo(() => {
    return (
      !!form.fullName.trim() &&
      !!form.email.trim() &&
      !!form.role.trim() &&
      !!form.teamName.trim()
    );
  }, [form]);

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
            contract: fteNum >= 0.995 ? "FT" : "PT",
            fte: fteNum,
            maxTeachingHours: derivedMaxTeaching,
            totalContract: derivedTotalContract,
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
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r: string) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Select
                  value={form.teamName}
                  onValueChange={(v) => setForm((f) => ({ ...f, teamName: v }))}
                >
                  <SelectTrigger id="team">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_OPTIONS.map((t: string) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Contract is derived from FTE; no manual field */}
              <div className="space-y-2">
                <Label htmlFor="fte">FTE</Label>
                <Input
                  id="fte"
                  type="number"
                  inputMode="decimal"
                  value={form.fte}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = Number(raw);
                    if (Number.isNaN(n)) {
                      setForm((f) => ({ ...f, fte: "0" }));
                      return;
                    }
                    const clamped = Math.max(0, Math.min(1, n));
                    setForm((f) => ({ ...f, fte: String(clamped) }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTeaching">Max Teaching Hours</Label>
                <Input
                  id="maxTeaching"
                  type="number"
                  value={derivedMaxTeaching}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalContract">Total Contract Hours</Label>
                <Input
                  id="totalContract"
                  type="number"
                  value={derivedTotalContract}
                  disabled
                />
              </div>
              {/* Preferences moved to post-creation editing */}
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
