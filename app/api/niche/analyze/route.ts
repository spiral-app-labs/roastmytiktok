import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuthenticatedAiAccess } from '@/lib/ai-access';
import { createServiceClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_INSPIRATION_CREATORS = 3;
const SCRAPE_TIMEOUT_MS = 5000;
const SCRAPE_TOTAL_BUDGET_MS = 12000;

interface CreatorMetadata {
  handle: string;
  videos: Array<{
    caption: string;
    hashtags: string[];
    views?: number;
    likes?: number;
  }>;
}

async function scrapeCreatorMetadata(handle: string, timeoutMs = SCRAPE_TIMEOUT_MS): Promise<CreatorMetadata> {
  const cleanHandle = handle.replace(/^@/, '');
  const videos: CreatorMetadata['videos'] = [];

  try {
    // Use TikTok's oembed endpoint for basic metadata
    const oembedUrl = `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${encodeURIComponent(cleanHandle)}`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.ok) {
      const data = await res.json();
      if (data.title) {
        videos.push({
          caption: data.title,
          hashtags: (data.title.match(/#\w+/g) || []).map((h: string) => h.slice(1)),
        });
      }
    }
  } catch {
    // Scraping failed - we'll use AI to analyze based on niche alone
  }

  return { handle: cleanHandle, videos };
}

async function scrapeCreatorsWithinBudget(handles: string[]) {
  const startedAt = Date.now();
  const creatorData: CreatorMetadata[] = [];

  for (const handle of handles.slice(0, MAX_INSPIRATION_CREATORS)) {
    const elapsedMs = Date.now() - startedAt;
    const remainingBudgetMs = SCRAPE_TOTAL_BUDGET_MS - elapsedMs;
    if (remainingBudgetMs <= 0) {
      break;
    }

    const timeoutMs = Math.max(1000, Math.min(SCRAPE_TIMEOUT_MS, remainingBudgetMs));
    try {
      creatorData.push(await scrapeCreatorMetadata(handle, timeoutMs));
    } catch {
      // Ignore individual scrape failures so one bad creator does not burn the whole analysis budget.
    }
  }

  return creatorData;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedAiAccess('niche_analyze');
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const serviceSupabase = createServiceClient();
    const body = await request.json();
    const { niche_category, inspiration_creators } = body as {
      niche_category: string;
      inspiration_creators: string[];
    };

    if (!niche_category) {
      return Response.json({ error: 'niche_category is required' }, { status: 400 });
    }

    const safeCreators = Array.isArray(inspiration_creators)
      ? inspiration_creators
          .filter((handle): handle is string => typeof handle === 'string')
          .map((handle) => handle.trim().replace(/^@/, ''))
          .filter((handle) => handle.length > 0)
          .slice(0, MAX_INSPIRATION_CREATORS)
      : [];

    // Upsert niche profile for the authenticated user only
    let profileId: string;
    const { data: existing, error: existingError } = await serviceSupabase
      .from('niche_profiles')
      .select('id')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      profileId = existing.id;
      const { error: updateError } = await serviceSupabase
        .from('niche_profiles')
        .update({
          niche_category,
          inspiration_creators: safeCreators,
          last_analyzed_at: new Date().toISOString(),
        })
        .eq('id', profileId);

      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      const { data: created, error: createError } = await serviceSupabase
        .from('niche_profiles')
        .insert({
          user_id: auth.user.id,
          niche_category,
          inspiration_creators: safeCreators,
          last_analyzed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createError || !created) {
        throw new Error(createError?.message || 'Failed to create niche profile');
      }

      profileId = created.id;
    }

    // Scrape metadata from inspiration creators
    const creatorData = safeCreators.length > 0
      ? await scrapeCreatorsWithinBudget(safeCreators)
      : [];

    // Store scraped content
    for (const creator of creatorData) {
      for (const video of creator.videos) {
        const { error: creatorContentError } = await serviceSupabase.from('creator_content').insert({
            creator_handle: creator.handle,
            caption: video.caption,
            hashtags: video.hashtags,
            views: video.views,
            likes: video.likes,
          });

        if (creatorContentError) {
          console.warn('[niche/analyze] Failed to persist creator content:', creatorContentError.message);
        }
      }
    }

    // AI analysis to extract patterns
    const creatorContext = creatorData.length > 0
      ? `\n\nInspiration creators and their content:\n${creatorData.map(c =>
          `@${c.handle}: ${c.videos.length} videos scraped\n${c.videos.map(v => `  - "${v.caption}" [${v.hashtags.map(h => '#' + h).join(' ')}]`).join('\n')}`
        ).join('\n')}`
      : '';

    const prompt = `You are a TikTok niche intelligence analyst. Analyze the following niche and provide actionable patterns.

Niche: ${niche_category}
${creatorContext}

Based on your deep knowledge of TikTok trends and the ${niche_category} niche, extract patterns in these categories. Be specific and actionable.

Respond with ONLY valid JSON:
{
  "hook_patterns": {
    "winning_types": ["list of hook types that work best in this niche"],
    "examples": ["3-5 specific hook examples for this niche"],
    "avoid": ["hook types that don't work in this niche"]
  },
  "content_formats": {
    "top_formats": ["ranked list of content formats that perform best"],
    "emerging": ["newer formats gaining traction"],
    "optimal_duration": "recommended video duration range"
  },
  "hashtag_strategy": {
    "niche_tags": ["10-15 niche-specific hashtags"],
    "discovery_tags": ["5 broader discovery hashtags"],
    "avoid_tags": ["overused or dead hashtags to avoid"]
  },
  "posting_cadence": {
    "optimal_frequency": "recommended posts per week",
    "best_times": ["best posting times"],
    "consistency_tip": "specific advice"
  },
  "trending_topics": {
    "current": ["topics trending in this niche right now"],
    "evergreen": ["topics that always perform well"],
    "upcoming": ["predicted upcoming trends"]
  },
  "audience_insights": {
    "demographics": "who watches this content",
    "pain_points": ["what problems they want solved"],
    "engagement_triggers": ["what makes them comment/share/save"]
  }
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return Response.json({ error: 'No AI response' }, { status: 500 });
    }

    let patterns: Record<string, unknown>;
    try {
      const raw = textContent.text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      patterns = JSON.parse(raw);
    } catch {
      console.error('[niche/analyze] Failed to parse AI response:', textContent.text);
      return Response.json({ error: 'Failed to parse analysis' }, { status: 500 });
    }

    // Delete old patterns for this profile
    const { error: deleteError } = await serviceSupabase
      .from('niche_patterns')
      .delete()
      .eq('niche_profile_id', profileId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    // Store each pattern type
    const patternEntries = Object.entries(patterns).map(([type, data]) => ({
      niche_profile_id: profileId,
      pattern_type: type,
      pattern_data: data,
      confidence_score: creatorData.length > 0 ? 0.8 : 0.6,
      sample_video_ids: creatorData.flatMap(c => c.videos.map(() => c.handle)).slice(0, 5),
    }));

    const { error: insertPatternsError } = await serviceSupabase.from('niche_patterns').insert(patternEntries);
    if (insertPatternsError) {
      throw new Error(insertPatternsError.message);
    }

    return Response.json({
      profile_id: profileId,
      niche_category,
      patterns,
      creators_analyzed: creatorData.length,
    });
  } catch (err) {
    console.error('[niche/analyze] Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
