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
import { syncUsersFromClerk, getSyncStatus } from "@/lib/actions/syncUsers";
import { RefreshCw, CheckCircle, AlertCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SyncStatus {
  clerkUserCount: number;
  convexUserCount: number;
  missingInConvex: number;
  extraInConvex: number;
  isSynced: boolean;
}

interface SyncResult {
  totalUsers: number;
  message: string;
  results?: Array<{ status: string }>;
}

export function UserSyncButton() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    try {
      const result = await syncUsersFromClerk();
      setLastSyncResult(result);
      await checkSyncStatus();
    } catch (error) {
      console.error("Sync failed:", error);
      toast({
        title: "Sync failed",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const status = await getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error("Failed to get sync status:", error);
    }
  };

  const handleCheckStatus = async () => {
    setIsLoading(true);
    await checkSyncStatus();
    setIsLoading(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          User Synchronization
        </CardTitle>
        <CardDescription>
          Sync users between Clerk and Convex databases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sync Status Display */}
          {syncStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {syncStatus.clerkUserCount}
                </div>
                <div className="text-sm text-gray-600">Clerk Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {syncStatus.convexUserCount}
                </div>
                <div className="text-sm text-gray-600">Convex Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {syncStatus.missingInConvex}
                </div>
                <div className="text-sm text-gray-600">Missing in Convex</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {syncStatus.extraInConvex}
                </div>
                <div className="text-sm text-gray-600">Extra in Convex</div>
              </div>
            </div>
          )}

          {/* Sync Status Indicator */}
          {syncStatus && (
            <div className="flex items-center justify-center p-3 rounded-lg border">
              {syncStatus.isSynced ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">
                    Databases are synchronized
                  </span>
                </div>
              ) : (
                <div className="flex items-center text-orange-600">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">Databases are out of sync</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSync}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Users
            </Button>
            <Button
              onClick={handleCheckStatus}
              disabled={isLoading}
              variant="outline"
            >
              Check Status
            </Button>
          </div>

          {/* Last Sync Result */}
          {lastSyncResult && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">
                Last Sync Result
              </h4>
              <div className="text-sm text-blue-800">
                <p>Total users processed: {lastSyncResult.totalUsers}</p>
                <p>Message: {lastSyncResult.message}</p>
                {lastSyncResult.results && (
                  <div className="mt-2">
                    <p>
                      Created:{" "}
                      {
                        lastSyncResult.results.filter(
                          (r) => r.status === "created",
                        ).length
                      }
                    </p>
                    <p>
                      Skipped:{" "}
                      {
                        lastSyncResult.results.filter(
                          (r) => r.status === "skipped",
                        ).length
                      }
                    </p>
                    <p>
                      Failed:{" "}
                      {
                        lastSyncResult.results.filter(
                          (r) => r.status === "failed",
                        ).length
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
