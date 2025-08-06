'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface GenericDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  itemName?: string;
  itemDetails?: Record<string, string | null | undefined>;
  warningMessage?: string;
  confirmButtonText?: string;
  canDelete?: boolean;
  onError?: (error: string) => void;
  showForceDelete?: boolean;
  forceDelete?: boolean;
  onForceDeleteChange?: (force: boolean) => void;
}

export function GenericDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  itemDetails,
  warningMessage,
  confirmButtonText = 'Delete',
  canDelete = true,
  onError,
  showForceDelete = false,
  forceDelete = false,
  onForceDeleteChange,
}: GenericDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <Card className="w-full max-w-md mx-4">
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
              disabled={isLoading}
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
                  Are you sure you want to delete this {itemName || 'item'}?
                </p>
                
                {itemDetails && Object.keys(itemDetails).length > 0 && (
                  <div className="text-sm text-red-700 space-y-1">
                    {Object.entries(itemDetails).map(([key, value]) => (
                      value && (
                        <p key={key}>
                          <strong>{key}:</strong> {value}
                        </p>
                      )
                    ))}
                  </div>
                )}
                
                {warningMessage && (
                  <p className="text-xs text-red-600 mt-2">
                    {warningMessage}
                  </p>
                )}

                {error && (
                  <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
                    <strong>Error:</strong> {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {showForceDelete && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="force-delete"
                  checked={forceDelete}
                  onCheckedChange={(checked) => onForceDeleteChange?.(checked as boolean)}
                />
                <label htmlFor="force-delete" className="text-sm font-medium text-orange-800 cursor-pointer">
                  Force Delete (Sysadmin Override)
                </label>
              </div>
              <p className="text-xs text-orange-700 mt-1 ml-6">
                This will automatically remove the {itemName || 'item'} from all roles and organisations before deletion.
              </p>
            </div>
          )}



          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isLoading || !canDelete}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {forceDelete ? 'Force Deleting...' : 'Deleting...'}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {forceDelete ? 'Force Delete' : confirmButtonText}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}