'use client';

import * as React from "react";

// Removed BETA_FEATURES imports - using dynamic discovery instead
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { StandardizedSidebarLayout } from '@/components/layout/StandardizedSidebarLayout';
import { 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Activity, 
  User, 
  Settings, 
  Globe,
  Zap,
  Eye,
  Flag,
  TestTube,
  Crown,
  RefreshCw
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { 
  getEarlyAccessFeatures, 
  updateEarlyAccessFeatureEnrollment,
  checkEarlyAccessFeatureEnrollment,
  getAllPostHogFeatureFlags
} from '@/lib/feature-flags/client';
import { usePinkMode } from '@/hooks/usePinkMode';

export default function PostHogTestPage() {
  // Removed BETA_FEATURES - using dynamic feature flag discovery instead
  const { isPinkModeEnabled, isLoading: pinkModeLoading } = usePinkMode();
  const [posthogStatus, setPosthogStatus] = useState<{
    isInitialized: boolean;
    distinctId: string | null;
    betaFlag: unknown;
    isIdentified: boolean;
    personProfiles: boolean;
    config: {
      personProfiles: string;
      apiHost: string;
      uiHost: string;
      environment: string;
      proxyEnabled: boolean;
      testProxy: string | undefined;
    };
  } | null>(null);
  const [testEvents, setTestEvents] = useState<string[]>([]);
  const [userInfo, setUserInfo] = useState<{
    distinctId: string;
    isIdentified: boolean;
    hasPersonProfiles: boolean;
  } | null>(null);
  const [earlyAccessFeatures, setEarlyAccessFeatures] = useState<Array<{
    flagKey: string;
    name: string;
    description?: string;
    documentationUrl?: string;
    stage: string;
    enrolled?: boolean;
  }>>([]);
  const [earlyAccessLoading, setEarlyAccessLoading] = useState(false);
  const [allFeatureFlags, setAllFeatureFlags] = useState<Array<{
    key: string;
    name?: string;
    description?: string;
    enabled: boolean;
    payload?: unknown;
    isEarlyAccess?: boolean;
  }>>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);

  // Debug PostHog on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      // Load early access features and all feature flags
      loadEarlyAccessFeatures();
      loadAllFeatureFlags();
      // Import posthog dynamically to avoid SSR issues
      import('posthog-js').then((posthog) => {
        // Check for beta_features specifically
        if (posthog.default?.getEarlyAccessFeatures) {
          posthog.default.getEarlyAccessFeatures((features) => {
            console.log('All early access features from PostHog:', features);
            const betaFeatures = features.find(f => f.flagKey === 'beta_features');
            console.log('Beta features found:', betaFeatures);
            if (betaFeatures) {
              console.log('Beta features enrollment status:', (betaFeatures as { enrolled?: boolean }).enrolled);
            }
          }, true, ['concept', 'beta']);
        }
        const status = {
          isInitialized: !!posthog.default,
          distinctId: posthog.default?.get_distinct_id(),
          betaFlag: undefined, // Removed BETA_FEATURES reference
          isIdentified: posthog.default?.isFeatureEnabled('test_flag') !== null,
          personProfiles: posthog.default?.getFeatureFlag('test_flag') !== null,
          config: {
            personProfiles: posthog.default?.__loaded ? 'always' : 'not loaded',
            apiHost: (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_TEST_PROXY === 'true') ? 
              (typeof window !== 'undefined' ? `${window.location.origin}/e` : 'server-side') : 
              (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'),
            uiHost: 'https://eu.posthog.com',
            environment: process.env.NODE_ENV,
            proxyEnabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_TEST_PROXY === 'true',
            testProxy: process.env.NEXT_PUBLIC_TEST_PROXY
          }
        };
        
        setPosthogStatus(status);
        console.log('PostHog Debug Info:', status);

        // Check for early access features
        if (posthog.default?.getEarlyAccessFeatures) {
          posthog.default.getEarlyAccessFeatures((features) => {
            console.log('Available early access features:', features);
            // Removed BETA_FEATURES specific check - now using dynamic discovery
          }, true, ['concept', 'beta']);
        }

        // Get user info if available
        if (posthog.default?.get_distinct_id()) {
          setUserInfo({
            distinctId: posthog.default.get_distinct_id(),
            isIdentified: posthog.default.isFeatureEnabled('test_flag') !== null,
            hasPersonProfiles: posthog.default.getFeatureFlag('test_flag') !== null
          });
        }
      });
    }
  }, []);

  const sendTestEvent = async (eventName: string, properties?: Record<string, unknown>) => {
    if (typeof window !== 'undefined') {
      const posthog = await import('posthog-js');
      posthog.default.capture(eventName, properties);
      setTestEvents(prev => [...prev, `${new Date().toLocaleTimeString()}: ${eventName}`]);
    }
  };

  const identifyUser = async () => {
    if (typeof window !== 'undefined') {
      const posthog = await import('posthog-js');
      const testUserId = `test_user_${Date.now()}`;
      posthog.default.identify(testUserId, {
        email: 'test@example.com',
        name: 'Test User',
        testProperty: 'test_value'
      });
      setUserInfo({
        distinctId: testUserId,
        isIdentified: true,
        hasPersonProfiles: true
      });
    }
  };

  const resetUser = async () => {
    if (typeof window !== 'undefined') {
      const posthog = await import('posthog-js');
      posthog.default.reset();
      setUserInfo(null);
    }
  };

  const loadEarlyAccessFeatures = async () => {
    try {
      setEarlyAccessLoading(true);
      const features = await getEarlyAccessFeatures();
      console.log('Loaded early access features:', features);
      
      // Also check enrollment status for each feature individually
      const featuresWithEnrollment = await Promise.all(
        features.map(async (feature) => {
          const enrollmentStatus = await checkEarlyAccessFeatureEnrollment(feature.flagKey);
          console.log(`Enrollment status for ${feature.flagKey}:`, enrollmentStatus);
          return {
            ...feature,
            enrolled: enrollmentStatus || false
          };
        })
      );
      
      setEarlyAccessFeatures(featuresWithEnrollment);
    } catch (error) {
      console.error('Failed to load early access features:', error);
    } finally {
      setEarlyAccessLoading(false);
    }
  };

  const loadAllFeatureFlags = async () => {
    try {
      setFlagsLoading(true);
      const flags = await getAllPostHogFeatureFlags();
      setAllFeatureFlags(flags);
    } catch (error) {
      console.error('Failed to load all feature flags:', error);
    } finally {
      setFlagsLoading(false);
    }
  };

  const refresh = () => {
    loadEarlyAccessFeatures();
    loadAllFeatureFlags();
  };

  // Auto-refresh feature flags every 30 seconds to show live status
  useEffect(() => {
    const interval = setInterval(() => {
      if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        loadAllFeatureFlags();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const checkEnrollmentStatus = async (flagKey: string) => {
    try {
      const status = await checkEarlyAccessFeatureEnrollment(flagKey);
      console.log(`Manual enrollment check for ${flagKey}:`, status);
      // Update the local state to reflect the current enrollment status
      setEarlyAccessFeatures(prev => 
        prev.map(feature => 
          feature.flagKey === flagKey 
            ? { ...feature, enrolled: status || false }
            : feature
        )
      );
      return status;
    } catch (error) {
      console.error(`Failed to check enrollment status for ${flagKey}:`, error);
      return null;
    }
  };

  const toggleEarlyAccessFeature = async (flagKey: string, enabled: boolean) => {
    try {
      console.log(`Toggling early access feature: ${flagKey} to ${enabled}`);
      
      // Check status before change
      const beforeStatus = await checkEarlyAccessFeatureEnrollment(flagKey);
      console.log(`Status before change for ${flagKey}:`, beforeStatus);
      
      await updateEarlyAccessFeatureEnrollment(flagKey, enabled);
      
      // Reload features to get updated enrollment status
      await loadEarlyAccessFeatures();
      
      // Also check the specific enrollment status for this feature
      const enrollmentStatus = await checkEarlyAccessFeatureEnrollment(flagKey);
      console.log(`Enrollment status for ${flagKey} after change:`, enrollmentStatus);
      
      // Check if the feature flag is now enabled
      if (typeof window !== 'undefined') {
        const posthog = await import('posthog-js');
        const isFeatureEnabled = posthog.default.isFeatureEnabled(flagKey);
        console.log(`Feature flag ${flagKey} enabled status:`, isFeatureEnabled);
      }
      
      // Refresh feature flag to get updated value
      refresh();
    } catch (error) {
      console.error('Failed to toggle early access feature:', error);
    }
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dev", href: "/dev" },
    { label: "PostHog Test" }
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={refresh} disabled={earlyAccessLoading || flagsLoading}>
        <RefreshCw className={`h-4 w-4 mr-2 ${(earlyAccessLoading || flagsLoading) ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      <Button size="sm" onClick={identifyUser}>
        <User className="h-4 w-4 mr-2" />
        Identify User
      </Button>
    </div>
  );

  return (
    <StandardizedSidebarLayout
      breadcrumbs={breadcrumbs}
      title="PostHog Test Dashboard"
      subtitle="Comprehensive testing for PostHog events, feature flags, user identification, and proxy configuration"
      headerActions={headerActions}
    >
      {/* PostHog Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            PostHog Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>PostHog Key:</span>
              <Badge variant={process.env.NEXT_PUBLIC_POSTHOG_KEY ? "default" : "destructive"}>
                {process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'Configured' : 'Missing'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Environment:</span>
              <Badge variant="outline">
                {process.env.NODE_ENV}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Proxy Status:</span>
              <Badge variant={(process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_TEST_PROXY === 'true') ? "default" : "secondary"}>
                {(process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_TEST_PROXY === 'true') ? 'Enabled (/e)' : 'Direct Connection'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>API Host:</span>
              <Badge variant="outline">
                {(process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_TEST_PROXY === 'true') ? 
                  (typeof window !== 'undefined' ? `${window.location.origin}/e` : 'Loading...') : 
                  (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com')}
              </Badge>
            </div>
          </div>
          
          {!process.env.NEXT_PUBLIC_POSTHOG_KEY && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Setup Required</h4>
              <p className="text-sm text-yellow-700 mb-2">
                To test PostHog, you need to configure it:
              </p>
              <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                <li>Create a PostHog account at <a href="https://posthog.com" target="_blank" rel="noopener noreferrer" className="underline">posthog.com</a></li>
                <li>Create a new project</li>
                <li>Copy your project API key</li>
                <li>Add to your <code className="bg-yellow-100 px-1 rounded">.env.local</code> file:</li>
              </ol>
              <div className="mt-2 p-2 bg-yellow-100 rounded text-xs font-mono">
                NEXT_PUBLIC_POSTHOG_KEY=phc_your_api_key_here
              </div>
            </div>
          )}

          {/* Proxy Testing Instructions */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Test Proxy in Development</h4>
              <p className="text-sm text-green-700 mb-2">
                To test the proxy configuration in development:
              </p>
              <ol className="text-sm text-green-700 list-decimal list-inside space-y-1 mb-3">
                <li>Add to your <code className="bg-green-100 px-1 rounded">.env.local</code>:</li>
              </ol>
              <div className="p-2 bg-green-100 rounded text-xs font-mono mb-3">
                NEXT_PUBLIC_TEST_PROXY=true
              </div>
              <p className="text-sm text-green-700">
                Then restart your dev server and refresh this page. You should see &quot;Enabled (/e)&quot; status.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PostHog Status */}
      {posthogStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              PostHog Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Initialized:</span>
                <Badge variant={posthogStatus.isInitialized ? "default" : "destructive"}>
                  {posthogStatus.isInitialized ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Distinct ID:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {posthogStatus.distinctId || 'Not set'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Person Profiles:</span>
                <Badge variant={posthogStatus.personProfiles ? "default" : "secondary"}>
                  {posthogStatus.personProfiles ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Feature Flags:</span>
                <Badge variant={posthogStatus.isIdentified ? "default" : "secondary"}>
                  {posthogStatus.isIdentified ? 'Working' : 'Not Working'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Pink Mode:</span>
                <Badge variant={isPinkModeEnabled ? "default" : "secondary"}>
                  {pinkModeLoading ? 'Loading...' : (isPinkModeEnabled ? 'Active' : 'Inactive')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userInfo ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Current User ID:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {userInfo.distinctId}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Identification Status:</span>
                  <Badge variant={userInfo.isIdentified ? "default" : "secondary"}>
                    {userInfo.isIdentified ? 'Identified' : 'Anonymous'}
                  </Badge>
                </div>
                <Button onClick={resetUser} variant="outline" size="sm">
                  Reset User
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">No user identified</p>
                <Button onClick={identifyUser} size="sm">
                  Identify Test User
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Event Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Event Testing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={() => sendTestEvent('test_button_clicked', { button: 'primary' })}
                size="sm"
              >
                Send Test Event
              </Button>
              <Button 
                onClick={() => sendTestEvent('test_page_viewed', { page: 'test_dashboard' })}
                variant="outline"
                size="sm"
              >
                Send Page View
              </Button>
              <Button 
                onClick={() => sendTestEvent('test_conversion', { value: 100, currency: 'USD' })}
                variant="outline"
                size="sm"
              >
                Send Conversion
              </Button>
              <Button 
                onClick={() => sendTestEvent('test_error', { error: 'test_error_message' })}
                variant="outline"
                size="sm"
              >
                Send Error Event
              </Button>
            </div>
            
            {testEvents.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Recent Events:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {testEvents.map((event, index) => (
                    <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                      {event}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Early Access Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Early Access Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {earlyAccessLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading early access features...
              </div>
            ) : earlyAccessFeatures.length > 0 ? (
              <div className="space-y-3">
                {earlyAccessFeatures.map((feature) => (
                  <div key={feature.flagKey} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{feature.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {feature.stage}
                        </Badge>
                        <Badge variant={feature.enrolled ? "default" : "secondary"} className="text-xs">
                          {feature.enrolled ? 'Enrolled' : 'Not Enrolled'}
                        </Badge>
                      </div>
                      {feature.description && (
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground font-mono">{feature.flagKey}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={feature.enrolled || false}
                        onCheckedChange={(enabled) => toggleEarlyAccessFeature(feature.flagKey, enabled)}
                        disabled={earlyAccessLoading}
                      />
                      <span className="text-sm text-muted-foreground min-w-[80px] text-right">
                        {feature.enrolled ? 'Enrolled' : 'Not Enrolled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Crown className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">No early access features found</p>
                <p className="text-xs text-muted-foreground">
                  Create early access features in your PostHog dashboard to see them here
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button onClick={loadEarlyAccessFeatures} variant="outline" size="sm" disabled={earlyAccessLoading}>
                Refresh Early Access Features
              </Button>
              {earlyAccessFeatures.length > 0 && (
                <Button 
                  onClick={() => earlyAccessFeatures.forEach(f => checkEnrollmentStatus(f.flagKey))} 
                  variant="outline" 
                  size="sm" 
                  disabled={earlyAccessLoading}
                >
                  Check All Enrollment Status
                </Button>
              )}
              <Button 
                onClick={() => checkEnrollmentStatus('beta_features')} 
                variant="outline" 
                size="sm" 
                disabled={earlyAccessLoading}
              >
                Check Beta Features Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Feature Flag Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            All Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {flagsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading feature flags...
              </div>
            ) : allFeatureFlags.length > 0 ? (
              <div className="space-y-3">
                {allFeatureFlags.map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{flag.name || flag.key}</span>
                        {flag.isEarlyAccess && (
                          <Badge variant="outline" className="text-xs">
                            Early Access
                          </Badge>
                        )}
                        <Badge variant={flag.enabled ? "default" : "secondary"}>
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      {flag.description && (
                        <p className="text-sm text-muted-foreground">{flag.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground font-mono">{flag.key}</p>
                      {Boolean(flag.payload) && (
                        <p className="text-xs text-muted-foreground">
                          Payload: {String(JSON.stringify(flag.payload as Record<string, unknown>))}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {flag.enabled ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Flag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-2">No feature flags found</p>
                <p className="text-xs text-muted-foreground">
                  Create feature flags in your PostHog dashboard to see them here
                </p>
              </div>
            )}
            
            <Button onClick={loadAllFeatureFlags} variant="outline" size="sm" disabled={flagsLoading}>
              Refresh All Flags
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Network Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Network Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Open browser Dev Tools → Network tab to monitor PostHog requests:
            </p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Look for requests to <code className="bg-gray-100 px-1 rounded">/e/*</code> (proxy mode) or <code className="bg-gray-100 px-1 rounded">eu.i.posthog.com</code> (direct mode)</li>
              <li>• Check for <code className="bg-gray-100 px-1 rounded">/e/capture/</code> (events)</li>
              <li>• Check for <code className="bg-gray-100 px-1 rounded">/e/decide/</code> (feature flags)</li>
              <li>• Check for <code className="bg-gray-100 px-1 rounded">/e/s/</code> (session recordings)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Check the browser console for detailed PostHog debugging information.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Look for &quot;PostHog Configuration&quot; logs</p>
              <p>• Check &quot;PostHog Debug Info&quot; for feature flag status</p>
              <p>• Monitor &quot;PostHog user identified&quot; messages</p>
              <p>• Verify events are being sent successfully</p>
            </div>
          </CardContent>
        </Card>
      )}
    </StandardizedSidebarLayout>
  );
}
