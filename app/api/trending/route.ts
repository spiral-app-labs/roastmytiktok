import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // sound | format | hashtag | challenge
  const status = searchParams.get('status'); // emerging | peak | declining | dead
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);

  try {
    // ── Trending content ─────────────────────────────────────────────────
    let query = supabaseServer
      .from('rmt_trending_content')
      .select('*')
      .neq('status', 'dead')
      .order('velocity', { ascending: false })
      .limit(limit);

    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data: trending, error: trendingError } = await query;
    if (trendingError) throw trendingError;

    // ── Active viral tips ────────────────────────────────────────────────
    const { data: tips, error: tipsError } = await supabaseServer
      .from('rmt_viral_tips')
      .select('*')
      .eq('active', true)
      .order('relevance_score', { ascending: false })
      .limit(20);

    if (tipsError) throw tipsError;

    return Response.json({
      trending: trending ?? [],
      tips: tips ?? [],
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[api/trending] Error:', err);
    return Response.json(
      { error: 'Failed to fetch trending data', detail: String(err) },
      { status: 500 },
    );
  }
}
