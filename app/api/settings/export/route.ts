import { NextRequest } from 'next/server';
import { buildAccountExport } from '@/lib/settings';
import {
  claimRoastSessionsForUser,
  listNichePatterns,
  listNicheProfile,
  listOwnedRoastSessions,
  requireAuthenticatedUser,
} from '@/lib/settings-server';

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null) as { sessionId?: string } | null;
    await claimRoastSessionsForUser(auth.user.id, body?.sessionId);

    const roastSessions = await listOwnedRoastSessions(auth.user.id);
    const nicheProfile = await listNicheProfile(auth.user.id);
    const nichePatterns = nicheProfile?.id ? await listNichePatterns(nicheProfile.id) : [];

    const payload = buildAccountExport(auth.user, {
      roastSessions,
      nicheProfile,
      nichePatterns,
    });

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="goviral-account-export.json"',
      },
    });
  } catch (error) {
    console.error('[settings/export] Error:', error);
    return Response.json({ error: 'Failed to export your account data' }, { status: 500 });
  }
}
