"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Shield } from "lucide-react";

interface DeactivateConfirmationModalProps {
  profileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeactivateConfirmationModal({
  profileName,
  onConfirm,
  onCancel,
}: DeactivateConfirmationModalProps) {
  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            <DialogTitle>Deactivate Lecturer Profile</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to deactivate the profile for{" "}
            <strong>{profileName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">
              What happens when you deactivate:
            </p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>The lecturer will no longer appear in active staff lists</li>
              <li>They cannot be assigned to new modules or groups</li>
              <li>Existing allocations remain unchanged</li>
              <li>The profile can be reactivated at any time</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Deactivate Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
