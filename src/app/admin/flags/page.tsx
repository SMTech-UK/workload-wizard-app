"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery as useConvexQuery } from "convex/react";
import { api as convexApi } from "@/../convex/_generated/api";
import { recordAudit } from "@/lib/audit";
import { useToast } from "@/hooks/use-toast";
import { getAllFeatureFlagConfigs, FeatureFlags } from "@/lib/feature-flags";
import { Switch as UISwitch } from "@/components/ui/switch";

type FlagData = {
  flagName: string;
  userOverrides: Array<{
    userId: string;
    enabled: boolean;
    user: { name: string; email: string } | null;
  }>;
  totalOverrides: number;
  enabledOverrides: number;
  disabledOverrides: number;
};

import { FlagsManageGate } from "@/components/common/PermissionGate";

export default function FlagsAdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  // Get feature flags data from Convex
  const flagsData = useQuery(api.featureFlags.getFeatureFlagsAdmin);
  const setOrgOverride = (useQuery as any) ? null : null; // noop to appease import order
  const organisations = useConvexQuery(convexApi.organisations.list);

  // Get feature flag configs
  const flagConfigs = getAllFeatureFlagConfigs();

  useEffect(() => {
    if (!isLoaded) return;
    const roles = (user?.publicMetadata?.roles as string[] | undefined) ?? [];
    const role = (user?.publicMetadata?.role as string | undefined) ?? "";
    const isSys =
      roles.includes("sysadmin") ||
      roles.includes("developer") ||
      role === "sysadmin" ||
      role === "developer";
    if (!isSys) router.replace("/unauthorised");
  }, [isLoaded, user, router]);

  async function toggleFlag(name: string, enabled: boolean) {
    setBusy(name);
    try {
      const res = await fetch("/api/admin/flags/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, enabled }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      toast({
        title: "Flag updated",
        description: `${name} ${enabled ? "enabled" : "disabled"}`,
        variant: "success",
      });

      if (user?.id) {
        try {
          await recordAudit({
            action: "flags.updated",
            actorId: user.id,
            success: true,
            entityType: "flag",
            entityId: name,
            meta: { enabled },
          });
        } catch (auditError) {
          // Non-blocking: surface as info if audit fails
          toast({
            title: "Audit log failed",
            description:
              auditError instanceof Error
                ? auditError.message
                : "Could not record audit event",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Failed to update flag",
        description:
          err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  function getEffectiveValue(flagName: string): boolean {
    const flagData = flagsData?.flags.find((f) => f.flagName === flagName);
    if (!flagData || flagData.totalOverrides === 0) {
      return flagConfigs[flagName as FeatureFlags]?.defaultValue ?? false;
    }

    // If there are overrides, show the majority state
    return flagData.enabledOverrides > flagData.disabledOverrides;
  }

  async function setOrgFlag(
    flagName: string,
    organisationId: string,
    enabled: boolean,
  ) {
    if (!user?.id) return;
    setBusy(`${flagName}:org:${organisationId}`);
    try {
      const res = await fetch("/api/admin/flags/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: flagName, enabled }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      // Use Convex directly for org override since the route handles user overrides
      const { ConvexHttpClient } = await import("convex/browser");
      const { api } = await import("@/../convex/_generated/api");
      const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
      await client.mutation(api.featureFlags.setOrganisationOverride, {
        organisationId: organisationId as any,
        flagName,
        enabled,
        actorUserId: user.id,
      });
      toast({
        title: "Org override updated",
        description: `${flagName} for org ${organisationId}: ${enabled ? "enabled" : "disabled"}`,
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Failed to update org override",
        description: e instanceof Error ? e.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  }

  function getFlagDescription(flagName: string): string {
    return (
      flagConfigs[flagName as FeatureFlags]?.description ??
      "No description available"
    );
  }

  if (!isLoaded || !user) {
    return <div className="p-6">Loading...</div>;
  }

  // Show loading state while fetching data
  if (!flagsData) {
    return (
      <div className="p-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Feature Flags Admin</h1>
            <p className="text-muted-foreground">
              Manage feature flags and user overrides
            </p>
          </div>
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              Loading feature flags...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FlagsManageGate>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags Admin</h1>
          <p className="text-muted-foreground">
            Manage feature flags and user overrides
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{flagsData.totalFlags}</div>
              <div className="text-sm text-muted-foreground">Active Flags</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {flagsData.totalOverrides}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Overrides
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {Object.keys(flagConfigs).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Configured Flags
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Flags List */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(flagConfigs).map(([flagName, config]) => {
              const flagData = flagsData.flags.find(
                (f) => f.flagName === flagName,
              );
              const effectiveValue = getEffectiveValue(flagName);
              const hasOverrides = flagData && flagData.totalOverrides > 0;
              const orgOverrides = (flagData as any)?.orgOverrides || [];
              const settings = (flagData as any)?.settings || null;

              return (
                <div key={flagName} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-sm font-semibold">
                          {flagName}
                        </div>
                        <Badge
                          variant={effectiveValue ? "default" : "secondary"}
                        >
                          {effectiveValue ? "Enabled" : "Disabled"}
                        </Badge>
                        {hasOverrides && (
                          <Badge variant="outline">
                            {flagData!.totalOverrides} override
                            {flagData!.totalOverrides !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {config.rolloutPercentage !== undefined &&
                          config.rolloutPercentage > 0 && (
                            <Badge variant="secondary">
                              {config.rolloutPercentage}% rollout
                            </Badge>
                          )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {config.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Default: {config.defaultValue ? "Enabled" : "Disabled"}
                        {config.rolloutPercentage !== undefined && (
                          <span className="ml-2">
                            • Rollout: {config.rolloutPercentage}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={effectiveValue}
                        onCheckedChange={(v) =>
                          toggleFlag(flagName, Boolean(v))
                        }
                        disabled={busy === flagName}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleFlag(flagName, !effectiveValue)}
                        disabled={busy === flagName}
                      >
                        {busy === flagName
                          ? "..."
                          : effectiveValue
                            ? "Disable"
                            : "Enable"}
                      </Button>
                    </div>
                  </div>

                  {/* Show user overrides if they exist */}
                  {hasOverrides && flagData && (
                    <div className="ml-4 space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        User Overrides:
                      </div>
                      <div className="space-y-1">
                        {flagData.userOverrides.map((override, idx) => (
                          <UserOverrideRow
                            key={`${flagName}-${override.userId}-${idx}`}
                            flagName={flagName}
                            override={override}
                            defaultValue={config.defaultValue}
                            busy={busy}
                            setBusy={setBusy}
                            onToggled={async (newVal: boolean) => {
                              setBusy(`${flagName}:${override.userId}`);
                              try {
                                const res = await fetch(
                                  "/api/admin/flags/toggle",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      name: flagName,
                                      enabled: newVal,
                                      userId: override.userId,
                                    }),
                                  },
                                );
                                if (!res.ok) throw new Error("Toggle failed");
                                toast({
                                  title: "Override updated",
                                  description: `${override.user?.email || override.userId}: ${newVal ? "enabled" : "disabled"}`,
                                  variant: "success",
                                });
                              } catch (e) {
                                toast({
                                  title: "Failed to update override",
                                  description:
                                    e instanceof Error
                                      ? e.message
                                      : "Unexpected error",
                                  variant: "destructive",
                                });
                              } finally {
                                setBusy(null);
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Org overrides */}
                  {orgOverrides.length > 0 && (
                    <div className="ml-4 space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Organisation Overrides:
                      </div>
                      <div className="space-y-1">
                        {orgOverrides.map((ovr: any, idx: number) => {
                          const orgName = organisations?.find(
                            (o: any) =>
                              String(o._id) === String(ovr.organisationId),
                          )?.name;
                          return (
                            <div
                              key={`${flagName}-org-${idx}`}
                              className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono">
                                  {orgName
                                    ? `${orgName} (${ovr.organisationId})`
                                    : ovr.organisationId}
                                </span>
                                <Badge
                                  variant={
                                    ovr.enabled ? "default" : "secondary"
                                  }
                                >
                                  {ovr.enabled ? "Enabled" : "Disabled"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={ovr.enabled}
                                  onCheckedChange={(v) =>
                                    setOrgFlag(
                                      flagName,
                                      ovr.organisationId,
                                      Boolean(v),
                                    )
                                  }
                                  disabled={
                                    busy ===
                                    `${flagName}:org:${ovr.organisationId}`
                                  }
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add org override row */}
                  {organisations && organisations.length > 0 && (
                    <div className="ml-4 space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Add organisation override:
                      </div>
                      <AddOrgOverrideRow
                        flagName={flagName}
                        organisations={organisations}
                        busy={busy}
                        setBusy={setBusy}
                        onSave={async (orgId: string, enabled: boolean) => {
                          await setOrgFlag(flagName, orgId, enabled);
                        }}
                      />
                    </div>
                  )}

                  {/* Settings controls */}
                  <div className="ml-4 space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Settings:
                    </div>
                    <FlagSettingsRow
                      flagName={flagName}
                      defaultValue={config.defaultValue}
                      existingRollout={settings?.rolloutPercentage ?? undefined}
                      existingDefaultOverride={
                        settings?.defaultValueOverride ?? undefined
                      }
                      busy={busy}
                      setBusy={setBusy}
                      onSave={async (rollout, defOverride) => {
                        if (!user?.id) return;
                        setBusy(`${flagName}:settings`);
                        try {
                          const { ConvexHttpClient } = await import(
                            "convex/browser"
                          );
                          const { api } = await import(
                            "@/../convex/_generated/api"
                          );
                          const client = new ConvexHttpClient(
                            process.env.NEXT_PUBLIC_CONVEX_URL!,
                          );
                          await client.mutation(
                            api.featureFlags.setFlagSettings,
                            {
                              flagName,
                              rolloutPercentage:
                                typeof rollout === "number"
                                  ? rollout
                                  : undefined,
                              defaultValueOverride:
                                typeof defOverride === "boolean"
                                  ? defOverride
                                  : undefined,
                              actorUserId: user.id,
                            },
                          );
                          toast({
                            title: "Settings saved",
                            variant: "success",
                          });
                        } catch (e) {
                          toast({
                            title: "Failed to save settings",
                            description:
                              e instanceof Error
                                ? e.message
                                : "Unexpected error",
                            variant: "destructive",
                          });
                        } finally {
                          setBusy(null);
                        }
                      }}
                    />
                  </div>

                  {/* Show when no overrides exist */}
                  {!hasOverrides && (
                    <div className="ml-4">
                      <div className="text-sm text-muted-foreground">
                        No user overrides • Using default value:{" "}
                        {config.defaultValue ? "Enabled" : "Disabled"}
                      </div>
                    </div>
                  )}

                  <Separator />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Toggle switches to enable/disable flags for your user account
            </p>
            <p>
              • Flags with overrides show the effective value based on user
              preferences
            </p>
            <p>• Rollout percentages indicate gradual feature releases</p>
            <p>
              • User overrides take precedence over default values and rollouts
            </p>
          </CardContent>
        </Card>
      </div>
    </FlagsManageGate>
  );
}

function UserOverrideRow({
  flagName,
  override,
  defaultValue,
  busy,
  setBusy,
  onToggled,
}: {
  flagName: string;
  override: {
    userId: string;
    enabled: boolean;
    user: { name: string; email: string } | null;
  };
  defaultValue: boolean;
  busy: string | null;
  setBusy: (v: string | null) => void;
  onToggled: (newVal: boolean) => Promise<void>;
}) {
  const key = `${flagName}:${override.userId}`;
  return (
    <div className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
      <div>
        <span className="font-medium">
          {override.user?.name || override.user?.email || override.userId}
        </span>
        {override.user?.email && (
          <span className="text-muted-foreground ml-2">
            ({override.user.email})
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <UISwitch
          checked={override.enabled}
          onCheckedChange={(v) => onToggled(Boolean(v))}
          disabled={busy === key}
        />
        <Badge variant={override.enabled ? "default" : "secondary"}>
          {override.enabled ? "Enabled" : "Disabled"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          vs default {defaultValue ? "enabled" : "disabled"}
        </span>
      </div>
    </div>
  );
}

function FlagSettingsRow({
  flagName,
  defaultValue,
  existingRollout,
  existingDefaultOverride,
  busy,
  setBusy,
  onSave,
}: {
  flagName: string;
  defaultValue: boolean;
  existingRollout?: number;
  existingDefaultOverride?: boolean;
  busy: string | null;
  setBusy: (v: string | null) => void;
  onSave: (rollout?: number, defaultOverride?: boolean) => Promise<void>;
}) {
  const [rollout, setRollout] = useState<string>(
    typeof existingRollout === "number" ? String(existingRollout) : "",
  );
  const [defaultOverride, setDefaultOverride] = useState<
    "inherit" | "true" | "false"
  >(
    typeof existingDefaultOverride === "boolean"
      ? existingDefaultOverride
        ? "true"
        : "false"
      : "inherit",
  );

  return (
    <div className="flex items-center gap-3 text-sm bg-muted/30 p-2 rounded">
      <div className="flex items-center gap-2">
        <Label htmlFor={`${flagName}-rollout`} className="text-xs">
          Rollout %
        </Label>
        <Input
          id={`${flagName}-rollout`}
          className="w-20 h-8"
          type="number"
          min={0}
          max={100}
          value={rollout}
          onChange={(e) => setRollout(e.target.value)}
          placeholder="—"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor={`${flagName}-default`} className="text-xs">
          Default
        </Label>
        <select
          id={`${flagName}-default`}
          className="h-8 border rounded px-2"
          value={defaultOverride}
          onChange={(e) => setDefaultOverride(e.target.value as any)}
        >
          <option value="inherit">Inherit</option>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          const r =
            rollout.trim() === ""
              ? undefined
              : Math.max(0, Math.min(100, Number(rollout)));
          const d =
            defaultOverride === "inherit"
              ? undefined
              : defaultOverride === "true";
          await onSave(r, d);
        }}
        disabled={busy === `${flagName}:settings`}
      >
        Save
      </Button>
    </div>
  );
}

function AddOrgOverrideRow({
  flagName,
  organisations,
  busy,
  setBusy,
  onSave,
}: {
  flagName: string;
  organisations: Array<{ _id: string; name: string }>;
  busy: string | null;
  setBusy: (v: string | null) => void;
  onSave: (orgId: string, enabled: boolean) => Promise<void>;
}) {
  const [orgId, setOrgId] = useState<string>("");
  const [enabled, setEnabled] = useState<boolean>(true);
  return (
    <div className="flex items-center gap-3 text-sm bg-muted/30 p-2 rounded">
      <select
        className="h-8 border rounded px-2"
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
      >
        <option value="">Select organisation…</option>
        {organisations.map((o) => (
          <option key={String(o._id)} value={String(o._id)}>
            {o.name} ({String(o._id)})
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <Label className="text-xs">Enabled</Label>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => setEnabled(Boolean(v))}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          if (!orgId) return;
          await onSave(orgId, enabled);
          setOrgId("");
        }}
        disabled={!orgId || busy === `${flagName}:org:add`}
      >
        Add
      </Button>
    </div>
  );
}
