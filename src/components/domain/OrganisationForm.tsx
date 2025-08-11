"use client";

import { useState } from "react";
import { z } from "zod";
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
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { withToast, isZodError, formatZodError } from "@/lib/utils";
import { track } from "@/lib/analytics";

interface OrganisationFormData {
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  domain?: string;
  website?: string;
}

export function OrganisationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createOrganisation = useMutation(api.organisations.create);

  const Schema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    code: z
      .string()
      .trim()
      .min(1, "Code is required")
      .max(10, "Code max 10 chars")
      .regex(/^[A-Za-z0-9_-]+$/, "Code can use letters, numbers, _ or -"),
    contactEmail: z
      .string()
      .email("Invalid email")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    contactPhone: z.string().optional(),
    domain: z.string().optional(),
    website: z
      .string()
      .url("Invalid URL")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const dataBase = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
    };
    const optional: Partial<OrganisationFormData> = {};
    const ce = formData.get("contactEmail") as string | null;
    const cp = formData.get("contactPhone") as string | null;
    const dm = formData.get("domain") as string | null;
    const ws = formData.get("website") as string | null;
    if (ce) optional.contactEmail = ce;
    if (cp) optional.contactPhone = cp;
    if (dm) optional.domain = dm;
    if (ws) optional.website = ws;
    let data: OrganisationFormData | null = null;
    try {
      const parsed = Schema.parse({ ...dataBase, ...optional });
      data = {
        name: parsed.name,
        code: parsed.code,
        ...(parsed.contactEmail ? { contactEmail: parsed.contactEmail } : {}),
        ...(parsed.contactPhone ? { contactPhone: parsed.contactPhone } : {}),
        ...(parsed.domain ? { domain: parsed.domain } : {}),
        ...(parsed.website ? { website: parsed.website } : {}),
      } satisfies OrganisationFormData;
    } catch (err) {
      toast({
        title: "Validation error",
        description: isZodError(err)
          ? formatZodError(err)
          : "Please check the form",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      await withToast(
        () => createOrganisation(data as OrganisationFormData),
        {
          success: {
            title: "Organisation created",
            description: "Organisation created successfully!",
          },
          error: { title: "Failed to create organisation" },
        },
        toast,
      );
      if (data) {
        track("organisation.created", { code: data.code, name: data.name });
      }
      (event.target as HTMLFormElement).reset();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Organisation</CardTitle>
        <CardDescription>Add a new organisation to the system</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organisation Name *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="University of Cambridge"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Organisation Code *</Label>
            <Input id="code" name="code" required placeholder="UOC" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              placeholder="admin@university.ac.uk"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Contact Phone</Label>
            <Input
              id="contactPhone"
              name="contactPhone"
              placeholder="+44 1223 763 000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input id="domain" name="domain" placeholder="university.ac.uk" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              placeholder="https://university.ac.uk"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Creating..." : "Create Organisation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
