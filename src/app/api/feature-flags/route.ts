import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  getServerFeatureFlags, 
  getServerFeatureFlagWithUser,
  FeatureFlags, 
  getAllFeatureFlagConfigs,
  isValidFeatureFlag 
} from '@/lib/feature-flags/server-index';

/**
 * GET /api/feature-flags
 * Get feature flags for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const flagsParam = searchParams.get('flags');
    
    let flagsToCheck: FeatureFlags[] = [];
    
    if (flagsParam) {
      // Check specific flags
      const flagNames = flagsParam.split(',');
      flagsToCheck = flagNames.filter(flag => isValidFeatureFlag(flag)) as FeatureFlags[];
    } else {
      // Check all flags
      flagsToCheck = Object.values(FeatureFlags);
    }

    const context = {
      userId,
      distinctId: userId,
    };

    const results = await getServerFeatureFlags(flagsToCheck, context);

    return NextResponse.json({
      flags: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Feature flags API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

/**
 * POST /api/feature-flags
 * Get feature flag configurations (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add proper admin check here
    // For now, return all configs
    const configs = getAllFeatureFlagConfigs();

    return NextResponse.json({
      configs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Feature flags config API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
