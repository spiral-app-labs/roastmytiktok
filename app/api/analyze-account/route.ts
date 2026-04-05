import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServer } from '@/lib/supabase-server';
import { buildBenchmarkPromptSection } from '@/lib/engagement-benchmarks';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { buildCreatorDeltaPromptSection } from '@/lib/creator-delta-analysis';
import { detectNiche } from '@/lib/niche-detect';

const execFileAsync = promisify(execFile);

interface TikTokVideo {
  id: string;
  title: string;
  description: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration: number;
  timestamp: number;
  track?: string;
  artists?: string[];
}

interface CreatorDeltaPoint {
  factor: string;
  evidence: string;
  impact: string;
}

interface AccountAnalysis {
  handle: string;
  totalVideos: number;
  avgViews: number;
  topPerformingFormats: Array<{ format: string; avgViews: number; examples: string[] }>;
  worstPerformingFormats: Array<{ format: string; avgViews: number; why: string }>;
  recurringWeaknesses: string[];
  strengths: string[];
  nicheAnalysis: string;
  creatorDelta: {
    topSuccessFactors: CreatorDeltaPoint[];
    topViewKillers: CreatorDeltaPoint[];
    exampleComparison: {
      winnerLabel: string;
      winnerViews: number;
      loserLabel: string;
      loserViews: number;
      whyWinnerWon: string;
      successFactors: string[];
      viewKillers: string[];
    };
  };
  nextVideoIdeas: Array<{ hook: string; format: string; why: string }>;
  overallVerdict: string;
}

async function fetchVideos(handle: string): Promise<{ followerCount: number | undefined; videos: TikTokVideo[] }> {
  const cleanHandle = handle.replace(/^@/, '');

  const { stdout } = await execFileAsync(
    'yt-dlp',
    [
      '--flat-playlist',
      '--dump-single-json',
      '--playlist-end', '30',
      `https://www.tiktok.com/@${cleanHandle}`,
    ],
    { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 }
  );

  const data = JSON.parse(stdout);
  const entries = data.entries || [];
  const followerCount = typeof data.channel_follower_count === 'number'
    ? data.channel_follower_count
    : undefined;

  return { followerCount, videos: entries.map((e: Record<string, unknown>) => ({
    id: e.id as string,
    title: (e.title as string) || '',
    description: (e.description as string) || '',
    view_count: (e.view_count as number) || 0,
    like_count: (e.like_count as number) || 0,
    comment_count: (e.comment_count as number) || 0,
    duration: (e.duration as number) || 0,
    timestamp: (e.timestamp as number) || 0,
    track: (e.track as string) || undefined,
    artists: (e.artists as string[]) || undefined,
  })) };
}

function buildVideoSummary(videos: TikTokVideo[]): string {
  return videos
    .map((v, i) => {
      const date = v.timestamp
        ? new Date(v.timestamp * 1000).toISOString().split('T')[0]
        : 'unknown';
      const engagement = v.view_count > 0
        ? ((v.like_count / v.view_count) * 100).toFixed(1)
        : '0';
      const sound = v.track
        ? `Sound: "${v.track}"${v.artists?.length ? ` by ${v.artists.join(', ')}` : ''}`
        : 'No sound info';

      return [
        `#${i + 1} — ${date}`,
        `  Description: ${v.description || v.title || '(no caption)'}`,
        `  Views: ${v.view_count.toLocaleString()} | Likes: ${v.like_count.toLocaleString()} | Comments: ${v.comment_count.toLocaleString()} | Engagement: ${engagement}%`,
        `  Duration: ${v.duration}s | ${sound}`,
      ].join('\n');
    })
    .join('\n\n');
}

