import { supabaseServer } from '@/lib/supabase-server';

export interface TrendingContext {
  trendingSounds: Array<{ name: string; status: string; velocity: number }>;
  trendingFormats: Array<{ name: string; status: string }>;
  trendingHashtags: Array<{ name: string; velocity: number }>;
  relevantTips: Array<{ category: string; tip: string; relevance: number }>;
}

// Simple in-memory cache: { data, expiry }
let cache: { data: TrendingContext; expiry: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchTrendingContext(): Promise<TrendingContext> {
  if (cache && Date.now() < cache.expiry) {
    return cache.data;
  }

  const empty: TrendingContext = {
    trendingSounds: [],
    trendingFormats: [],
    trendingHashtags: [],
    relevantTips: [],
  };

  try {
    const [soundsRes, formatsRes, hashtagsRes, tipsRes] = await Promise.all([
      supabaseServer
        .from('rmt_trending_content')
        .select('name, status, velocity')
        .eq('type', 'sound')
        .neq('status', 'dead')
        .order('velocity', { ascending: false })
        .limit(10),
      supabaseServer
        .from('rmt_trending_content')
        .select('name, status')
        .eq('type', 'format')
        .neq('status', 'dead')
        .order('velocity', { ascending: false })
        .limit(10),
      supabaseServer
        .from('rmt_trending_content')
        .select('name, velocity')
        .eq('type', 'hashtag')
        .neq('status', 'dead')
        .order('velocity', { ascending: false })
        .limit(10),
      supabaseServer
        .from('rmt_viral_tips')
        .select('category, tip_text, relevance_score')
        .eq('active', true)
        .order('relevance_score', { ascending: false })
        .limit(15),
    ]);

    const result: TrendingContext = {
      trendingSounds: (soundsRes.data ?? []) as TrendingContext['trendingSounds'],
      trendingFormats: (formatsRes.data ?? []) as TrendingContext['trendingFormats'],
      trendingHashtags: (hashtagsRes.data ?? []) as TrendingContext['trendingHashtags'],
      relevantTips: (tipsRes.data ?? []).map((t: { category: string; tip_text: string; relevance_score: number }) => ({
        category: t.category,
        tip: t.tip_text,
        relevance: t.relevance_score,
      })),
    };

    cache = { data: result, expiry: Date.now() + CACHE_TTL_MS };
    return result;
  } catch (err) {
    console.warn('[trending-context] Failed to fetch trending data:', err);
    return empty;
  }
}

export function buildTrendingPromptSection(ctx: TrendingContext): string {
  const parts: string[] = [];

  if (ctx.trendingSounds.length > 0) {
    const lines = ctx.trendingSounds.map(
      (s) => `- "${s.name}" (${s.status}, velocity ${s.velocity}/100)`
    );
    parts.push(`**Trending Sounds:**\n${lines.join('\n')}`);
  }

  if (ctx.trendingFormats.length > 0) {
    const lines = ctx.trendingFormats.map(
      (f) => `- ${f.name} (${f.status})`
    );
    parts.push(`**Trending Formats:**\n${lines.join('\n')}`);
  }

  if (ctx.trendingHashtags.length > 0) {
    const lines = ctx.trendingHashtags.map(
      (h) => `- #${h.name} (velocity ${h.velocity}/100)`
    );
    parts.push(`**Trending Hashtags:**\n${lines.join('\n')}`);
  }

  if (parts.length === 0) return '';

  return `\n\nCURRENT TRENDS (use these to give timely, relevant advice):\n${parts.join('\n\n')}`;
}

export function buildAgentTrendingContext(
  ctx: TrendingContext,
  agent: string
): string {
  if (isEmpty(ctx)) return '';

  const base = buildTrendingPromptSection(ctx);

  // Agent-specific trending guidance
  switch (agent) {
    case 'audio': {
      const deadSounds = ctx.trendingSounds.filter((s) => s.status === 'declining');
      const emergingSounds = ctx.trendingSounds.filter((s) => s.status === 'emerging');
      let audioExtra = '';
      if (emergingSounds.length > 0) {
        audioExtra += `\n\nEMERGING SOUNDS to watch: ${emergingSounds.map((s) => `"${s.name}"`).join(', ')}. If the creator uses one of these, call it out as a smart move — early adoption gets algorithmic boost.`;
      }
      if (deadSounds.length > 0) {
        audioExtra += `\nDECLINING SOUNDS: ${deadSounds.map((s) => `"${s.name}"`).join(', ')}. If the creator uses one of these, warn them — the algorithm deprioritizes oversaturated sounds.`;
      }
      return base + audioExtra;
    }
    case 'conversion': {
      let algoExtra = '';
      if (ctx.trendingFormats.length > 0) {
        const emerging = ctx.trendingFormats.filter((f) => f.status === 'emerging');
        if (emerging.length > 0) {
          algoExtra += `\n\nEMERGING FORMATS getting algorithmic push: ${emerging.map((f) => f.name).join(', ')}. If the video uses one of these formats, it has a distribution advantage — note it.`;
        }
      }
      return base + algoExtra;
    }
    case 'hook': {
      const tips = ctx.relevantTips.filter((t) => t.category === 'hook');
      let hookExtra = '';
      if (tips.length > 0) {
        hookExtra += `\n\nCURRENT HOOK TIPS:\n${tips.slice(0, 3).map((t) => `- ${t.tip}`).join('\n')}`;
      }
      return base + hookExtra;
    }
    default:
      return base;
  }
}

export function buildScriptTrendingContext(ctx: TrendingContext): string {
  if (isEmpty(ctx)) return '';

  const parts: string[] = [];

  if (ctx.trendingSounds.length > 0) {
    const emerging = ctx.trendingSounds.filter((s) => s.status === 'emerging' || s.status === 'peak');
    if (emerging.length > 0) {
      parts.push(`**Trending Sounds (consider using one):**\n${emerging.map((s) => `- "${s.name}" (${s.status})`).join('\n')}`);
    }
  }

  if (ctx.trendingFormats.length > 0) {
    parts.push(`**Trending Formats:**\n${ctx.trendingFormats.map((f) => `- ${f.name} (${f.status})`).join('\n')}`);
  }

  if (ctx.trendingHashtags.length > 0) {
    parts.push(`**Trending Hashtags (incorporate if relevant):**\n${ctx.trendingHashtags.map((h) => `- #${h.name}`).join('\n')}`);
  }

  const tips = ctx.relevantTips.filter((t) => t.category !== 'general').slice(0, 5);
  if (tips.length > 0) {
    parts.push(`**Viral Tips:**\n${tips.map((t) => `- [${t.category}] ${t.tip}`).join('\n')}`);
  }

  if (parts.length === 0) return '';

  return `\n\nCURRENT TRENDING CONTENT — incorporate these into the script where relevant:\n${parts.join('\n\n')}`;
}

function isEmpty(ctx: TrendingContext): boolean {
  return (
    ctx.trendingSounds.length === 0 &&
    ctx.trendingFormats.length === 0 &&
    ctx.trendingHashtags.length === 0 &&
    ctx.relevantTips.length === 0
  );
}
