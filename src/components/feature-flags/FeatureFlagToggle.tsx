'use client';

import { useState } from 'react';
import { useFeatureFlag, FeatureFlags } from '@/hooks/useFeatureFlag';
import { useUser } from '@clerk/nextjs';
import { updateEarlyAccessFeatureEnrollment } from '@/lib/feature-flags/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles, Settings, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface FeatureFlagToggleProps {
  flag: FeatureFlags;
  label: string;
  description?: string;
  showDetails?: boolean;
  allowUserOverride?: boolean;
}

export function FeatureFlagToggle({ 
  flag, 
  label, 
  description, 
  showDetails = false,
  allowUserOverride = true
}: FeatureFlagToggleProps) {
  const { enabled, loading, source, refresh } = useFeatureFlag(flag);
  const { user } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (!user || !allowUserOverride) {
      // Just refresh the flag if no user or override not allowed
      await refresh();
      return;
    }

    try {
      setIsToggling(true);
      
      console.log(`Toggling feature flag: ${flag} from ${enabled} to ${!enabled}`);
      
      // Use PostHog's early access feature enrollment
      await updateEarlyAccessFeatureEnrollment(flag, !enabled);
      
      console.log(`Feature flag toggle completed: ${flag} = ${!enabled}`);
      
      // Refresh to get the new state
      await refresh();
    } catch (error) {
      console.error('Error toggling feature flag:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const getSourceLabel = () => {
    switch (source) {
      case 'posthog':
        return 'PostHog';
      case 'fallback':
        return 'Default';
      default:
        return source || 'Unknown';
    }
  };

  const getSourceColor = () => {
    switch (source) {
      case 'posthog':
        return 'bg-blue-100 text-blue-800';
      case 'fallback':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span>{label}</span>
            {enabled && <Badge variant="default" className="text-xs">ON</Badge>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor={`toggle-${flag}`} className="text-sm">
            Status
          </Label>
          <div className="flex items-center gap-2">
            <Switch
              id={`toggle-${flag}`}
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={loading || isToggling}
            />
            <Badge variant="outline" className={`text-xs ${getSourceColor()}`}>
              {getSourceLabel()}
            </Badge>
          </div>
        </div>

        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}

        {showDetails && isExpanded && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Flag Name:</span>
                <code className="text-xs bg-muted px-1 rounded">{flag}</code>
              </div>
              <div className="flex justify-between text-xs">
                <span>Loading:</span>
                <span>{loading ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Source:</span>
                <span>{getSourceLabel()}</span>
              </div>
              {user && allowUserOverride && (
                <div className="flex justify-between text-xs">
                  <span>User Control:</span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Available
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refresh}
                  className="w-full text-xs"
                  disabled={loading}
                >
                  Refresh Flag
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact toggle for sidebar use
 */
export function FeatureFlagSidebarToggle({ flag, label, allowUserOverride = true }: FeatureFlagToggleProps) {
  const { enabled, loading, source, refresh } = useFeatureFlag(flag);
  const { user } = useUser();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (!user || !allowUserOverride) {
      await refresh();
      return;
    }

    try {
      setIsToggling(true);
      
      // Use PostHog's early access feature enrollment
      await updateEarlyAccessFeatureEnrollment(flag, !enabled);
      
      await refresh();
    } catch (error) {
      console.error('Error toggling feature flag:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-2 border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3 w-3 text-purple-500" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={loading || isToggling}
          className="scale-75"
        />
        <Badge variant="outline" className="text-xs scale-75">
          {source}
        </Badge>
      </div>
    </div>
  );
}
