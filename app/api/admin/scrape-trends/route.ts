import { NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://eayiazyiotnkggnsvhto.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export async function POST(_req: NextRequest) {
  try {
    const functionUrl = `${SUPABASE_URL}/functions/v1/tiktok-trend-scraper`;

    const resp = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const data = await resp.json();
    return Response.json(data);
  } catch (err) {
    console.error('[scrape-trends] Error invoking edge function:', err);
    return Response.json(
      { error: 'Failed to invoke trend scraper', detail: String(err) },
      { status: 500 },
    );
  }
}
