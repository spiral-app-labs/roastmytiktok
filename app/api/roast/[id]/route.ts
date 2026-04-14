import { NextRequest } from 'next/server';
import { getOwnedRoastSessionById, requireAuthenticatedUser } from '@/lib/settings-server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const auth = await requireAuthenticatedUser();
    if ('error' in auth) return auth.error;

    const data = await getOwnedRoastSessionById<{
      id: string;
      tiktok_url: string | null;
      overall_score: number | null;
      verdict: string | null;
      agent_scores: Record<string, number> | null;
      findings: Record<string, string[]> | null;
      result_json: Record<string, unknown> | null;
    }>(auth.user.id, id);

    if (!data) {
      return Response.json({ error: 'Roast not found' }, { status: 404 });
    }

    // If full result_json is available, return it directly
    if (data.result_json) {
      return Response.json(data.result_json);
    }

    // Fallback: construct partial result from individual columns
    const agentKeys = ['hook', 'visual', 'audio', 'authenticity', 'conversion', 'accessibility'] as const;
    const agents = agentKeys.map(key => {
      const hasScore = data.agent_scores?.[key] != null;
      return {
        agent: key,
        score: hasScore ? data.agent_scores[key] : -1,
        roastText: hasScore ? 'Roast data not fully available for this session.' : '',
        findings: data.findings?.[key] ?? [],
        improvementTip: hasScore ? 'Try uploading again for a full analysis.' : '',
        ...(hasScore ? {} : { failed: true, failureReason: 'This dimension was not evaluated. Try uploading again.' }),
      };
    });

    return Response.json({
      id: data.id,
      tiktokUrl: data.tiktok_url ?? '',
      overallScore: data.overall_score ?? 0,
      verdict: data.verdict ?? '',
      agents,
      metadata: {
        duration: 0,
        description: 'Uploaded video',
      },
    });
  } catch (err) {
    console.error('[roast] Fetch error:', err);
    return Response.json({ error: 'Failed to fetch roast' }, { status: 500 });
  }
}
