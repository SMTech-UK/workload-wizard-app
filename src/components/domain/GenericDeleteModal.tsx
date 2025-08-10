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
import { AlertTriangle, Trash2, X } from "lucide-react";

interface GenericDeleteModalProps {
  entityType: string;
  entityName: string;
  entityCode?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function GenericDeleteModal({
  entityType,
  entityName,
  entityCode,
  onConfirm,
  onCancel,
  isDeleting = false,
}: GenericDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  const displayName = entityCode ? `${entityCode} — ${entityName}` : entityName;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.06)" }}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Delete {entityType}</CardTitle>
                <CardDescription className="text-sm">
                  This action cannot be undone
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isLoading || isDeleting}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Trash2 className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-800">
                  Are you sure you want to delete this{" "}
                  {entityType.toLowerCase()}?
                </p>
                <div className="text-sm text-red-700 space-y-1">
                  <p>
                    <strong>Name:</strong> {displayName}
                  </p>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  This will permanently remove the {entityType.toLowerCase()}{" "}
                  from the system. All associated data will be lost.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading || isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading || isDeleting}
              className="flex-1"
            >
              {isLoading || isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {entityType}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
