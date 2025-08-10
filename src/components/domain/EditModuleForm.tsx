"use client";

import { useState } from "react";
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

interface Module {
  _id: string;
  code: string;
  name: string;
  credits?: number;
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
  const codeAvailability = useQuery(
    api.modules.isCodeAvailable as any,
    {
      code: form.code,
      excludeId: module._id as any,
    } as any,
  ) as { available: boolean } | undefined;
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    code: module.code,
    name: module.name,
    credits: module.credits?.toString() || "",
  });

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
