import { NextRequest, NextResponse } from 'next/server';
import { getFeatureFlag } from '@/lib/feature-flags/client';
import { FeatureFlags } from '@/lib/feature-flags/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flagName = searchParams.get('flag');
    
    if (!flagName) {
      return NextResponse.json(
        { error: 'Flag name is required' },
        { status: 400 }
      );
    }

    // Validate flag name
    if (!Object.values(FeatureFlags).includes(flagName as FeatureFlags)) {
      return NextResponse.json(
        { error: `Invalid flag name: ${flagName}` },
        { status: 400 }
      );
    }

    const result = await getFeatureFlag(flagName as FeatureFlags);
    
    return NextResponse.json({
      flag: flagName,
      enabled: result.enabled,
      source: result.source,
      payload: result.payload
    });
  } catch (error) {
    console.error('Error getting feature flag:', error);
    return NextResponse.json(
      { error: 'Failed to get feature flag' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flagName } = body;

    if (!flagName) {
      return NextResponse.json(
        { error: 'Flag name is required' },
        { status: 400 }
      );
    }

    // Validate flag name
    if (!Object.values(FeatureFlags).includes(flagName as FeatureFlags)) {
      return NextResponse.json(
        { error: `Invalid flag name: ${flagName}` },
        { status: 400 }
      );
    }

    // For now, we'll just return the current status
    // In a real implementation, you might update the flag value
    const result = await getFeatureFlag(flagName as FeatureFlags);
    
    return NextResponse.json({
      flag: flagName,
      enabled: result.enabled,
      source: result.source,
      message: 'Feature flag status retrieved (update not implemented)'
    });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    );
  }
}
