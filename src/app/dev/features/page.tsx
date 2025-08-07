'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';
import { StandardizedSidebarLayout } from '@/components/layout/StandardizedSidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Crown, 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Palette,
  Globe,
  Settings,
  Code,
  Eye,
  Database
} from 'lucide-react';
import { 
  getEarlyAccessFeatures, 
  updateEarlyAccessFeatureEnrollment,
  checkEarlyAccessFeatureEnrollment,
  getAllPostHogFeatureFlags
} from '@/lib/feature-flags/client';
import { useToast } from '@/hooks/use-toast';
import { usePinkMode } from '@/hooks/usePinkMode';
import { FeatureFlagToggle } from '@/components/feature-flags/FeatureFlagToggle';
import { FeatureFlags } from '@/lib/feature-flags/types';
import { FEATURE_FLAG_CONFIGS } from '@/lib/feature-flags/config';

interface EarlyAccessFeature {
  flagKey: string;
  name: string;
  description?: string;
  documentationUrl?: string;
  stage: string;
  enrolled?: boolean;
  source: 'posthog' | 'local';
}

interface PostHogFeature {
  key: string;
  name?: string;
  description?: string;
  enabled: boolean;
  rollout_percentage?: number;
}

export default function DevFeaturesPage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const { isPinkModeEnabled, isLoading: pinkModeLoading, refreshPinkMode } = usePinkMode();
  const [earlyAccessFeatures, setEarlyAccessFeatures] = useState<EarlyAccessFeature[]>([]);
  const [allPostHogFeatures, setAllPostHogFeatures] = useState<PostHogFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadAllFeatures = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load early access features with error handling
      let earlyAccessFeaturesData: Array<{
        flagKey: string;
        name: string;
        description?: string;
        documentationUrl?: string;
        stage: string;
        enrolled?: boolean;
      }> = [];
      try {
        earlyAccessFeaturesData = await getEarlyAccessFeatures();
      } catch (error) {
        console.warn('Failed to load PostHog early access features, using local features only:', error);
        // Fall back to local features only
        earlyAccessFeaturesData = [];
      }
      
      const featuresWithStatus = await Promise.all(
        earlyAccessFeaturesData.map(async (feature) => {
          try {
            const enrollmentStatus = await checkEarlyAccessFeatureEnrollment(feature.flagKey);
            return {
              ...feature,
              enrolled: enrollmentStatus || false,
              source: (feature.documentationUrl ? 'posthog' : 'local') as 'posthog' | 'local'
            };
          } catch (error) {
            console.warn(`Failed to check enrollment for ${feature.flagKey}:`, error);
            return {
              ...feature,
              enrolled: false,
              source: (feature.documentationUrl ? 'posthog' : 'local') as 'posthog' | 'local'
            };
          }
        })
      );
      setEarlyAccessFeatures(featuresWithStatus);
      
      // Load all PostHog features with error handling
      let allFeatures: Array<{
        key: string;
        name?: string;
        description?: string;
        enabled: boolean;
        payload?: unknown;
        isEarlyAccess?: boolean;
      }> = [];
      try {
        allFeatures = await getAllPostHogFeatureFlags();
      } catch (error) {
        console.warn('Failed to load PostHog features:', error);
        // Keep empty array if PostHog fails
        allFeatures = [];
      }
      setAllPostHogFeatures(allFeatures);
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load features:', error);
      // Use toast directly instead of in dependency
      toast({
        title: "Error",
        description: "Failed to load features. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []); // Remove toast dependency

  const toggleFeature = async (flagKey: string, enabled: boolean) => {
    try {
      setUpdating(flagKey);
      
      await updateEarlyAccessFeatureEnrollment(flagKey, enabled);
      
      // Update local state
      setEarlyAccessFeatures(prev => 
        prev.map(feature => 
          feature.flagKey === flagKey 
            ? { ...feature, enrolled: enabled }
            : feature
        )
      );
      
      const feature = earlyAccessFeatures.find(f => f.flagKey === flagKey);
      const featureName = feature?.name || flagKey;
      
      toast({
        title: enabled ? "Feature Enabled" : "Feature Disabled",
        description: `${enabled ? 'Opted into' : 'Opted out of'} ${featureName}`,
      });
      
      // Verify the change was applied
      const verificationStatus = await checkEarlyAccessFeatureEnrollment(flagKey);
      if (verificationStatus !== enabled) {
        console.warn(`Enrollment status mismatch for ${flagKey}: expected ${enabled}, got ${verificationStatus}`);
        // Reload to get the correct status
        await loadAllFeatures();
      }
    } catch (error) {
      console.error('Failed to toggle feature:', error);
      toast({
        title: "Error",
        description: `Failed to ${enabled ? 'enable' : 'disable'} feature. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const refreshFeatures = async () => {
    try {
      setRefreshing(true);
      await loadAllFeatures();
      toast({
        title: "Refreshed",
        description: "All features refreshed successfully.",
      });
    } catch (error) {
      console.error('Failed to refresh features:', error);
      toast({
        title: "Error",
        description: "Failed to refresh features. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

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

  useEffect(() => {
    if (isLoaded && user) {
      loadAllFeatures();
    }
  }, [isLoaded, user, loadAllFeatures]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dev", href: "/dev" },
    { label: "Features" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={refreshFeatures} 
        disabled={refreshing}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
        Refresh All
      </Button>
    </div>
  );

  const getStageBadgeVariant = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'concept':
        return 'secondary' as const;
      case 'beta':
        return 'default' as const;
      case 'alpha':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const capitalizeStage = (stage: string) => {
    return stage.charAt(0).toUpperCase() + stage.slice(1).toLowerCase();
  };

  const posthogEarlyAccessFeatures = earlyAccessFeatures.filter(f => f.source === 'posthog');
  const localEarlyAccessFeatures = earlyAccessFeatures.filter(f => f.source === 'local');

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Feature Flag Management"
      subtitle="Developer tools for managing and previewing feature flags"
      headerActions={headerActions}
    >
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Feature Management Overview
          </CardTitle>
          <CardDescription>
            Comprehensive view of all feature flags and their current states.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold">{earlyAccessFeatures.length}</div>
              <div className="text-sm text-muted-foreground">Early Access Features</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{allPostHogFeatures.length}</div>
              <div className="text-sm text-muted-foreground">PostHog Features</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{Object.keys(FEATURE_FLAG_CONFIGS).length}</div>
              <div className="text-sm text-muted-foreground">Local Configs</div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}</div>
              <div className="text-sm text-muted-foreground">Last Updated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pink Mode Quick Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Pink Mode Theme
          </CardTitle>
          <CardDescription>
            Quick toggle for the pink mode theme. This is a local feature flag with immediate effect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeatureFlagToggle
            flagKey={FeatureFlags.PINK_MODE}
            flagName="Pink Mode"
            description="Transform the entire UI with a beautiful pink color scheme"
            isEarlyAccess={true}
            currentStatus={isPinkModeEnabled}
            onStatusChange={handlePinkModeToggle}
            disabled={pinkModeLoading}
          />
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2">Current Status:</div>
            <div className="space-y-1 text-sm">
              <div>Enabled: {isPinkModeEnabled ? 'Yes' : 'No'}</div>
              <div>Loading: {pinkModeLoading ? 'Yes' : 'No'}</div>
              <div>CSS Class: {isPinkModeEnabled ? 'pink-mode' : 'none'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PostHog Early Access Features */}
      {posthogEarlyAccessFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              PostHog Early Access Features
            </CardTitle>
            <CardDescription>
              Features managed through PostHog&apos;s early access system. These features are configured in the PostHog dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {posthogEarlyAccessFeatures.map((feature) => (
                <div key={feature.flagKey} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{feature.name}</h3>
                        <Badge variant={getStageBadgeVariant(feature.stage)} className="text-xs">
                          {capitalizeStage(feature.stage)}
                        </Badge>
                        <Badge 
                          variant={feature.enrolled ? "default" : "secondary"} 
                          className="text-xs"
                        >
                          {feature.enrolled ? 'Enrolled' : 'Not Enrolled'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          PostHog
                        </Badge>
                      </div>
                      
                      {feature.description && (
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">{feature.flagKey}</span>
                        {feature.documentationUrl && (
                          <a 
                            href={feature.documentationUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Documentation
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4">
                      <div className="flex items-center gap-2">
                        {updating === feature.flagKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : feature.enrolled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <Switch
                          checked={feature.enrolled || false}
                          onCheckedChange={(enabled) => toggleFeature(feature.flagKey, enabled)}
                          disabled={updating === feature.flagKey}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Local Early Access Features */}
      {localEarlyAccessFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Local Early Access Features
            </CardTitle>
            <CardDescription>
              Features managed locally with immediate effect. These features are configured in the codebase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {localEarlyAccessFeatures.map((feature) => (
                <div key={feature.flagKey} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{feature.name}</h3>
                        <Badge variant={getStageBadgeVariant(feature.stage)} className="text-xs">
                          {capitalizeStage(feature.stage)}
                        </Badge>
                        <Badge 
                          variant={feature.enrolled ? "default" : "secondary"} 
                          className="text-xs"
                        >
                          {feature.enrolled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Settings className="h-3 w-3 mr-1" />
                          Local
                        </Badge>
                      </div>
                      
                      {feature.description && (
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">{feature.flagKey}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4">
                      <div className="flex items-center gap-2">
                        {updating === feature.flagKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : feature.enrolled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <Switch
                          checked={feature.enrolled || false}
                          onCheckedChange={(enabled) => toggleFeature(feature.flagKey, enabled)}
                          disabled={updating === feature.flagKey}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All PostHog Features */}
      {allPostHogFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              All PostHog Feature Flags
            </CardTitle>
            <CardDescription>
              Complete list of all feature flags from PostHog, including regular and early access features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allPostHogFeatures.map((feature, index) => (
                <div key={`${feature.key}-${index}`} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{feature.name || feature.key}</h3>
                        <Badge 
                          variant={feature.enabled ? "default" : "secondary"} 
                          className="text-xs"
                        >
                          {feature.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {feature.rollout_percentage !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {feature.rollout_percentage}% Rollout
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          PostHog
                        </Badge>
                      </div>
                      
                      {feature.description && (
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">{feature.key}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4">
                      <div className="flex items-center gap-2">
                        {feature.enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {feature.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Local Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Local Feature Flag Configuration
          </CardTitle>
          <CardDescription>
            Feature flags configured locally in the codebase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(FEATURE_FLAG_CONFIGS).map(([key, config]) => (
              <div key={key} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{config.name}</h3>
                      <Badge 
                        variant={config.defaultValue ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        Default: {config.defaultValue ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Settings className="h-3 w-3 mr-1" />
                        Local Config
                      </Badge>
                    </div>
                    
                    {config.description && (
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-mono">{key}</span>
                      <span>Rollout: {config.rolloutPercentage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* No Features Message */}
      {!loading && earlyAccessFeatures.length === 0 && allPostHogFeatures.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Features Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              There are currently no features available to display.
            </p>
            <Button onClick={refreshFeatures} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check for Features
            </Button>
          </CardContent>
        </Card>
      )}
    </StandardizedSidebarLayout>
  );
}
