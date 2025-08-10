"use client";

import { useState, useEffect } from "react";
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
  const [form, setForm] = useState({
    fullName: profile.fullName,
    email: profile.email,
    role: profile.role || "",
    teamName: profile.teamName || "",
    contract: profile.contract,
    fte: profile.fte.toString(),
    maxTeachingHours: profile.maxTeachingHours.toString(),
    totalContract: profile.totalContract.toString(),
    prefWorkingLocation: profile.prefWorkingLocation || "",
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
      contract: profile.contract,
      fte: profile.fte.toString(),
      maxTeachingHours: profile.maxTeachingHours.toString(),
      totalContract: profile.totalContract.toString(),
      prefWorkingLocation: profile.prefWorkingLocation || "",
      prefSpecialism: profile.prefSpecialism || "",
      prefNotes: profile.prefNotes || "",
    });
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        role: form.role.trim() || undefined,
        teamName: form.teamName.trim() || undefined,
        contract: form.contract,
        fte: Number(form.fte),
        maxTeachingHours: Number(form.maxTeachingHours),
        totalContract: Number(form.totalContract),
        prefWorkingLocation: form.prefWorkingLocation.trim() || undefined,
        prefSpecialism: form.prefSpecialism.trim() || undefined,
        prefNotes: form.prefNotes.trim() || undefined,
      };

      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = form.fullName.trim() && form.email.trim();

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
                <Input
                  id="role"
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                  placeholder="e.g., Lecturer, Senior Lecturer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamName">Team</Label>
                <Input
                  id="teamName"
                  value={form.teamName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, teamName: e.target.value }))
                  }
                  placeholder="e.g., Computer Science"
                />
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
                  <SelectTrigger>
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
