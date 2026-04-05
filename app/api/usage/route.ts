import { NextRequest } from 'next/server';
import { getUsageSnapshot, getUsageSubject } from '@/lib/usage';
import { isPaidUser } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');
    const subject = getUsageSubject(req, sessionId);
    const usage = await getUsageSnapshot(subject, isPaidUser(req) ? 'paid' : 'free');

    return Response.json({ usage });
  } catch (error) {
    console.error('[usage] Failed to load usage:', error);
    return Response.json({ error: 'Failed to load usage' }, { status: 500 });
  }
}
