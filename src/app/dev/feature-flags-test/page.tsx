"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { StandardizedSidebarLayout } from "@/components/layout/StandardizedSidebarLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TestTube,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import {
  getEarlyAccessFeatures,
  checkEarlyAccessFeatureEnrollment,
  getAllPostHogFeatureFlags,
} from "@/lib/feature-flags/client";
import { FeatureFlags } from "@/lib/feature-flags/types";
import { getFeatureFlagConfig } from "@/lib/feature-flags/config";
import { useToast } from "@/hooks/use-toast";

interface EarlyAccessFeature {
  flagKey: string;
  name: string;
  description?: string;
  documentationUrl?: string;
  stage: string;
  enrolled?: boolean;
}

export default function FeatureFlagsTestPage() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [earlyAccessFeatures, setEarlyAccessFeatures] = useState<
    EarlyAccessFeature[]
  >([]);
  type DiscoveredFeature = {
    key: string;
    name?: string;
    enabled?: boolean;
    description?: string;
    isEarlyAccess?: boolean;
    [extra: string]: unknown;
  };
  const [allFeatures, setAllFeatures] = useState<DiscoveredFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadFeatures = async () => {
    try {
      setLoading(true);

      // Load both early access features and all features
      const [earlyAccess, all] = await Promise.all([
        getEarlyAccessFeatures(),
        getAllPostHogFeatureFlags(),
      ]);

      setEarlyAccessFeatures(earlyAccess);
      setAllFeatures(all);
      setLastRefresh(new Date());

      toast({
        title: "Features Loaded",
        description: `Found ${earlyAccess.length} early access features and ${all.length} total features.`,
      });
    } catch (error) {
      console.error("Failed to load features:", error);
      toast({
        title: "Error",
        description: "Failed to load features. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadFeatures();
    }
  }, [isLoaded, user]);

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dev", href: "/dev" },
    { label: "Feature Flags Test" },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={loadFeatures}
        disabled={loading}
      >
        <RefreshCw
          className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
        />
        Refresh
      </Button>
    </div>
  );

  const getStageBadgeVariant = (stage: string) => {
    switch (stage.toLowerCase()) {
      case "concept":
        return "secondary" as const;
      case "beta":
        return "default" as const;
      case "alpha":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="Feature Flags Test"
      subtitle="Test and debug feature flag discovery and early access features"
      headerActions={headerActions}
    >
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Feature Discovery Status
          </CardTitle>
          <CardDescription>
            Current status of feature flag discovery and early access features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">User ID:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {user?.id || "Not available"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Email:</span>
              <Badge variant="outline" className="font-mono text-xs">
                {user?.primaryEmailAddress?.emailAddress || "Not available"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Updated:</span>
              <Badge variant="outline">
                {lastRefresh ? lastRefresh.toLocaleTimeString() : "Never"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Early Access Features:
              </span>
              <Badge variant="outline">
                {earlyAccessFeatures.length}{" "}
                {earlyAccessFeatures.length === 1 ? "feature" : "features"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Features:</span>
              <Badge variant="outline">
                {allFeatures.length}{" "}
                {allFeatures.length === 1 ? "feature" : "features"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Early Access Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Early Access Features
          </CardTitle>
          <CardDescription>
            Features discovered through dynamic early access feature discovery
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading early access features...</span>
            </div>
          ) : earlyAccessFeatures.length > 0 ? (
            <div className="space-y-4">
              {earlyAccessFeatures.map((feature) => (
                <div key={feature.flagKey} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{feature.name}</h3>
                        <Badge
                          variant={getStageBadgeVariant(feature.stage)}
                          className="text-xs"
                        >
                          {feature.stage}
                        </Badge>
                        <Badge
                          variant={feature.enrolled ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {feature.enrolled ? "Enrolled" : "Not Enrolled"}
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Early Access Features Found
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                No early access features were discovered. This could mean:
              </p>
              <ul className="text-sm text-muted-foreground text-left max-w-md mx-auto space-y-1">
                <li>• No features are configured as early access in PostHog</li>
                <li>
                  • Local feature flags are not configured with 0% rollout
                </li>
                <li>• PostHog is not properly configured</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            All Discovered Features
          </CardTitle>
          <CardDescription>
            Complete list of all features discovered from PostHog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading all features...</span>
            </div>
          ) : allFeatures.length > 0 ? (
            <div className="space-y-4">
              {allFeatures.map((feature, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {feature.name || feature.key}
                        </h3>
                        <Badge
                          variant={feature.enabled ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {feature.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        {feature.isEarlyAccess && (
                          <Badge variant="outline" className="text-xs">
                            Early Access
                          </Badge>
                        )}
                      </div>

                      {feature.description && (
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">{feature.key}</span>
                        <span>
                          Type:{" "}
                          {feature.isEarlyAccess
                            ? "Early Access"
                            : "Regular Flag"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Features Found</h3>
              <p className="text-sm text-muted-foreground">
                No features were discovered from PostHog.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Local Feature Flag Configuration</CardTitle>
          <CardDescription>
            Feature flags configured locally in the codebase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.values(FeatureFlags).map((flagKey) => {
              const config = getFeatureFlagConfig(flagKey);
              return (
                <div key={flagKey} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{flagKey}</h3>
                        <Badge variant="outline" className="text-xs">
                          Local Config
                        </Badge>
                        {config?.rolloutPercentage === 0 && (
                          <Badge variant="secondary" className="text-xs">
                            Early Access
                          </Badge>
                        )}
                      </div>

                      {config?.description && (
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Default:{" "}
                          {config?.defaultValue ? "Enabled" : "Disabled"}
                        </span>
                        {config?.rolloutPercentage !== undefined && (
                          <span>Rollout: {config.rolloutPercentage}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </StandardizedSidebarLayout>
  );
}
