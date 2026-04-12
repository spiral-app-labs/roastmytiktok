import { getSupabasePublicEnv } from '@/lib/supabase/env';

const { url, anonKey } = getSupabasePublicEnv();

export async function POST() {
  try {
    const functionUrl = `${url}/functions/v1/tiktok-trend-scraper`;

    const resp = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
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
