import { NextRequest } from 'next/server';
import { listNichePatterns, listNicheProfile, requireAuthenticatedUser } from '@/lib/settings-server';

export async function GET(request: NextRequest) {
  void request;

  const auth = await requireAuthenticatedUser();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const profile = await listNicheProfile(auth.user.id);

    if (!profile) {
      return Response.json({ profile: null, patterns: [] });
    }

    const patterns = await listNichePatterns(profile.id);

    // Build structured response
    const patternMap: Record<string, unknown> = {};
    for (const p of patterns) {
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
