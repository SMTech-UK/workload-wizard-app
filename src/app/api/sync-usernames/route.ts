import { NextResponse } from 'next/server';
import { syncUsernamesFromClerk } from '../../../lib/actions/syncUsernamesFromClerk';

export async function POST() {
  try {
    const result = await syncUsernamesFromClerk();
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Sync usernames API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync usernames' 
      },
      { status: 500 }
    );
  }
}