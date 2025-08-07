'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles } from 'lucide-react';
import { usePinkMode } from '@/hooks/usePinkMode';
import { FeatureFlagToggle } from '@/components/feature-flags/FeatureFlagToggle';
import { FeatureFlags } from '@/lib/feature-flags/types';
import { useToast } from '@/hooks/use-toast';

export function PinkModeDemo() {
  const { isPinkModeEnabled, isLoading, refreshPinkMode } = usePinkMode();
  const { toast } = useToast();

  const handlePinkModeToggle = async (enabled: boolean) => {
    try {
      await refreshPinkMode();
      toast({
        title: enabled ? "Pink Mode Enabled" : "Pink Mode Disabled",
        description: `Pink mode has been ${enabled ? 'enabled' : 'disabled'}. The theme will update immediately.`,
      });
    } catch (error) {
      console.error('Failed to update pink mode status:', error);
      toast({
        title: "Error",
        description: "Failed to update pink mode status. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Pink Mode Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading pink mode status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Pink Mode Demo
        </CardTitle>
        <CardDescription>
          This card demonstrates the pink theme when the pink-mode early access feature is enabled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={isPinkModeEnabled ? "default" : "secondary"}>
            {isPinkModeEnabled ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {isPinkModeEnabled ? (
          <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
            <h4 className="font-medium text-pink-800 mb-2">🎉 Pink Mode Active!</h4>
            <p className="text-sm text-pink-700">
              Pink mode is active! Notice how this card and the entire UI now has a pink theme.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Pink Mode Inactive</h4>
            <p className="text-sm text-muted-foreground">
              Pink mode is currently inactive. Enable the &quot;pink-mode&quot; early access feature to see the pink theme.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Go to Account → Features to enable pink mode.
            </p>
          </div>
        )}

        <FeatureFlagToggle
          flagKey={FeatureFlags.PINK_MODE}
          flagName="Pink Mode"
          description="Transform the entire UI with a beautiful pink color scheme"
          isEarlyAccess={true}
          currentStatus={isPinkModeEnabled}
          onStatusChange={handlePinkModeToggle}
          disabled={isLoading}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={refreshPinkMode}
          disabled={isLoading}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </CardContent>
    </Card>
  );
}
