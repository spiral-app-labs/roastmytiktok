import { NextRequest } from 'next/server';
import { getUsageSnapshot, resolveUsageContext } from '@/lib/usage';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    const context = await resolveUsageContext(req, sessionId);
    const usage = await getUsageSnapshot(context.subject, context.plan);

    return Response.json({ usage });
  } catch (error) {
    console.error('[usage] Failed to load usage:', error);
    return Response.json({ error: 'Failed to load usage' }, { status: 500 });
  }
}
