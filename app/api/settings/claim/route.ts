import { NextRequest } from 'next/server';
import { claimRoastSessionsForUser, requireAuthenticatedUser } from '@/lib/settings-server';

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null) as { sessionId?: string } | null;
    const claimed = await claimRoastSessionsForUser(auth.user.id, body?.sessionId);

    return Response.json({ claimed });
  } catch (error) {
    console.error('[settings/claim] Error:', error);
    return Response.json({ error: 'Failed to link your roast history to this account' }, { status: 500 });
  }
}
