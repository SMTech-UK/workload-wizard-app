import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update last sign in time in Convex
    await convex.mutation(api.users.updateLastSignIn, {
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating last sign in time:', error);
    return NextResponse.json(
      { error: 'Failed to update last sign in time' }, 
      { status: 500 }
    );
  }
} 