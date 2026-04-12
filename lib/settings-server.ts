import type { User } from '@supabase/supabase-js';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: Response.json({ error: 'Authentication required' }, { status: 401 }) };
  }

  return { supabase, user };
}

export async function claimRoastSessionsForUser(userId: string, sessionId?: string | null) {
  if (!sessionId || sessionId.trim().length < 5) {
    return 0;
  }

  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase
    .from('rmt_roast_sessions')
    .update({ user_id: userId })
    .eq('session_id', sessionId.trim())
    .is('user_id', null)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

export async function listOwnedRoastSessions(userId: string) {
  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase
    .from('rmt_roast_sessions')
    .select('id, created_at, source, filename, video_url, tiktok_url, overall_score, verdict, agent_scores, findings, result_json')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listNicheProfile(userId: string) {
  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase
    .from('niche_profiles')
    .select('id, user_id, niche_category, inspiration_creators, last_analyzed_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listNichePatterns(profileId: string) {
  const serviceSupabase = createServiceClient();
  const { data, error } = await serviceSupabase
    .from('niche_patterns')
    .select('id, pattern_type, pattern_data, confidence_score, sample_video_ids, generated_at')
    .eq('niche_profile_id', profileId)
    .order('generated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function deleteOwnedAccountData(user: User) {
  const serviceSupabase = createServiceClient();
  const roastSessions = await listOwnedRoastSessions(user.id);
  const videoPaths = roastSessions
    .map((session) => session.video_url)
    .filter((path): path is string => typeof path === 'string' && path.length > 0);

  if (videoPaths.length > 0) {
    const { error: storageError } = await serviceSupabase.storage
      .from('roast-videos')
      .remove(videoPaths);

    if (storageError) {
      throw new Error(storageError.message);
    }
  }

  const nicheProfile = await listNicheProfile(user.id);
  if (nicheProfile?.id) {
    const { error: patternError } = await serviceSupabase
      .from('niche_patterns')
      .delete()
      .eq('niche_profile_id', nicheProfile.id);

    if (patternError) {
      throw new Error(patternError.message);
    }
  }

  const { error: profileError } = await serviceSupabase
    .from('niche_profiles')
    .delete()
    .eq('user_id', user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: roastError } = await serviceSupabase
    .from('rmt_roast_sessions')
    .delete()
    .eq('user_id', user.id);

  if (roastError) {
    throw new Error(roastError.message);
  }
}
