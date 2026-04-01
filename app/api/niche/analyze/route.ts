import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServer } from '@/lib/supabase-server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CreatorMetadata {
  handle: string;
  videos: Array<{
    caption: string;
    hashtags: string[];
    views?: number;
    likes?: number;
  }>;
}

async function scrapeCreatorMetadata(handle: string): Promise<CreatorMetadata> {
  const cleanHandle = handle.replace(/^@/, '');
  const videos: CreatorMetadata['videos'] = [];

  try {
    // Use TikTok's oembed endpoint for basic metadata
    const oembedUrl = `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${encodeURIComponent(cleanHandle)}`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
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
    // Scraping failed — we'll use AI to analyze based on niche alone
  }

  return { handle: cleanHandle, videos };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { niche_category, inspiration_creators, user_id } = body as {
      niche_category: string;
      inspiration_creators: string[];
      user_id?: string;
    };

    if (!niche_category) {
      return Response.json({ error: 'niche_category is required' }, { status: 400 });
    }

    // Upsert niche profile
    let profileId: string;
    if (user_id) {
      const { data: existing } = await supabaseServer
        .from('niche_profiles')
        .select('id')
        .eq('user_id', user_id)
        .single();

      if (existing) {
        profileId = existing.id;
        await supabaseServer
          .from('niche_profiles')
          .update({
            niche_category,
            inspiration_creators: inspiration_creators || [],
            last_analyzed_at: new Date().toISOString(),
          })
          .eq('id', profileId);
      } else {
        const { data: created } = await supabaseServer
          .from('niche_profiles')
          .insert({
            user_id,
            niche_category,
            inspiration_creators: inspiration_creators || [],
            last_analyzed_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        profileId = created!.id;
      }
    } else {
      const { data: created } = await supabaseServer
        .from('niche_profiles')
        .insert({
          niche_category,
          inspiration_creators: inspiration_creators || [],
          last_analyzed_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      profileId = created!.id;
    }

    // Scrape metadata from inspiration creators
    const creatorData: CreatorMetadata[] = [];
    if (inspiration_creators?.length) {
      const results = await Promise.allSettled(
        inspiration_creators.slice(0, 5).map(scrapeCreatorMetadata)
      );
      for (const r of results) {
        if (r.status === 'fulfilled') creatorData.push(r.value);
      }

      // Store scraped content
      for (const creator of creatorData) {
        for (const video of creator.videos) {
          await supabaseServer.from('creator_content').insert({
            creator_handle: creator.handle,
            caption: video.caption,
            hashtags: video.hashtags,
            views: video.views,
            likes: video.likes,
          });
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
    await supabaseServer
      .from('niche_patterns')
      .delete()
      .eq('niche_profile_id', profileId);

    // Store each pattern type
    const patternEntries = Object.entries(patterns).map(([type, data]) => ({
      niche_profile_id: profileId,
      pattern_type: type,
      pattern_data: data,
      confidence_score: creatorData.length > 0 ? 0.8 : 0.6,
      sample_video_ids: creatorData.flatMap(c => c.videos.map(() => c.handle)).slice(0, 5),
    }));

    await supabaseServer.from('niche_patterns').insert(patternEntries);

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
