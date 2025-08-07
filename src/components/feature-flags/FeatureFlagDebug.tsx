'use client';

import { useState } from 'react';
import { useFeatureFlag, useClearFeatureFlagCache } from '@/hooks/useFeatureFlag';
import { FeatureFlags } from '@/lib/feature-flags/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

/**
 * Debug component for feature flags (only shown in development)
 */
export function FeatureFlagDebug() {
  const [isVisible, setIsVisible] = useState(false);
  const { enabled, loading, error, source, refresh } = useFeatureFlag(FeatureFlags.BETA_FEATURES);
  const clearCache = useClearFeatureFlagCache();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleClearCache = () => {
    clearCache();
    refresh();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle button */}
      <Button
        onClick={() => setIsVisible(!isVisible)}
        variant="outline"
        size="sm"
        className="mb-2"
      >
        {isVisible ? 'Hide' : 'Show'} Feature Flags
      </Button>

      {/* Debug panel */}
      {isVisible && (
        <Card className="w-80 max-h-96 overflow-y-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              Feature Flags Debug
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={refresh}>
                  Refresh
                </Button>
                <Button size="sm" variant="outline" onClick={handleClearCache}>
                  Clear Cache
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
            {error && (
              <div className="text-sm text-red-500">
                Error: {error.message}
              </div>
            )}
            {!loading && !error && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">BETA_FEATURES</span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={enabled ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {enabled ? 'ON' : 'OFF'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {source || 'unknown'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            <Separator className="my-2" />
            <div className="text-xs text-muted-foreground">
              Total flags: 1
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
