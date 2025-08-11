"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface LecturerProfile {
  _id: string;
  fullName: string;
  email: string;
  contract: string;
  fte: number;
  maxTeachingHours: number;
  totalContract: number;
  role?: string;
  teamName?: string;
  prefWorkingLocation?: string;
  prefSpecialism?: string;
  prefNotes?: string;
  isActive: boolean;
}

interface EditStaffFormProps {
  profile: LecturerProfile;
  onSave: (formData: Partial<LecturerProfile>) => void;
  onCancel: () => void;
}

export function EditStaffForm({
  profile,
  onSave,
  onCancel,
}: EditStaffFormProps) {
  const { user } = useUser();
  const orgSettings = useQuery(
    (api as any).organisationSettings.getOrganisationSettings,
    user?.id ? { userId: user.id } : ("skip" as any),
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
  const FAMILY_OPTIONS = orgSettings?.contractFamilyOptions ?? [
    "Academic Practitioner",
  ];
  const roleItems = useMemo(() => {
    const r = (profile.role || "").trim();
    if (r && !ROLE_OPTIONS.includes(r)) return [r, ...ROLE_OPTIONS];
    return ROLE_OPTIONS;
  }, [ROLE_OPTIONS, profile.role]);
  const teamItems = useMemo(() => {
    const t = (profile.teamName || "").trim();
    if (t && !TEAM_OPTIONS.includes(t)) return [t, ...TEAM_OPTIONS];
    return TEAM_OPTIONS;
  }, [TEAM_OPTIONS, profile.teamName]);
  const familyItems = useMemo(() => {
    const cf = (profile as any).contractFamily || "";
    if (cf && !FAMILY_OPTIONS.includes(cf)) return [cf, ...FAMILY_OPTIONS];
    return FAMILY_OPTIONS;
  }, [FAMILY_OPTIONS, profile]);
  const [form, setForm] = useState({
    fullName: profile.fullName,
    email: profile.email,
    role: profile.role || "",
    teamName: profile.teamName || "",
    contractFamily: (profile as any).contractFamily || "",
    contract: profile.contract,
    fte: profile.fte.toString(),
    maxTeachingHours: profile.maxTeachingHours.toString(),
    totalContract: profile.totalContract.toString(),
    prefWorkingLocation: profile.prefWorkingLocation || "",
    prefWorkingTime: ((profile as any).prefWorkingTime as any) || "",
    prefSpecialism: profile.prefSpecialism || "",
    prefNotes: profile.prefNotes || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role || "",
      teamName: profile.teamName || "",
      contractFamily: (profile as any).contractFamily || "",
      contract: profile.contract,
      fte: profile.fte.toString(),
      maxTeachingHours: profile.maxTeachingHours.toString(),
      totalContract: profile.totalContract.toString(),
      prefWorkingLocation: profile.prefWorkingLocation || "",
      prefWorkingTime: ((profile as any).prefWorkingTime as any) || "",
      prefSpecialism: profile.prefSpecialism || "",
      prefNotes: profile.prefNotes || "",
    });
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData: Partial<LecturerProfile> & Record<string, any> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        ...(form.role.trim() ? { role: form.role.trim() } : {}),
        ...(form.teamName.trim() ? { teamName: form.teamName.trim() } : {}),
        ...((form as any).contractFamily
          ? { contractFamily: (form as any).contractFamily }
          : {}),
        contract: form.contract,
        fte: Number(form.fte),
        maxTeachingHours: Number(form.maxTeachingHours),
        totalContract: Number(form.totalContract),
        ...(form.prefWorkingLocation.trim()
          ? { prefWorkingLocation: form.prefWorkingLocation.trim() }
          : {}),
        ...((form as any).prefWorkingTime
          ? { prefWorkingTime: (form as any).prefWorkingTime }
          : {}),
        ...(form.prefSpecialism.trim()
          ? { prefSpecialism: form.prefSpecialism.trim() }
          : {}),
        ...(form.prefNotes.trim() ? { prefNotes: form.prefNotes.trim() } : {}),
      };

      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = Boolean(form.fullName.trim() && form.email.trim());

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lecturer Profile</DialogTitle>
          <DialogDescription>
            Update the details for {profile.fullName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleItems.map((r: string) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamName">Team</Label>
                <Select
                  value={form.teamName}
                  onValueChange={(v) => setForm((f) => ({ ...f, teamName: v }))}
                >
                  <SelectTrigger id="teamName" className="w-full">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamItems.map((t: string) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contract">Contract Type</Label>
                <Select
                  value={form.contract}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, contract: value }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FT">Full Time</SelectItem>
                    <SelectItem value="PT">Part Time</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractFamily">Contract Family</Label>
                <Select
                  value={
                    (form as any).contractFamily ||
                    (profile as any).contractFamily ||
                    ""
                  }
                  onValueChange={(v) =>
                    setForm((f) => ({ ...(f as any), contractFamily: v }))
                  }
                >
                  <SelectTrigger id="contractFamily" className="w-full">
                    <SelectValue placeholder="Select family" />
                  </SelectTrigger>
                  <SelectContent>
                    {familyItems.map((t: string) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fte">FTE</Label>
                <Input
                  id="fte"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={form.fte}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fte: e.target.value }))
                  }
                  placeholder="e.g., 0.8"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTeachingHours">Max Teaching Hours</Label>
                <Input
                  id="maxTeachingHours"
                  type="number"
                  step="1"
                  min="0"
                  value={form.maxTeachingHours}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxTeachingHours: e.target.value }))
                  }
                  placeholder="e.g., 400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalContract">Total Contract Hours</Label>
                <Input
                  id="totalContract"
                  type="number"
                  step="1"
                  min="0"
                  value={form.totalContract}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, totalContract: e.target.value }))
                  }
                  placeholder="e.g., 550"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prefWorkingLocation">
                  Preferred Working Location
                </Label>
                <Input
                  id="prefWorkingLocation"
                  value={form.prefWorkingLocation}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      prefWorkingLocation: e.target.value,
                    }))
                  }
                  placeholder="e.g., Main Campus, Remote"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prefSpecialism">Specialism</Label>
                <Input
                  id="prefSpecialism"
                  value={form.prefSpecialism}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, prefSpecialism: e.target.value }))
                  }
                  placeholder="e.g., Software Engineering, AI"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prefWorkingTime">Preferred Working Time</Label>
                <Select
                  value={(form as any).prefWorkingTime || ""}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...(f as any), prefWorkingTime: v }))
                  }
                >
                  <SelectTrigger id="prefWorkingTime" className="w-full">
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="am">AM</SelectItem>
                    <SelectItem value="pm">PM</SelectItem>
                    <SelectItem value="all_day">All day</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prefNotes">Notes</Label>
                <Textarea
                  id="prefNotes"
                  value={form.prefNotes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, prefNotes: e.target.value }))
                  }
                  placeholder="Additional notes or preferences..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
