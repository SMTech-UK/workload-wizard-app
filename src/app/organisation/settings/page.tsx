"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PermissionGate } from "@/components/common/PermissionGate";

export default function OrganisationSettingsPage() {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Organisation", href: "/organisation" },
    { label: "Settings" },
  ];

  const { user } = useUser();
  const anyApi = api as any;
  const settings = useQuery(
    anyApi.organisationSettings.getOrganisationSettings,
    {
      userId: user?.id || "",
    },
  );
  const upsert = useMutation(
    anyApi.organisationSettings.upsertOrganisationSettings,
  );

  const [roleOptions, setRoleOptions] = useState<string[] | null>(null);
  const [teamOptions, setTeamOptions] = useState<string[] | null>(null);
  const [campusOptions, setCampusOptions] = useState<string[] | null>(null);
  const [familyOptions, setFamilyOptions] = useState<string[] | null>(null);
  const [newRole, setNewRole] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [newCampus, setNewCampus] = useState("");
  const [newFamily, setNewFamily] = useState("");
  const [fte1ContractHours, setFte1ContractHours] = useState<string | null>(
    null,
  );

  const [familyRules, setFamilyRules] = useState<
    { family: string; mode: "percent" | "fixed"; value: number }[] | null
  >(null);

  const effective = useMemo(() => {
    return {
      staffRoleOptions: roleOptions ?? settings?.staffRoleOptions ?? [],
      teamOptions: teamOptions ?? settings?.teamOptions ?? [],
      campusOptions: campusOptions ?? settings?.campusOptions ?? [],
      contractFamilyOptions:
        familyOptions ?? settings?.contractFamilyOptions ?? [],
      // Single source of truth: 1 FTE contract hours; use it for both fields on the backend
      baseMaxTeachingAtFTE1:
        fte1ContractHours !== null
          ? Number(fte1ContractHours)
          : (settings?.baseTotalContractAtFTE1 ?? 550),
      baseTotalContractAtFTE1:
        fte1ContractHours !== null
          ? Number(fte1ContractHours)
          : (settings?.baseTotalContractAtFTE1 ?? 550),
      familyMaxTeachingRules:
        familyRules ?? settings?.familyMaxTeachingRules ?? [],
    };
  }, [
    roleOptions,
    teamOptions,
    campusOptions,
    fte1ContractHours,
    settings,
    familyRules,
    familyOptions,
  ]);

  const save = async () => {
    if (!user?.id) return;
    await upsert({ userId: user.id, ...effective });
  };

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Organisation Settings"
    >
      <PermissionGate permission="organisations.manage">
        <Card>
          <CardHeader>
            <CardTitle>Staff Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Role options</Label>
                <div className="flex gap-2">
                  <Input
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="Add role (e.g. Lecturer)"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const val = newRole.trim();
                      if (!val) return;
                      const current =
                        roleOptions ?? settings?.staffRoleOptions ?? [];
                      if (!current.includes(val)) {
                        setRoleOptions([...(current as string[]), val]);
                      }
                      setNewRole("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(roleOptions ?? settings?.staffRoleOptions ?? []).map(
                    (r: string) => (
                      <div
                        key={r}
                        className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                      >
                        <span>{r}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setRoleOptions(
                              (
                                roleOptions ??
                                settings?.staffRoleOptions ??
                                []
                              ).filter((x: string) => x !== r),
                            )
                          }
                        >
                          ×
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Team options</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                    placeholder="Add team (e.g. Computing)"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const val = newTeam.trim();
                      if (!val) return;
                      const current =
                        teamOptions ?? settings?.teamOptions ?? [];
                      if (!current.includes(val)) {
                        setTeamOptions([...(current as string[]), val]);
                      }
                      setNewTeam("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(teamOptions ?? settings?.teamOptions ?? []).map(
                    (t: string) => (
                      <div
                        key={t}
                        className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                      >
                        <span>{t}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setTeamOptions(
                              (
                                teamOptions ??
                                settings?.teamOptions ??
                                []
                              ).filter((x: string) => x !== t),
                            )
                          }
                        >
                          ×
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Campuses</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCampus}
                    onChange={(e) => setNewCampus(e.target.value)}
                    placeholder="Add campus (e.g. City Centre)"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const val = newCampus.trim();
                      if (!val) return;
                      const current =
                        campusOptions ?? settings?.campusOptions ?? [];
                      if (!current.includes(val)) {
                        setCampusOptions([...(current as string[]), val]);
                      }
                      setNewCampus("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(campusOptions ?? settings?.campusOptions ?? []).map(
                    (c: string) => (
                      <div
                        key={c}
                        className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                      >
                        <span>{c}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setCampusOptions(
                              (
                                campusOptions ??
                                settings?.campusOptions ??
                                []
                              ).filter((x: string) => x !== c),
                            )
                          }
                        >
                          ×
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Label>Contract families</Label>
                <div className="flex gap-2">
                  <Input
                    value={newFamily}
                    onChange={(e) => setNewFamily(e.target.value)}
                    placeholder="Add family (e.g. Academic Practitioner)"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const val = newFamily.trim();
                      if (!val) return;
                      const current =
                        familyOptions ?? settings?.contractFamilyOptions ?? [];
                      if (!current.includes(val)) {
                        setFamilyOptions([...(current as string[]), val]);
                      }
                      setNewFamily("");
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(familyOptions ?? settings?.contractFamilyOptions ?? []).map(
                    (f: string) => (
                      <div
                        key={f}
                        className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                      >
                        <span>{f}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setFamilyOptions(
                              (
                                familyOptions ??
                                settings?.contractFamilyOptions ??
                                []
                              ).filter((x: string) => x !== f),
                            )
                          }
                        >
                          ×
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>1 FTE contract hours</Label>
                <Input
                  type="number"
                  value={String(
                    fte1ContractHours !== null
                      ? fte1ContractHours
                      : (settings?.baseTotalContractAtFTE1 ?? 550),
                  )}
                  onChange={(e) => setFte1ContractHours(e.target.value)}
                  min={0}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Per-family max teaching rule</Label>
              </div>
              <div className="space-y-2">
                {(familyRules ?? settings?.familyMaxTeachingRules ?? []).map(
                  (
                    r: {
                      family: string;
                      mode: "percent" | "fixed";
                      value: number;
                    },
                    idx: number,
                  ) => (
                    <div
                      key={`${r.family}-${idx}`}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-3">
                        <Label className="text-xs">Family</Label>
                        <Input value={r.family} disabled />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Mode</Label>
                        <select
                          className="w-full h-9 rounded-md border px-2"
                          value={r.mode}
                          onChange={(e) => {
                            const v = e.target.value as "percent" | "fixed";
                            const list = [
                              ...(familyRules ??
                                settings?.familyMaxTeachingRules ??
                                []),
                            ];
                            list[idx] = { ...list[idx], mode: v } as any;
                            setFamilyRules(list);
                          }}
                        >
                          <option value="percent">% of 1 FTE contract</option>
                          <option value="fixed">Fixed hours</option>
                        </select>
                      </div>
                      <div className="col-span-4">
                        <Label className="text-xs">Value</Label>
                        <Input
                          type="number"
                          value={String(r.value ?? 0)}
                          onChange={(e) => {
                            const num = Number(e.target.value || 0);
                            const list = [
                              ...(familyRules ??
                                settings?.familyMaxTeachingRules ??
                                []),
                            ];
                            list[idx] = { ...list[idx], value: num } as any;
                            setFamilyRules(list);
                          }}
                          min={0}
                        />
                      </div>
                      <div className="col-span-2 flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const base =
                              familyRules ??
                              settings?.familyMaxTeachingRules ??
                              [];
                            const list = base.filter(
                              (x: any, i: number) => i !== idx,
                            );
                            setFamilyRules(list);
                          }}
                          className="w-full"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <Label className="text-xs">Family</Label>
                  <select
                    className="w-full h-9 rounded-md border px-2"
                    value={""}
                    onChange={(e) => {
                      const fam = e.target.value;
                      if (!fam) return;
                      const current =
                        familyRules ?? settings?.familyMaxTeachingRules ?? [];
                      if (!current.some((rr: any) => rr.family === fam)) {
                        setFamilyRules([
                          ...(current as any[]),
                          { family: fam, mode: "percent", value: 0 },
                        ]);
                      }
                      e.currentTarget.value = "";
                    }}
                  >
                    <option value="">Select family</option>
                    {(
                      familyOptions ??
                      settings?.contractFamilyOptions ??
                      []
                    ).map((f: string) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Mode</Label>
                  <select
                    className="w-full h-9 rounded-md border px-2"
                    disabled
                  >
                    <option>% of 1 FTE contract</option>
                  </select>
                </div>
                <div className="col-span-4">
                  <Label className="text-xs">Value</Label>
                  <Input
                    type="number"
                    disabled
                    placeholder="Add a family rule above"
                  />
                </div>
                <div className="col-span-2" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={save}>Save</Button>
            </div>
          </CardContent>
        </Card>
      </PermissionGate>
    </StandardizedSidebarLayout>
  );
}
