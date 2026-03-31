import { NextRequest, NextResponse } from 'next/server';
import { MOCK_ROAST } from '@/lib/mock-data';
import { checkRateLimit, isPaidUser } from '@/lib/rate-limit';

const FREE_LIMIT = { name: 'roast-free', max: 3, windowMs: 24 * 60 * 60 * 1000 };

export async function POST(request: NextRequest) {
  // Rate limit: free users get 3/day, paid users are unlimited
  if (!isPaidUser(request)) {
    const limited = checkRateLimit(request, FREE_LIMIT);
    if (limited) return limited;
  }

  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'TikTok URL is required' }, { status: 400 });
  }

  // V1 MVP: return mock data immediately
  // TODO: integrate Python analysis script + Claude roast generation
  return NextResponse.json({
    ...MOCK_ROAST,
    tiktokUrl: url,
  });
}
