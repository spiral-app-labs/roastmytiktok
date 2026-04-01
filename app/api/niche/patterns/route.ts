import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const profileId = searchParams.get('profile_id');

    if (!userId && !profileId) {
      return Response.json({ error: 'user_id or profile_id is required' }, { status: 400 });
    }

    // Get niche profile
    let profile;
    if (profileId) {
      const { data } = await supabaseServer
        .from('niche_profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      profile = data;
    } else {
      const { data } = await supabaseServer
        .from('niche_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      profile = data;
    }

    if (!profile) {
      return Response.json({ profile: null, patterns: [] });
    }

    // Get patterns
    const { data: patterns } = await supabaseServer
      .from('niche_patterns')
      .select('*')
      .eq('niche_profile_id', profile.id)
      .order('generated_at', { ascending: false });

    // Build structured response
    const patternMap: Record<string, unknown> = {};
    for (const p of patterns || []) {
      patternMap[p.pattern_type] = p.pattern_data;
    }

    return Response.json({
      profile: {
        id: profile.id,
        niche_category: profile.niche_category,
        inspiration_creators: profile.inspiration_creators,
        last_analyzed_at: profile.last_analyzed_at,
      },
      patterns: patternMap,
    });
  } catch (err) {
    console.error('[niche/patterns] Error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
