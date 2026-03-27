import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractFrames } from '@/lib/frame-extractor';
import { supabaseServer } from '@/lib/supabase-server';
import { existsSync, readdirSync, unlinkSync } from 'fs';
import { DimensionKey } from '@/lib/types';

export const maxDuration = 120; // allow up to 2 min for analysis

const AGENT_PROMPTS: Record<DimensionKey, { name: string; prompt: string }> = {
  hook: {
    name: 'HookReaper',
    prompt: `You are HookReaper, a brutal TikTok hook analyzer. Analyze the opening frames of this video (first 3 seconds worth of frames). Score the hook 0-100 based on: visual grab in frame 1, movement/energy, text overlays present, speaking start timing. Be savage, funny, and specific in your roast. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  visual: {
    name: 'VibeCheck',
    prompt: `You are VibeCheck, a cinematography critic who went to film school and isn't afraid to use it against you. Analyze the visual quality: lighting (face illumination, shadows), composition, background clutter, color grading, camera angle, stability, production value. Score 0-100. Be savage, funny, and specific. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  caption: {
    name: 'CaptionCritic',
    prompt: `You are CaptionCritic. Analyze on-screen text, captions, readability, text placement, CTA presence, hashtag usage (describe what you see or infer). Score 0-100. Be savage, funny, and specific. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  audio: {
    name: 'AudioAutopsy',
    prompt: `You are AudioAutopsy. Based on what you can see in the video frames (mouth movement, environment, any visible audio equipment, captions/subtitles), infer the likely audio quality: background noise potential, voice clarity indicators, music/sound choice clues, mixing quality. Score 0-100. Be savage, funny, and specific. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  algorithm: {
    name: 'AlgoOracle',
    prompt: `You are AlgoOracle. Analyze TikTok algorithm fit based on what you see: posting cues, hashtag strategy visible on screen, trend alignment, engagement bait, FYP optimization signals, retention curve prediction based on visual pacing. Score 0-100. Be savage, funny, and specific. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  authenticity: {
    name: 'AuthenticityAudit',
    prompt: `You are AuthenticityAudit. Analyze genuine connection: personality showing through, relatability, scripted vs natural delivery (visible in body language/expressions), emotional resonance, niche clarity, creator POV strength. Score 0-100. Be savage, funny, and specific. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
};

const DIMENSION_ORDER: DimensionKey[] = ['hook', 'visual', 'caption', 'audio', 'algorithm', 'authenticity'];
const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  hook: 0.25,
  visual: 0.20,
  caption: 0.10,
  audio: 0.15,
  algorithm: 0.15,
  authenticity: 0.15,
};

function parseAgentResponse(text: string): { score: number; roastText: string; findings: string[]; improvementTip: string } {
  // Try to extract JSON from the response (handle markdown code blocks)
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  // Also try to find JSON object directly
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);
  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    roastText: parsed.roastText || 'No roast text generated.',
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    improvementTip: parsed.improvementTip || 'Try harder next time.',
  };
}

