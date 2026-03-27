import { NextRequest, NextResponse } from 'next/server';
import { MOCK_ROAST } from '@/lib/mock-data';

export async function POST(request: NextRequest) {
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
