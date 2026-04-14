import { listOwnedRoastSessionsBySessionId, requireAuthenticatedUser } from '@/lib/settings-server';

export async function GET(_req: Request, { params }: { params: Promise<{ session_id: string }> }) {
  const { session_id } = await params;

  if (!session_id || session_id.length < 5) {
    return Response.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  const auth = await requireAuthenticatedUser();
  if ('error' in auth) return auth.error;

  try {
    const data = await listOwnedRoastSessionsBySessionId<{
      id: string;
      created_at: string | null;
      overall_score: number | null;
      verdict: string | null;
      source: string | null;
      filename: string | null;
      tiktok_url: string | null;
      agent_scores: Record<string, number> | null;
      findings: Record<string, string[]> | null;
      result_json: { viralPotential?: number } | null;
    }>(
      auth.user.id,
      session_id,
      'id, created_at, overall_score, verdict, source, filename, tiktok_url, agent_scores, findings, result_json',
    );

    if (data.length === 0) {
      return Response.json({ error: 'History not found' }, { status: 404 });
    }

    const entries = data.map(row => {
      const resultJson = row.result_json ?? null;
      return {
        id: row.id,
        date: row.created_at,
        overallScore: row.overall_score,
        viralPotential: resultJson?.viralPotential ?? undefined,
        verdict: row.verdict ?? '',
        source: row.source,
        filename: row.filename ?? undefined,
        url: row.tiktok_url ?? undefined,
        agentScores: row.agent_scores ?? {},
        findings: row.findings ?? {},
      };
    });

    return Response.json({ entries });
  } catch (error) {
    console.error('[history] Supabase query failed:', error);
    return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
