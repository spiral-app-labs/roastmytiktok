import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServer } from '@/lib/supabase-server';
import { execFile } from 'child_process';
import { promisify } from 'util';

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

interface AccountAnalysis {
  handle: string;
  totalVideos: number;
  avgViews: number;
  topPerformingFormats: Array<{ format: string; avgViews: number; examples: string[] }>;
  worstPerformingFormats: Array<{ format: string; avgViews: number; why: string }>;
  recurringWeaknesses: string[];
  strengths: string[];
  nicheAnalysis: string;
  nextVideoIdeas: Array<{ hook: string; format: string; why: string }>;
  overallVerdict: string;
}

async function fetchVideos(handle: string): Promise<TikTokVideo[]> {
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

  return entries.map((e: Record<string, unknown>) => ({
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
  }));
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const handle = (body.handle as string)?.trim()?.replace(/^@/, '');

    if (!handle) {
      return Response.json({ error: 'Handle is required' }, { status: 400 });
    }

    // Fetch videos via yt-dlp
    let videos: TikTokVideo[];
    try {
      videos = await fetchVideos(handle);
    } catch (err) {
      console.error('[analyze-account] yt-dlp error:', err);
      return Response.json(
        { error: `Could not fetch videos for @${handle}. Make sure the account is public and the handle is correct.` },
        { status: 422 }
      );
    }

    if (videos.length === 0) {
      return Response.json(
        { error: `No videos found for @${handle}.` },
        { status: 404 }
      );
    }

    const videoSummary = buildVideoSummary(videos);
    const avgViews = Math.round(
      videos.reduce((sum, v) => sum + v.view_count, 0) / videos.length
    );

    // Run Claude analysis
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `You are analyzing a TikTok creator's content history. Here are their last ${videos.length} videos with performance data:

${videoSummary}

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
  "nextVideoIdeas": [{"hook": "string", "format": "string", "why": "string"}],
  "overallVerdict": "string"
}

Rules:
- topPerformingFormats: 2-4 content formats that get the most views. Group by pattern (e.g. "dance trend", "storytime", "POV skit"). Include 1-2 example descriptions.
- worstPerformingFormats: 2-3 formats that underperform relative to their average. Explain why.
- recurringWeaknesses: 3-5 specific, actionable weaknesses you see across multiple videos.
- strengths: 3-5 things this creator does well consistently.
- nicheAnalysis: 2-3 sentences on their niche positioning and audience.
- nextVideoIdeas: 5 specific video ideas with hook text they could film tomorrow. Make them specific to THIS creator's style and strengths.
- overallVerdict: 2-3 sentence blunt assessment. Be honest but constructive. Reference specific data.`;

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
      analysis = JSON.parse(jsonStr);
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
