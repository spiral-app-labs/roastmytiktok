import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { data, error } = await supabaseServer
      .from('rmt_roast_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: 'Roast not found' }, { status: 404 });
    }

    // If full result_json is available, return it directly
    if (data.result_json) {
      return Response.json(data.result_json);
    }

    // Fallback: construct partial result from individual columns
    const agentKeys = ['hook', 'visual', 'caption', 'audio', 'algorithm', 'authenticity'] as const;
    const agents = agentKeys.map(key => ({
      agent: key,
      score: data.agent_scores?.[key] ?? 50,
      roastText: 'Roast data not fully available for this session.',
      findings: data.findings?.[key] ?? [],
      improvementTip: 'Try uploading again for a full analysis.',
    }));

    return Response.json({
      id: data.id,
      tiktokUrl: data.tiktok_url ?? '',
      overallScore: data.overall_score ?? 0,
      verdict: data.verdict ?? '',
      agents,
      metadata: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        duration: 0,
        hashtags: [],
        description: data.source === 'upload' ? 'Uploaded video' : 'TikTok URL',
      },
    });
  } catch (err) {
    console.error('[roast] Fetch error:', err);
    return Response.json({ error: 'Failed to fetch roast' }, { status: 500 });
  }
}
