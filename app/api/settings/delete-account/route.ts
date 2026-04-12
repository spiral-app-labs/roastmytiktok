import { NextRequest } from 'next/server';
import { getSubscriptionSnapshot } from '@/lib/settings';
import { claimRoastSessionsForUser, deleteOwnedAccountData, requireAuthenticatedUser } from '@/lib/settings-server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json().catch(() => null) as { sessionId?: string } | null;
    await claimRoastSessionsForUser(auth.user.id, body?.sessionId);

    const subscription = getSubscriptionSnapshot(auth.user);
    if (subscription.isSubscribed) {
      return Response.json(
        {
          error: 'Cancel your active subscription from billing before deleting this account.',
          code: 'active_subscription',
        },
        { status: 409 }
      );
    }

    await deleteOwnedAccountData(auth.user);

    const serviceSupabase = createServiceClient();
    const { error: deleteError } = await serviceSupabase.auth.admin.deleteUser(auth.user.id, true);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[settings/delete-account] Error:', error);
    return Response.json({ error: 'Failed to delete your account' }, { status: 500 });
  }
}
