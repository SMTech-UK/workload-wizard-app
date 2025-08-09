import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  const me = await currentUser();
  const roles = ((me?.publicMetadata?.roles as string[]) || []);
  const role = (me?.publicMetadata?.role as string | undefined) ?? '';
  const isSys = roles.includes('sysadmin') || roles.includes('developer') || role === 'sysadmin' || role === 'developer';
  if (!isSys) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { name, enabled } = (await req.json()) as { name?: string; enabled?: boolean };
    if (!name || typeof enabled !== 'boolean') return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    // TODO: write to Convex overrides table. For now, accept and respond.
    return NextResponse.json({ ok: true, name, enabled });
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}


