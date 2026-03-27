import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_req: Request, ctx: RouteContext<'/api/history/[session_id]'>) {
  const { session_id } = await ctx.params;

  if (!session_id || session_id.length < 5) {
    return Response.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('rmt_roast_sessions')
    .select('id, created_at, overall_score, verdict, source, filename, tiktok_url, agent_scores, findings')
    .eq('session_id', session_id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[history] Supabase query failed:', error.message);
    return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
  }

  const entries = (data ?? []).map(row => ({
    id: row.id,
    date: row.created_at,
    overallScore: row.overall_score,
    verdict: row.verdict ?? '',
    source: row.source,
    filename: row.filename ?? undefined,
    url: row.tiktok_url ?? undefined,
    agentScores: row.agent_scores ?? {},
    findings: row.findings ?? {},
  }));

  return Response.json({ entries });
}
