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
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAllFeatureFlagConfigs } from '@/lib/feature-flags/config';
import { FeatureFlags } from '@/lib/feature-flags/types';

interface EarlyAccessFeature {
  flagKey: string;
  name: string;
  description?: string;
  stage: string;
  enrolled?: boolean;
}

// Local storage key for feature flag overrides
const LOCAL_FLAG_OVERRIDES_KEY = 'feature-flag-overrides';

function getLocalFlagOverrides(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(LOCAL_FLAG_OVERRIDES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to get local flag overrides:', error);
    return {};
  }
}

function setLocalFlagOverride(flagKey: string, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  
  try {
    const overrides = getLocalFlagOverrides();
    overrides[flagKey] = enabled;
    localStorage.setItem(LOCAL_FLAG_OVERRIDES_KEY, JSON.stringify(overrides));
    console.log(`Local flag override set: ${flagKey} = ${enabled}`);
  } catch (error) {
    console.warn('Failed to set local flag override:', error);
  }
}

export default function AccountFeaturesPage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [features, setFeatures] = useState<EarlyAccessFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadFeatures = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all feature flag configs and filter for early access features (rolloutPercentage: 0)
      const allConfigs = getAllFeatureFlagConfigs();
      const localOverrides = getLocalFlagOverrides();
      
      const earlyAccessConfigs = Object.entries(allConfigs)
        .filter(([_, config]) => config.rolloutPercentage === 0)
        .map(([flagKey, config]) => ({
          flagKey,
          name: formatFeatureName(config.name),
          description: config.description,
          stage: 'beta', // Default stage for config-based features
          enrolled: localOverrides.hasOwnProperty(flagKey) ? localOverrides[flagKey] : config.defaultValue
        }));
      
      setFeatures(earlyAccessConfigs);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load early access features:', error);
      // Use toast directly instead of in dependency
      toast({
        title: "Error",
        description: "Failed to load early access features. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []); // Remove toast dependency

  const toggleFeature = async (flagKey: string, enabled: boolean) => {
    try {
      setUpdating(flagKey);
      
      // For local features, just update local storage
      setLocalFlagOverride(flagKey, enabled);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('featureFlagChanged', {
        detail: { flagKey, enabled }
      }));
      
      // Update local state
      setFeatures(prev => 
        prev.map(feature => 
          feature.flagKey === flagKey 
            ? { ...feature, enrolled: enabled }
            : feature
        )
      );
      
      const feature = features.find(f => f.flagKey === flagKey);
      const featureName = feature?.name || flagKey;
      
      toast({
        title: enabled ? "Feature Enabled" : "Feature Disabled",
        description: `${enabled ? 'Opted into' : 'Opted out of'} ${featureName}`,
      });
      
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
    await loadFeatures();
    toast({
      title: "Refreshed",
      description: "Early access features refreshed successfully.",
    });
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadFeatures();
    }
    
    // Cleanup function to prevent memory leaks
    return () => {
      // Clear any pending state updates
      setFeatures([]);
      setLoading(false);
      setUpdating(null);
    };
  }, [isLoaded, user, loadFeatures]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Account", href: "/account" },
    { label: "Features" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={refreshFeatures} 
        disabled={loading}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Refresh
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

  const formatFeatureName = (name: string) => {
    // Convert kebab-case to Title Case
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Early Access Features"
      subtitle="Manage your opt-in preferences for experimental features"
      headerActions={headerActions}
    >
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Feature Status
          </CardTitle>
          <CardDescription>
            Your early access feature preferences and account information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Available Features:</span>
              <Badge variant="outline">
                {features.length} {features.length === 1 ? 'feature' : 'features'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Enrolled Features:</span>
              <Badge variant="outline">
                {features.filter(f => f.enrolled).length} {features.filter(f => f.enrolled).length === 1 ? 'feature' : 'features'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Available Early Access Features
          </CardTitle>
          <CardDescription>
            Toggle features on or off to control your access to experimental functionality.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading early access features...</span>
            </div>
          ) : features.length > 0 ? (
            <div className="space-y-4">
              {features.map((feature) => (
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
          ) : (
            <div className="text-center py-8">
              <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Early Access Features Available</h3>
              <p className="text-sm text-muted-foreground mb-4">
                There are currently no early access features available for your account.
              </p>
              <Button onClick={refreshFeatures} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Check for Features
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            About Early Access Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              Early access features are experimental functionality that may not be fully tested or stable. 
              These features are provided to give you a preview of upcoming functionality.
            </p>
            <div className="space-y-2">
              <h4 className="font-medium">Feature Stages:</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">Alpha</Badge>
                  <span>Very early development, may be unstable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">Beta</Badge>
                  <span>Feature complete, undergoing testing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Concept</Badge>
                  <span>Experimental ideas, may change significantly</span>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground">
              Your preferences are saved automatically and will persist across all your devices and sessions.
            </p>
          </div>
        </CardContent>
      </Card>
    </StandardizedSidebarLayout>
  );
}
