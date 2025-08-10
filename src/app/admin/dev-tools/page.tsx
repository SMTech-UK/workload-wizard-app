"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function DevToolsPage() {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const reset = useMutation(api.devTools.resetDemoData);
  const seed = useMutation(api.devTools.seedDemoData);
  const switchRole = useMutation(api.devTools.switchMyRoleInDemoOrg);

  const run = async <T,>(label: string, fn: () => Promise<T>) => {
    setBusy(label);
    try {
      const res = await fn();
      toast({
        title: `${label} ok`,
        description: JSON.stringify(res),
        duration: 2500,
      });
    } catch (e: any) {
      toast({
        title: `${label} failed`,
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dev tools</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            disabled={!!busy}
            onClick={() => run("Reset demo", () => reset({}))}
          >
            Reset demo
          </Button>
          <Button
            disabled={!!busy}
            onClick={() => run("Seed demo", () => seed({}))}
          >
            Seed demo
          </Button>
          <div className="flex items-center gap-2">
            <Button
              disabled={!!busy}
              onClick={() =>
                run("Role: Admin", () => switchRole({ roleName: "Admin" }))
              }
            >
              Admin
            </Button>
            <Button
              disabled={!!busy}
              onClick={() =>
                run("Role: Manager", () => switchRole({ roleName: "Manager" }))
              }
            >
              Manager
            </Button>
            <Button
              disabled={!!busy}
              onClick={() =>
                run("Role: Lecturer", () =>
                  switchRole({ roleName: "Lecturer" }),
                )
              }
            >
              Lecturer
            </Button>
            <Button
              disabled={!!busy}
              onClick={() =>
                run("Role: Viewer", () => switchRole({ roleName: "Viewer" }))
              }
            >
              Viewer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
