"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Module {
  _id: string;
  code: string;
  name: string;
  credits?: number;
  leaderProfileId?: string;
  level?: number;
  teachingHours?: number;
  markingHours?: number;
}

interface LecturerProfileOption {
  _id: string;
  fullName: string;
}

interface EditModuleFormProps {
  module: Module;
  onClose: () => void;
  onModuleUpdated: () => void;
}

export function EditModuleForm({
  module,
  onClose,
  onModuleUpdated,
}: EditModuleFormProps) {
  const { toast } = useToast();
  const updateModule = useMutation(api.modules.update);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    code: module.code,
    name: module.name,
    credits: module.credits?.toString() || "",
    leaderProfileId: module.leaderProfileId || "",
    level: typeof module.level === "number" ? String(module.level) : "",
    teachingHours:
      typeof module.teachingHours === "number"
        ? String(module.teachingHours)
        : "",
    markingHours:
      typeof module.markingHours === "number"
        ? String(module.markingHours)
        : "",
    campuses: Array.isArray((module as any).campuses)
      ? ((module as any).campuses as string[]).join(", ")
      : "",
  });
  const [hoursTouched, setHoursTouched] = useState(false);
  const codeAvailability = useQuery(
    api.modules.isCodeAvailable as any,
    {
      code: form.code,
      excludeId: module._id as any,
    } as any,
  ) as { available: boolean } | undefined;
  const lecturers = (useQuery((api as any).staff.listForActor) ||
    []) as LecturerProfileOption[];
  const orgSettings = useQuery(
    (api as any).organisationSettings.getForActor,
  ) as
    | {
        moduleHoursByCredits?: Array<{
          credits: number;
          teaching: number;
          marking: number;
        }>;
      }
    | undefined;

  // Auto-fill hours from org settings mapping when credits changes, unless user has touched
  useEffect(() => {
    if (!orgSettings?.moduleHoursByCredits) return;
    const creditsNum = Number(form.credits);
    if (!creditsNum || Number.isNaN(creditsNum)) return;
    if (hoursTouched) return;
    const match = orgSettings.moduleHoursByCredits.find(
      (m) => m.credits === creditsNum,
    );
    if (!match) return;
    setForm((prev) => ({
      ...prev,
      teachingHours: prev.teachingHours || String(match.teaching),
      markingHours: prev.markingHours || String(match.marking),
    }));
  }, [form.credits, hoursTouched, orgSettings]);

  const canSubmit =
    form.code.trim().length > 0 &&
    form.name.trim().length > 0 &&
    (codeAvailability ? codeAvailability.available : true);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      await updateModule({
        id: module._id as any,
        code: form.code.trim(),
        name: form.name.trim(),
        ...(form.credits.trim() ? { credits: Number(form.credits) } : {}),
        ...(form.leaderProfileId
          ? { leaderProfileId: form.leaderProfileId as any }
          : {}),
        ...(form.level.trim() ? { level: Number(form.level) } : {}),
        ...(form.teachingHours.trim()
          ? { teachingHours: Number(form.teachingHours) }
          : {}),
        ...(form.markingHours.trim()
          ? { markingHours: Number(form.markingHours) }
          : {}),
        ...(form.campuses.trim()
          ? {
              campuses: form.campuses
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : {}),
      });

      toast({
        title: "Module updated",
        description: `${form.code.trim()} has been updated successfully.`,
        variant: "success",
      });

      onModuleUpdated();
      onClose();
    } catch (error) {
      toast({
        title: "Failed to update module",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
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
              <CardTitle>Edit Module</CardTitle>
              <CardDescription>Update module details</CardDescription>
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
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value }))
                }
                placeholder="MOD101"
                required
              />
              {form.code.trim() &&
                codeAvailability &&
                !codeAvailability.available && (
                  <p className="text-xs text-destructive">
                    Module code already exists in your organisation
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Introduction to Something"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leader">Module leader</Label>
              <Select
                value={form.leaderProfileId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, leaderProfileId: v }))
                }
              >
                <SelectTrigger id="leader">
                  <SelectValue placeholder="Select leader (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {lecturers?.map((l) => (
                    <SelectItem key={l._id} value={String(l._id)}>
                      {l.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">Level</Label>
              <Select
                value={form.level}
                onValueChange={(v) => setForm((f) => ({ ...f, level: v }))}
              >
                <SelectTrigger id="level">
                  <SelectValue placeholder="Select level (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7].map((lvl) => (
                    <SelectItem key={lvl} value={String(lvl)}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                inputMode="numeric"
                value={form.credits}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credits: e.target.value }))
                }
                placeholder="20"
              />
            </div>

            {/* Campuses chip multi-select */}
            <div className="space-y-2">
              <Label>Campuses</Label>
              <div className="flex flex-wrap gap-2">
                {(form.campuses || "")
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        const list = (form.campuses || "")
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .filter((x) => x !== c);
                        setForm((f) => ({ ...f, campuses: list.join(", ") }));
                      }}
                      className="px-2 py-1 rounded-full text-xs bg-muted hover:bg-muted/70"
                      title="Click to remove"
                    >
                      {c} ×
                    </button>
                  ))}
              </div>
              <div className="flex gap-2">
                <select
                  className="h-9 rounded-md border px-2 bg-background"
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const list = (form.campuses || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    if (!list.includes(val)) list.push(val);
                    setForm((f) => ({ ...f, campuses: list.join(", ") }));
                    e.currentTarget.value = "";
                  }}
                >
                  <option value="">Add campus…</option>
                  {(orgSettings as any)?.campusOptions?.map((c: string) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teachingHours">Teaching hours</Label>
                <Input
                  id="teachingHours"
                  type="number"
                  inputMode="numeric"
                  value={form.teachingHours}
                  onChange={(e) => {
                    setHoursTouched(true);
                    setForm((f) => ({ ...f, teachingHours: e.target.value }));
                  }}
                  placeholder="48"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="markingHours">Marking/prep hours</Label>
                <Input
                  id="markingHours"
                  type="number"
                  inputMode="numeric"
                  value={form.markingHours}
                  onChange={(e) => {
                    setHoursTouched(true);
                    setForm((f) => ({ ...f, markingHours: e.target.value }));
                  }}
                  placeholder="48"
                />
              </div>
            </div>

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
              <Button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="flex-1"
              >
                {isLoading ? "Updating..." : "Update Module"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