async function fetchTrendingContext(): Promise<string> {
  try {
    const { data } = await supabaseServer
      .from('tmt_trending_content')
      .select('hook_text, view_count, duration_sec, audio_title')
      .gte('fetched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('fetched_at', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return '';

    const examples = data
      .filter((r: { hook_text: string | null }) => r.hook_text)
      .slice(0, 5)
      .map((r: { hook_text: string; view_count: number | null; duration_sec: number | null; audio_title: string | null }) =>
        `- Hook: "${r.hook_text}" | Views: ${r.view_count?.toLocaleString() ?? 'N/A'} | Duration: ${r.duration_sec ?? 'N/A'}s | Audio: "${r.audio_title ?? 'N/A'}"`)
      .join('\n');

    if (!examples) return '';

    return `\n\nCurrently trending TikTok content (last 24h):\n${examples}\n\nUse this trending context to make your roast more relevant — compare their content to what's actually working right now.`;
  } catch (err) {
    console.warn('[analyze] Failed to fetch trending context:', err);
    return '';
  }
}

interface ChronicIssueForPrompt {
  dimension: string;
  finding: string;
  count: number;
}

async function fetchChronicIssues(sessionId: string): Promise<ChronicIssueForPrompt[]> {
  if (!sessionId || sessionId === 'server') return [];

  try {
    const { data, error } = await supabaseServer
      .from('rmt_roast_sessions')
      .select('findings')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data || data.length < 2) return [];

    // Count finding occurrences across all previous roasts
    const issueCounts: Record<string, { count: number; dimension: string; finding: string }> = {};

    for (const row of data) {
      const findings = row.findings as Record<string, string[]> | null;
      if (!findings) continue;

      for (const [dim, items] of Object.entries(findings)) {
        for (const finding of items) {
          const key = `${dim}::${finding.slice(0, 40).toLowerCase()}`;
          if (!issueCounts[key]) {
            issueCounts[key] = { count: 0, dimension: dim, finding };
          }
          issueCounts[key].count++;
        }
      }
    }

    return Object.values(issueCounts)
      .filter(i => i.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  } catch (err) {
    console.warn('[analyze] Failed to fetch chronic issues:', err);
    return [];
  }
}

function buildEscalationContext(chronicIssues: ChronicIssueForPrompt[], dimension: DimensionKey): string {
  if (chronicIssues.length === 0) return '';

  // Filter for issues relevant to this dimension, plus overall context
  const dimIssues = chronicIssues.filter(i => i.dimension === dimension);
  const otherIssues = chronicIssues.filter(i => i.dimension !== dimension).slice(0, 3);

  if (dimIssues.length === 0 && otherIssues.length === 0) return '';

  let context = '\n\nIMPORTANT: This user has been roasted before. Previous roasts flagged these recurring issues:\n';

  for (const issue of dimIssues) {
    context += `- [YOUR DIMENSION - ${issue.dimension}] "${issue.finding}" (flagged ${issue.count} times) — ESCALATE your roast on this. No mercy.\n`;
  }

  for (const issue of otherIssues) {
    context += `- [${issue.dimension}] "${issue.finding}" (flagged ${issue.count} times)\n`;
  }

  context += '\nEscalate intensity for repeat issues. Reference that you\'ve told them before. Be disappointed, not just savage. Make them feel the weight of not listening.';

  return context;
}

export async function GET(req: NextRequest, ctx: RouteContext<'/api/analyze/[id]'>) {
  const { id } = await ctx.params;

  // Extract session_id from query params
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? 'server';

  // Find the video file in /tmp
  const tmpFiles = readdirSync('/tmp').filter(f => f.startsWith(`rmt-${id}.`));
  if (tmpFiles.length === 0) {
    return Response.json({ error: 'Video not found. It may have expired.' }, { status: 404 });
  }
  const videoPath = `/tmp/${tmpFiles[0]}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Fetch trending context and chronic issues in parallel with frame extraction
        const trendingContextPromise = fetchTrendingContext();
        const chronicIssuesPromise = fetchChronicIssues(sessionId);

        // Extract frames
        send({ type: 'status', message: 'Extracting frames...' });
        let frames: string[] = [];
        try {
          frames = extractFrames(videoPath, 8);
        } catch (err) {
          console.error('[analyze] Frame extraction failed:', err);
          send({ type: 'status', message: 'Frame extraction limited, running text-based analysis...' });
        }

        if (frames.length === 0) {
          // Fallback: still run analysis but note limited visual data
          send({ type: 'status', message: 'No frames extracted. Analysis will be limited.' });
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const agentResults: Record<string, { score: number; roastText: string; findings: string[]; improvementTip: string }> = {};
        const trendingContext = await trendingContextPromise;
        const chronicIssues = await chronicIssuesPromise;

        if (chronicIssues.length > 0) {
          send({ type: 'status', message: 'Repeat offender detected. Escalating intensity...' });
        }

        // Run each agent sequentially
        for (const dimension of DIMENSION_ORDER) {
          const { name, prompt } = AGENT_PROMPTS[dimension];
          send({ type: 'agent', agent: dimension, status: 'analyzing', name });

          try {
            const imageContent = frames.map(data => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: 'image/jpeg' as const,
                data,
              },
            }));

            const escalationContext = buildEscalationContext(chronicIssues, dimension);
            const fullPrompt = prompt + trendingContext + escalationContext;

            const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-5-20250514',
              max_tokens: 1024,
              messages: [{
                role: 'user',
                content: [
                  ...imageContent,
                  { type: 'text' as const, text: fullPrompt },
                ],
              }],
            });

            const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
            const result = parseAgentResponse(responseText);
            agentResults[dimension] = result;

            send({
              type: 'agent',
              agent: dimension,
              status: 'done',
              name,
              result: { agent: dimension, ...result },
            });
          } catch (err) {
            console.error(`[analyze] Agent ${dimension} failed:`, err);
            const fallback = {
              score: 50,
              roastText: `${name} encountered an error analyzing this dimension. Consider yourself lucky.`,
              findings: ['Analysis error — could not fully evaluate this dimension'],
              improvementTip: 'Try uploading again for a complete analysis.',
            };
            agentResults[dimension] = fallback;
            send({
              type: 'agent',
              agent: dimension,
              status: 'done',
              name,
              result: { agent: dimension, ...fallback },
            });
          }
        }

        // Calculate weighted overall score
        let overallScore = 0;
        for (const dim of DIMENSION_ORDER) {
          overallScore += (agentResults[dim]?.score ?? 50) * DIMENSION_WEIGHTS[dim];
        }
        overallScore = Math.round(overallScore);

        // Generate verdict
        let verdict: string;
        try {
          const repeatContext = chronicIssues.length > 0
            ? `\n\nThis is a REPEAT OFFENDER. They've been roasted ${chronicIssues.length > 3 ? 'many' : 'a few'} times before and keep making the same mistakes. Reference this in the verdict. Be extra disappointed.`
            : '';

          const verdictResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250514',
            max_tokens: 300,
            messages: [{
              role: 'user',
              content: `You are a brutal TikTok roast machine. Given these agent scores and roasts for a video, write a 2-3 sentence savage overall verdict. Be funny and specific.

Scores: ${JSON.stringify(Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d]?.score])))}
Agent summaries: ${DIMENSION_ORDER.map(d => `${d}: ${agentResults[d]?.roastText}`).join('\n')}${repeatContext}

Write ONLY the verdict text, no JSON, no quotes.`,
            }],
          });
          verdict = verdictResponse.content[0].type === 'text'
            ? verdictResponse.content[0].text
            : 'Your video exists. That is the nicest thing we can say about it.';
        } catch {
          verdict = 'Your video exists. That is the nicest thing we can say about it.';
        }

        // Build full result
        const result = {
          id,
          tiktokUrl: '',
          overallScore,
          verdict,
          agents: DIMENSION_ORDER.map(dim => ({
            agent: dim,
            score: agentResults[dim].score,
            roastText: agentResults[dim].roastText,
            findings: agentResults[dim].findings,
            improvementTip: agentResults[dim].improvementTip,
          })),
          metadata: {
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            duration: 0,
            hashtags: [],
            description: 'Uploaded video',
          },
        };

        send({ type: 'verdict', overallScore, verdict });

        // Store in Supabase (best-effort)
        try {
          const agentScores = Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d].score]));
          const findings = Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d].findings]));

          await supabaseServer.from('rmt_roast_sessions').upsert({
            id,
            session_id: sessionId,
            source: 'upload',
            overall_score: overallScore,
            verdict,
            agent_scores: agentScores,
            findings,
            result_json: result,
          });
        } catch (err) {
          console.warn('[analyze] Supabase save failed:', err);
        }

        send({ type: 'done', id });
      } catch (err) {
        console.error('[analyze] Stream error:', err);
        send({ type: 'error', message: 'Analysis failed. Please try again.' });
      } finally {
        // Clean up temp video
        try {
          if (existsSync(videoPath)) unlinkSync(videoPath);
        } catch { /* ignore cleanup errors */ }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
