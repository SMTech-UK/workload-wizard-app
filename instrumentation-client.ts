import posthog from 'posthog-js'

if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    // Use proxy in production, or when explicitly testing proxy in dev
    const useProxy = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_TEST_PROXY === 'true';
    
    const apiHost = useProxy
        ? `${window.location.origin}/e`  // Use our proxy
        : process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'; // Direct connection in dev
    
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: apiHost,
        ui_host: 'https://eu.posthog.com', // Always use direct UI host for toolbar/auth
        defaults: '2025-05-24'
    });
    
    // Log the configuration for debugging
    if (process.env.NODE_ENV === 'development') {
        console.log('PostHog Configuration:', {
            apiHost,
            uiHost: 'https://eu.posthog.com',
            useProxy,
            environment: process.env.NODE_ENV,
            testProxy: process.env.NEXT_PUBLIC_TEST_PROXY
        });
    }
}