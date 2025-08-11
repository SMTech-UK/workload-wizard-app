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

type GenericDeleteModalProps =
  | {
      entityType: string;
      entityName: string;
      entityCode?: string;
      onConfirm: () => Promise<void>;
      onCancel: () => void;
      isDeleting?: boolean;
      // Optional controlled props ignored in this mode
      open?: never;
      onOpenChange?: never;
      title?: never;
      description?: never;
      confirmText?: never;
    }
  | {
      // Controlled variant (no entity metadata required)
      open: boolean;
      onOpenChange: (open: boolean) => void;
      onConfirm: () => Promise<void> | void;
      title?: string;
      description?: string;
      confirmText?: string;
      isDeleting?: boolean;
      // Optional legacy props ignored in this mode
      entityType?: string;
      entityName?: string;
      entityCode?: string;
      onCancel?: never;
    };

export function GenericDeleteModal(props: GenericDeleteModalProps) {
  const isControlled = typeof (props as any).open === "boolean";
  const isOpen = isControlled ? (props as any).open : true;

  const { isDeleting = false } = props as any;

  const onClose = () => {
    if (isControlled) (props as any).onOpenChange?.(false);
    else (props as any).onCancel?.();
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await (props as any).onConfirm?.();
    } finally {
      setIsLoading(false);
      if (isControlled) (props as any).onOpenChange?.(false);
    }
  };

  const entityType: string | undefined = (props as any).entityType;
  const entityName: string | undefined = (props as any).entityName;
  const entityCode: string | undefined = (props as any).entityCode;

  const title =
    (props as any).title ??
    (entityType ? `Delete ${entityType}` : "Are you sure?");
  const description =
    (props as any).description ??
    (entityType
      ? "This action cannot be undone"
      : "This action cannot be undone.");
  const confirmText =
    (props as any).confirmText ??
    (entityType ? `Delete ${entityType}` : "Confirm");

  const displayName =
    entityCode && entityName
      ? `${entityCode} — ${entityName}`
      : (entityName ?? "");

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
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription className="text-sm">
                  {description}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
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
                  Are you sure you want to proceed?
                </p>
                <div className="text-sm text-red-700 space-y-1">
                  <p>
                    {displayName ? (
                      <>
                        <strong>Name:</strong> {displayName}
                      </>
                    ) : null}
                  </p>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  This change may be permanent.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
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
                  Working...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {confirmText}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
