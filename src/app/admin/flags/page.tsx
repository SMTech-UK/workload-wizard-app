"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { recordAudit } from "@/lib/audit";

type FlagRow = {
  name: string;
  description: string;
  enabled: boolean;
};

export default function FlagsAdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [flags, setFlags] = useState<FlagRow[]>([
    {
      name: "NEW_ALLOCATION_UI",
      description: "Experimental allocation UI",
      enabled: false,
    },
  ]);
  const [busy, setBusy] = useState<string | null>(null);

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
      setFlags((prev) =>
        prev.map((f) => (f.name === name ? { ...f, enabled } : f)),
      );
      if (user?.id) {
        await recordAudit({
          action: "flags.updated",
          actorId: user.id,
          success: true,
          entityType: "flag",
          entityId: name,
          meta: { enabled },
        });
      }
    } catch {
      // noop
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {flags.map((f) => (
            <div
              key={f.name}
              className="flex items-center justify-between border rounded p-3"
            >
              <div>
                <div className="font-mono text-sm">{f.name}</div>
                <div className="text-sm text-muted-foreground">
                  {f.description}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={f.enabled}
                  onCheckedChange={(v) => toggleFlag(f.name, Boolean(v))}
                  disabled={busy === f.name}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFlag(f.name, !f.enabled)}
                  disabled={busy === f.name}
                >
                  {f.enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
