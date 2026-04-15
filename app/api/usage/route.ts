import { NextRequest } from 'next/server';
import { getFreeSubscriptionSnapshot, getSubscriptionSnapshotForUserId } from '@/lib/entitlements';
import { getUsageSnapshot, resolveUsageContext } from '@/lib/usage';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    const context = await resolveUsageContext(req, sessionId);
    const usage = await getUsageSnapshot(context.subject, context.plan);
    const subscription = context.userId
      ? await getSubscriptionSnapshotForUserId(context.userId)
      : getFreeSubscriptionSnapshot();

    return Response.json({ usage, subscription });
  } catch (error) {
    console.error('[usage] Failed to load usage:', error);
    return Response.json({ error: 'Failed to load usage' }, { status: 500 });
  }
}
