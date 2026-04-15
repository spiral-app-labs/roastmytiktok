import { NextRequest, NextResponse } from 'next/server';
import { getFreeSubscriptionSnapshot, getSubscriptionSnapshotForUserId } from '@/lib/entitlements';
import { applyUsageCookie, getUsageSnapshotForContext, resolveUsageContext } from '@/lib/usage';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    const context = await resolveUsageContext(req, sessionId);
    const usage = await getUsageSnapshotForContext(context);
    const subscription = context.userId
      ? await getSubscriptionSnapshotForUserId(context.userId)
      : getFreeSubscriptionSnapshot();

    return applyUsageCookie(NextResponse.json({ usage, subscription }), context);
  } catch (error) {
    console.error('[usage] Failed to load usage:', error);
    return Response.json({ error: 'Failed to load usage' }, { status: 500 });
  }
}