function normalizePoints(points: unknown): CreatorDeltaPoint[] {
  if (!Array.isArray(points)) return [];
  return points
    .map((point) => {
      if (!point || typeof point !== 'object') return null;
      const candidate = point as Record<string, unknown>;
      if (typeof candidate.factor !== 'string' || typeof candidate.evidence !== 'string' || typeof candidate.impact !== 'string') {
        return null;
      }
      return {
        factor: candidate.factor.trim(),
        evidence: candidate.evidence.trim(),
        impact: candidate.impact.trim(),
      };
    })
    .filter((point): point is CreatorDeltaPoint => Boolean(point?.factor && point?.evidence && point?.impact))
    .slice(0, 3);
}

function normalizeAccountAnalysis(input: unknown): AccountAnalysis | null {
  if (!input || typeof input !== 'object') return null;
  const analysis = input as Record<string, unknown>;
  const creatorDelta = analysis.creatorDelta as Record<string, unknown> | undefined;
  const exampleComparison = creatorDelta?.exampleComparison as Record<string, unknown> | undefined;
  const topSuccessFactors = normalizePoints(creatorDelta?.topSuccessFactors);
  const topViewKillers = normalizePoints(creatorDelta?.topViewKillers);

  if (
    !creatorDelta ||
    !exampleComparison ||
    topSuccessFactors.length < 3 ||
    topViewKillers.length < 3 ||
    typeof exampleComparison.winnerLabel !== 'string' ||
    typeof exampleComparison.winnerViews !== 'number' ||
    typeof exampleComparison.loserLabel !== 'string' ||
    typeof exampleComparison.loserViews !== 'number' ||
    typeof exampleComparison.whyWinnerWon !== 'string' ||
    !Array.isArray(exampleComparison.successFactors) ||
    !Array.isArray(exampleComparison.viewKillers)
  ) {
    return null;
  }

  const base = analysis as unknown as AccountAnalysis;

  return {
    ...base,
    creatorDelta: {
      topSuccessFactors,
      topViewKillers,
      exampleComparison: {
        winnerLabel: exampleComparison.winnerLabel.trim(),
        winnerViews: exampleComparison.winnerViews,
        loserLabel: exampleComparison.loserLabel.trim(),
        loserViews: exampleComparison.loserViews,
        whyWinnerWon: exampleComparison.whyWinnerWon.trim(),
        successFactors: exampleComparison.successFactors.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 3),
        viewKillers: exampleComparison.viewKillers.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 3),
      },
    },
  };
}

