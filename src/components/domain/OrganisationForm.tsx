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
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

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
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const createOrganisation = useMutation(api.organisations.create);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const dataBase = {
      name: formData.get("name") as string,
      code: formData.get("code") as string,
    };
    const optional = {
      ...((formData.get("contactEmail") as string)
        ? { contactEmail: formData.get("contactEmail") as string }
        : {}),
      ...((formData.get("contactPhone") as string)
        ? { contactPhone: formData.get("contactPhone") as string }
        : {}),
      ...((formData.get("domain") as string)
        ? { domain: formData.get("domain") as string }
        : {}),
      ...((formData.get("website") as string)
        ? { website: formData.get("website") as string }
        : {}),
    } as Partial<OrganisationFormData>;
    const data: OrganisationFormData = {
      ...dataBase,
      ...optional,
    } as OrganisationFormData;

    try {
      await createOrganisation(data);
      setMessage({
        type: "success",
        text: "Organisation created successfully!",
      });
      (event.target as HTMLFormElement).reset();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to create organisation",
      });
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

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Creating..." : "Create Organisation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
