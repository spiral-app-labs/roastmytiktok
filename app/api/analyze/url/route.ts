import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { supabaseServer } from '@/lib/supabase-server';
import { enforceUsageCap, resolveUsageContext } from '@/lib/usage';
import { isTikTokDownloaderAvailable, normalizeTikTokVideoUrl } from '@/lib/tiktok-url-audit';

interface AnalyzeUrlPayload {
  platformUrl?: string;
  linkedRoastId?: string;
  sessionId?: string;
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as AnalyzeUrlPayload | null;
  const sessionIdForUsage = typeof payload?.sessionId === 'string' ? payload.sessionId : undefined;

  try {
    const limited = await enforceUsageCap(request, sessionIdForUsage);
    if (limited) return limited;
  } catch (err) {
    console.warn('[analyze/url] Usage cap check failed, allowing request:', err);
  }

  if (!isTikTokDownloaderAvailable()) {
    return Response.json(
      { error: 'Public TikTok URL analysis is not available on this deployment right now.' },
      { status: 503 },
    );
  }

  if (!payload?.platformUrl || typeof payload.platformUrl !== 'string') {
    return Response.json({ error: 'platformUrl is required' }, { status: 400 });
  }

  try {
    const usageContext = await resolveUsageContext(request, sessionIdForUsage);
    const { normalizedUrl } = normalizeTikTokVideoUrl(payload.platformUrl);
    const linkedRoastId = typeof payload.linkedRoastId === 'string' && payload.linkedRoastId.trim().length > 0
      ? payload.linkedRoastId.trim()
      : null;

    if (linkedRoastId) {
      let linkedQuery = supabaseServer
        .from('rmt_roast_sessions')
        .select('id, analysis_status')
        .eq('id', linkedRoastId)
        .limit(1);

      if (usageContext.userId) {
        linkedQuery = linkedQuery.eq('user_id', usageContext.userId);
      } else if (usageContext.sessionId) {
        linkedQuery = linkedQuery.eq('session_id', usageContext.sessionId);
      } else {
        linkedQuery = linkedQuery.eq('client_ip', usageContext.clientIp);
      }

      const { data: linkedRoast, error: linkedError } = await linkedQuery.maybeSingle();

      if (linkedError || !linkedRoast) {
        return Response.json({ error: 'Linked roast not found for this account.' }, { status: 404 });
      }
    }

    const id = uuidv4();
    const { error: insertError } = await supabaseServer.from('rmt_roast_sessions').insert({
      id,
      session_id: usageContext.sessionId ?? 'anonymous',
      user_id: usageContext.userId,
      client_ip: usageContext.clientIp,
      source: 'url',
      analysis_intent: 'post_post',
      platform: 'tiktok',
      platform_url: normalizedUrl,
      tiktok_url: normalizedUrl,
      linked_roast_id: linkedRoastId,
      analysis_status: 'pending',
      overall_score: 0,
      verdict: '',
      agent_scores: {},
      findings: {},
    });

    if (insertError) {
      console.error('[analyze/url] Session insert failed:', insertError.message, insertError.details);
      return Response.json({ error: 'Failed to create analysis session' }, { status: 500 });
    }

    return Response.json({
      id,
      platform: 'tiktok',
      platformUrl: normalizedUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process TikTok URL.';
    const status = message.includes('TikTok') || message.includes('valid') ? 400 : 500;
    console.error('[analyze/url] Error:', error);
    return Response.json({ error: message }, { status });
  }
}