export const maxDuration = 120; // allow up to 2 min for yt-dlp + AI analysis

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const handle = (body.handle as string)?.trim()?.replace(/^@/, '');

    if (!handle) {
      return Response.json({ error: 'Handle is required' }, { status: 400 });
    }

    // Fetch videos via yt-dlp
    let videos: TikTokVideo[];
    let followerCount: number | undefined;
    try {
      const result = await fetchVideos(handle);
      videos = result.videos;
      followerCount = result.followerCount;
    } catch (err) {
      console.error('[analyze-account] yt-dlp error:', err);
      const errMsg = err instanceof Error ? err.message : String(err)
      const isPrivate = errMsg.toLowerCase().includes('private') || errMsg.toLowerCase().includes('login required') || errMsg.toLowerCase().includes('403')
      const isNotFound = errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('404') || errMsg.toLowerCase().includes('does not exist')
      const errorText = isPrivate
        ? `@${handle} appears to be a private account. This tool only works with public TikTok accounts.`
        : isNotFound
        ? `@${handle} doesn't exist on TikTok. Double-check the handle and try again.`
        : `Could not fetch videos for @${handle}. Make sure the account is public and the handle is correct.`
      return Response.json({ error: errorText }, { status: 422 })
    }

    if (videos.length === 0) {
      return Response.json(
        { error: `No public videos found for @${handle}. The account may be private or have no posts.` },
        { status: 404 }
      );
    }

    const videoSummary = buildVideoSummary(videos);
    const avgViews = Math.round(
      videos.reduce((sum, v) => sum + v.view_count, 0) / videos.length
    );

    // Run Claude analysis
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const benchmarkSection = buildBenchmarkPromptSection(followerCount, videos);
    const creatorDeltaSection = buildCreatorDeltaPromptSection(videos);
    const accountNiche = detectNiche({
      caption: videos.map((v) => v.description || v.title).join(' '),
      hashtags: videos.flatMap((v) => {
        const source = `${v.description || ''} ${v.title || ''}`;
        return Array.from(source.matchAll(/#([a-z0-9_\.]+)/gi)).map((match) => match[1].toLowerCase());
      }),
      transcript: videos.map((v) => v.track || '').join(' '),
      audioType: videos.some((v) => v.track) ? 'music' : 'none',
    });
    const nicheAuditSection = `
**NICHE DETECTION AUDIT — use this as a grounding hint, not a blind rule:**
- Deterministic niche guess from captions/hashtags: ${accountNiche.niche}${accountNiche.subNiche ? ` (${accountNiche.subNiche})` : ''}
- Confidence: ${accountNiche.confidence}
- Signals found: ${accountNiche.signals.join(', ') || 'none'}
- If the account content clearly points elsewhere, override this and explain why. Do not force a niche that the evidence does not support.`;

    const prompt = `You are a TikTok growth strategist who's grown 5+ accounts past 100K. You're analyzing @${handle}'s content history with the precision of a data scientist and the bluntness of a best friend. Here are their last ${videos.length} videos with performance data:

${videoSummary}

ANALYSIS FRAMEWORK — use these benchmarks to evaluate:

${benchmarkSection}

${nicheAuditSection}

${creatorDeltaSection}

**Format Virality Rankings** (compare their formats against this):
1. Educational/Tutorial — highest save + share potential
2. Storytelling — deep emotional connection, high comments
3. POV Videos — instant immersion, shareable in-group content
4. Duet/Stitch — piggybacks existing viral momentum
5. Before/After — visual satisfaction, proves results
6. Trend Participation — leverages algorithmic push
7. Talking Head — builds authority, personality-dependent
8. Day-in-the-Life — parasocial connection, aspirational
9. Green Screen — contextual commentary
10. Reaction Videos — shared emotional experience

**Hook Effectiveness Tiers:**
- Tier 1 (best): Direct address/call-out, curiosity gap, problem-solution promise, visual pattern interrupt
- Tier 2 (strong): Shocking statement, POV setup, trending sound opening
- Tier 3 (situational): Countdown/listicle, before/after tease

**Optimal Length by Niche:**
- Comedy: 7-20s (quick punchline)
- Education/Tutorial: 30-60s (teach without padding)
- Fitness: 15-45s (show the exercise, not the warm-up)
- Food/Cooking: 30-90s (speed up prep, slow down the money shot)
- Storytelling: 60-180s (hook in first 3s, midpoint twist at 30-40%)

**What Separates 100K from 1M+ Views:**
- Completion rate >50% on 30s+ videos
- Comment-to-view ratio >0.5%
- Share-to-view ratio >0.3%
- Replay value + share trigger + comment debate fuel

Analyze patterns and return ONLY valid JSON (no markdown, no explanation) matching this schema exactly:
{
  "handle": "${handle}",
  "totalVideos": ${videos.length},
  "avgViews": ${avgViews},
  "topPerformingFormats": [{"format": "string", "avgViews": number, "examples": ["string"]}],
  "worstPerformingFormats": [{"format": "string", "avgViews": number, "why": "string"}],
  "recurringWeaknesses": ["string"],
  "strengths": ["string"],
  "nicheAnalysis": "string",
  "creatorDelta": {
    "topSuccessFactors": [{"factor": "string", "evidence": "string", "impact": "string"}],
    "topViewKillers": [{"factor": "string", "evidence": "string", "impact": "string"}],
    "exampleComparison": {
      "winnerLabel": "string",
      "winnerViews": number,
      "loserLabel": "string",
      "loserViews": number,
      "whyWinnerWon": "string",
      "successFactors": ["string"],
      "viewKillers": ["string"]
    }
  },
  "nextVideoIdeas": [{"hook": "string", "format": "string", "why": "string"}],
  "overallVerdict": "string"
}

Rules:
- topPerformingFormats: 2-4 content formats that get the most views. Group by pattern (e.g. "educational tutorial", "storytime", "POV skit"). Include 1-2 example descriptions. Compare against the format virality rankings above — are they using high-rank or low-rank formats?
- worstPerformingFormats: 2-3 formats that underperform relative to their average. Explain WHY using specific data (e.g. "your talking head videos average Xk views vs your tutorial videos at Xk — talking head is rank #7 for virality and requires strong personality to carry").
- recurringWeaknesses: 3-5 specific, actionable weaknesses. Not "improve your hooks" — instead "your hooks are mostly Tier 3 countdown/listicle style which ranks #8 in effectiveness — try direct address hooks like 'If you [specific trait], stop scrolling'". Reference the actual data.
- strengths: 3-5 things this creator does well. Be specific — name the videos, the formats, the patterns.
- nicheAnalysis: 2-3 sentences on niche positioning. Identify their primary niche from the taxonomy (Comedy, Education, Lifestyle, Fitness, Beauty, Tech, Food, Finance, Travel, Gaming, Parenting, Fashion, Pets, DIY, Music). Audit the niche guess against the captions/hashtags above, say whether the niche is clear enough for the algorithm to categorize them, and compare their engagement rate against the benchmark for their follower tier.
- creatorDelta.topSuccessFactors: exactly 3 factors that appear disproportionately in the winner cluster versus the loser cluster. Each factor must use this creator's own posts as evidence, not generic advice.
- creatorDelta.topViewKillers: exactly 3 factors that show up in the loser cluster and suppress views. Again, evidence must come from this creator's own history.
- creatorDelta.exampleComparison: use the provided top winner example and top loser example. winnerLabel and loserLabel should be short plain-English descriptions of those specific posts. whyWinnerWon should directly explain why the winner beat the loser. successFactors and viewKillers should each contain 2-3 bullets tied to that exact comparison.
- nextVideoIdeas: 5 specific video ideas with EXACT hook text they could film tomorrow. Each hook should be Tier 1 or Tier 2 from the hook taxonomy. Match the format to their strengths. Match the length to their niche. Explain why each idea would outperform their current content.
- overallVerdict: 2-3 sentence blunt, specific assessment. Reference their actual numbers. Use median views as the creator's baseline and call out if average views are inflated by spikes. Tell them exactly where they'd stall in the algorithm distribution phases (test → validation → acceleration → viral) and what's holding them back. Sound like a growth expert friend giving real talk, not a corporate consultant.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => {
        if (b.type === 'text') return b.text;
        return '';
      })
      .join('');

    // Strip markdown code fences if present
    const jsonStr = rawText.replace(/```json?\s*/g, '').replace(/```\s*/g, '').trim();
    let analysis: AccountAnalysis;
    try {
      const parsed = JSON.parse(jsonStr);
      const normalized = normalizeAccountAnalysis(parsed);
      if (!normalized) {
        console.error('[analyze-account] Missing creator delta payload:', rawText.slice(0, 700));
        return Response.json({ error: 'Analysis failed — creator delta comparison came back incomplete.' }, { status: 500 });
      }
      analysis = normalized;
    } catch {
      console.error('[analyze-account] Failed to parse Claude response:', rawText.slice(0, 500));
      return Response.json({ error: 'Analysis failed — could not parse AI response.' }, { status: 500 });
    }

    // Store in Supabase
    try {
      await supabaseServer.from('rmt_account_analyses').insert({
        handle,
        video_count: videos.length,
        result_json: analysis,
      });
    } catch (err) {
      console.warn('[analyze-account] DB insert failed:', err);
    }

    return Response.json({ handle, analysis, videos: videos.length });
  } catch (err) {
    console.error('[analyze-account] Unexpected error:', err);
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
