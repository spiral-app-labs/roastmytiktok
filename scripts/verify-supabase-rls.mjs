import crypto from 'node:crypto';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !anonKey || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL, SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const service = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

function makeEmail(prefix) {
  return `${prefix}.${Date.now()}.${crypto.randomUUID().slice(0, 8)}@example.com`;
}

async function assert(name, condition, extra) {
  if (!condition) {
    const detail = extra ? `\n${JSON.stringify(extra, null, 2)}` : '';
    throw new Error(`${name} failed${detail}`);
  }
  console.log(`PASS ${name}`);
}

async function expectInsertBlocked(name, op) {
  const { error } = await op();
  await assert(name, Boolean(error), error);
}

async function expectEmptySelect(name, op) {
  const { data, error } = await op();
  await assert(name, !error, error);
  await assert(name, Array.isArray(data) && data.length === 0, { data });
}

async function main() {
  const scope = makeId('rls');
  const userAEmail = makeEmail('rls-a');
  const userBEmail = makeEmail('rls-b');
  const password = `Rls!${crypto.randomUUID()}aA1`;
  const createdUserIds = [];

  const cleanup = async () => {
    await service.from('creator_content').delete().ilike('creator_handle', `${scope}%`);
    await service.from('niche_patterns').delete().ilike('pattern_type', `${scope}%`);
    await service.from('niche_profiles').delete().ilike('niche_category', `${scope}%`);
    await service.from('rmt_trending_snapshots').delete().contains('engagement_data', { scope });
    await service.from('rmt_trending_content').delete().ilike('name', `${scope}%`);
    await service.from('rmt_viral_tips').delete().contains('metadata', { scope });
    await service.from('rmt_viral_patterns').delete().ilike('hook_type', `${scope}%`);
    await service.from('tmt_trending_content').delete().ilike('category', `${scope}%`);
    await service.from('rmt_waitlist').delete().like('email', `${scope}%`);
    await service.from('rmt_roast_sessions').delete().like('id', `${scope}%`);

    for (const userId of createdUserIds) {
      await service.auth.admin.deleteUser(userId);
    }
  };

  try {
    const { data: userAData, error: userAError } = await service.auth.admin.createUser({
      email: userAEmail,
      password,
      email_confirm: true,
    });
    if (userAError) throw userAError;
    const { data: userBData, error: userBError } = await service.auth.admin.createUser({
      email: userBEmail,
      password,
      email_confirm: true,
    });
    if (userBError) throw userBError;

    const userAId = userAData.user.id;
    const userBId = userBData.user.id;
    createdUserIds.push(userAId, userBId);

    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const userA = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const userB = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: signInAError } = await userA.auth.signInWithPassword({ email: userAEmail, password });
    if (signInAError) throw signInAError;
    const { error: signInBError } = await userB.auth.signInWithPassword({ email: userBEmail, password });
    if (signInBError) throw signInBError;

    const roastAId = `${scope}_roast_a`;
    const roastBId = `${scope}_roast_b`;
    const nicheA = `${scope}_niche_a`;
    const nicheB = `${scope}_niche_b`;
    const profileAId = crypto.randomUUID();
    const profileBId = crypto.randomUUID();
    const waitlistEmail = `${scope}.${Date.now()}@example.com`;
    const trendId = crypto.randomUUID();
    const deadTrendId = crypto.randomUUID();
    const snapshotId = crypto.randomUUID();
    const tipActiveId = crypto.randomUUID();
    const tipInactiveId = crypto.randomUUID();
    const patternId = crypto.randomUUID();
    const rawTrendId = crypto.randomUUID();

    const { error: seedRoastError } = await service.from('rmt_roast_sessions').insert([
      {
        id: roastAId,
        session_id: `${scope}_session_a`,
        user_id: userAId,
        source: 'upload',
        filename: 'a.mp4',
        analysis_status: 'completed',
        overall_score: 91,
        verdict: 'owned by user A',
        agent_scores: {},
        findings: {},
      },
      {
        id: roastBId,
        session_id: `${scope}_session_b`,
        user_id: userBId,
        source: 'upload',
        filename: 'b.mp4',
        analysis_status: 'completed',
        overall_score: 51,
        verdict: 'owned by user B',
        agent_scores: {},
        findings: {},
      },
    ]);
    if (seedRoastError) throw seedRoastError;

    const { error: seedProfilesError } = await service.from('niche_profiles').insert([
      {
        id: profileAId,
        user_id: userAId,
        niche_category: nicheA,
        inspiration_creators: [`${scope}_creator_a`],
      },
      {
        id: profileBId,
        user_id: userBId,
        niche_category: nicheB,
        inspiration_creators: [`${scope}_creator_b`],
      },
    ]);
    if (seedProfilesError) throw seedProfilesError;

    const { error: seedCreatorContentError } = await service.from('creator_content').insert([
      {
        niche_profile_id: profileAId,
        creator_handle: `${scope}_creator_a`,
        caption: 'profile A creator content',
        hashtags: [scope],
      },
      {
        niche_profile_id: profileBId,
        creator_handle: `${scope}_creator_b`,
        caption: 'profile B creator content',
        hashtags: [scope],
      },
    ]);
    if (seedCreatorContentError) throw seedCreatorContentError;

    const { error: seedPatternsError } = await service.from('niche_patterns').insert([
      {
        niche_profile_id: profileAId,
        pattern_type: `${scope}_pattern_a`,
        pattern_data: { scope, owner: 'a' },
        confidence_score: 0.8,
      },
      {
        niche_profile_id: profileBId,
        pattern_type: `${scope}_pattern_b`,
        pattern_data: { scope, owner: 'b' },
        confidence_score: 0.7,
      },
    ]);
    if (seedPatternsError) throw seedPatternsError;

    const { error: seedTrendingError } = await service.from('rmt_trending_content').insert([
      {
        id: trendId,
        type: 'sound',
        name: `${scope}_trend_live`,
        status: 'emerging',
        velocity: 88,
      },
      {
        id: deadTrendId,
        type: 'sound',
        name: `${scope}_trend_dead`,
        status: 'dead',
        velocity: 1,
      },
    ]);
    if (seedTrendingError) throw seedTrendingError;

    const { error: seedSnapshotsError } = await service.from('rmt_trending_snapshots').insert({
      id: snapshotId,
      trending_content_id: trendId,
      engagement_data: { scope },
    });
    if (seedSnapshotsError) throw seedSnapshotsError;

    const { error: seedTipsError } = await service.from('rmt_viral_tips').insert([
      {
        id: tipActiveId,
        category: 'general',
        tip_text: `${scope} active tip`,
        active: true,
        metadata: { scope },
      },
      {
        id: tipInactiveId,
        category: 'general',
        tip_text: `${scope} inactive tip`,
        active: false,
        metadata: { scope },
      },
    ]);
    if (seedTipsError) throw seedTipsError;

    const { error: seedPatternLibraryError } = await service.from('rmt_viral_patterns').insert({
      id: patternId,
      hook_type: `${scope}_hook`,
      category: scope,
    });
    if (seedPatternLibraryError) throw seedPatternLibraryError;

    const { error: seedRawTrendError } = await service.from('tmt_trending_content').insert({
      id: rawTrendId,
      category: scope,
      description: 'raw trend',
    });
    if (seedRawTrendError) throw seedRawTrendError;

    await expectEmptySelect('anon cannot read roast sessions', () =>
      anon.from('rmt_roast_sessions').select('id').eq('id', roastAId)
    );
    await expectInsertBlocked('anon cannot write roast sessions', () =>
      anon.from('rmt_roast_sessions').insert({
        id: `${scope}_roast_anon`,
        session_id: `${scope}_anon_session`,
        source: 'upload',
      })
    );

    await expectEmptySelect('anon cannot read waitlist rows', () =>
      anon.from('rmt_waitlist').select('id').eq('email', waitlistEmail)
    );
    const { error: waitlistInsertError } = await anon
      .from('rmt_waitlist')
      .insert({ email: waitlistEmail });
    await assert('anon can join waitlist', !waitlistInsertError, waitlistInsertError);
    const { data: waitlistRows, error: waitlistReadbackError } = await service
      .from('rmt_waitlist')
      .select('email, free_pro')
      .eq('email', waitlistEmail);
    await assert(
      'waitlist insert stays non-privileged',
      !waitlistReadbackError
        && Array.isArray(waitlistRows)
        && waitlistRows.length === 1
        && waitlistRows[0].free_pro === false,
      waitlistReadbackError ?? waitlistRows
    );
    await expectInsertBlocked('anon cannot self-upgrade waitlist row', () =>
      anon.from('rmt_waitlist').insert({ email: `${scope}.pro.${Date.now()}@example.com`, free_pro: true })
    );

    await expectEmptySelect('anon cannot read raw trending content', () =>
      anon.from('tmt_trending_content').select('id').eq('id', rawTrendId)
    );
    await expectInsertBlocked('anon cannot write raw trending content', () =>
      anon.from('tmt_trending_content').insert({ category: `${scope}_anon` })
    );

    const { data: publicTrends, error: publicTrendsError } = await anon
      .from('rmt_trending_content')
      .select('id,name,status')
      .like('name', `${scope}%`)
      .order('name');
    await assert(
      'anon can read only public trending content',
      !publicTrendsError
        && Array.isArray(publicTrends)
        && publicTrends.length === 1
        && publicTrends[0].id === trendId
        && publicTrends[0].status === 'emerging',
      publicTrendsError ?? publicTrends
    );
    await expectInsertBlocked('anon cannot write public trending content', () =>
      anon.from('rmt_trending_content').insert({ type: 'sound', name: `${scope}_anon`, status: 'emerging' })
    );

    await expectEmptySelect('anon cannot read trending snapshots', () =>
      anon.from('rmt_trending_snapshots').select('id').eq('id', snapshotId)
    );
    await expectInsertBlocked('anon cannot write trending snapshots', () =>
      anon.from('rmt_trending_snapshots').insert({ trending_content_id: trendId })
    );

    const { data: publicTips, error: publicTipsError } = await anon
      .from('rmt_viral_tips')
      .select('id,active')
      .in('id', [tipActiveId, tipInactiveId])
      .order('id');
    await assert(
      'anon can read only active viral tips',
      !publicTipsError
        && Array.isArray(publicTips)
        && publicTips.length === 1
        && publicTips[0].id === tipActiveId
        && publicTips[0].active === true,
      publicTipsError ?? publicTips
    );
    await expectInsertBlocked('anon cannot write viral tips', () =>
      anon.from('rmt_viral_tips').insert({ category: 'general', tip_text: `${scope} anon tip` })
    );

    const { data: publicPatternLibrary, error: publicPatternLibraryError } = await anon
      .from('rmt_viral_patterns')
      .select('id,hook_type')
      .eq('id', patternId);
    await assert(
      'anon can read viral pattern library',
      !publicPatternLibraryError
        && Array.isArray(publicPatternLibrary)
        && publicPatternLibrary.length === 1
        && publicPatternLibrary[0].id === patternId,
      publicPatternLibraryError ?? publicPatternLibrary
    );
    await expectInsertBlocked('anon cannot write viral pattern library', () =>
      anon.from('rmt_viral_patterns').insert({ hook_type: `${scope}_anon`, category: scope })
    );

    await expectEmptySelect('anon cannot read niche profiles', () =>
      anon.from('niche_profiles').select('id').eq('id', profileAId)
    );
    await expectEmptySelect('anon cannot read creator content', () =>
      anon.from('creator_content').select('id').like('creator_handle', `${scope}%`)
    );
    await expectEmptySelect('anon cannot read niche patterns', () =>
      anon.from('niche_patterns').select('id').like('pattern_type', `${scope}%`)
    );
    await expectInsertBlocked('anon cannot write niche profiles', () =>
      anon.from('niche_profiles').insert({ user_id: userAId, niche_category: `${scope}_anon` })
    );

    const { data: ownRoastRows, error: ownRoastError } = await userA
      .from('rmt_roast_sessions')
      .select('id')
      .in('id', [roastAId, roastBId]);
    await assert(
      'authenticated user can read only own roast session',
      !ownRoastError
        && Array.isArray(ownRoastRows)
        && ownRoastRows.length === 1
        && ownRoastRows[0].id === roastAId,
      ownRoastError ?? ownRoastRows
    );

    const { data: ownProfileRows, error: ownProfileError } = await userA
      .from('niche_profiles')
      .select('id')
      .in('id', [profileAId, profileBId]);
    await assert(
      'authenticated user can read only own niche profile',
      !ownProfileError
        && Array.isArray(ownProfileRows)
        && ownProfileRows.length === 1
        && ownProfileRows[0].id === profileAId,
      ownProfileError ?? ownProfileRows
    );

    const { data: ownCreatorRows, error: ownCreatorError } = await userA
      .from('creator_content')
      .select('creator_handle')
      .like('creator_handle', `${scope}%`);
    await assert(
      'authenticated user can read only own creator content',
      !ownCreatorError
        && Array.isArray(ownCreatorRows)
        && ownCreatorRows.length === 1
        && ownCreatorRows[0].creator_handle === `${scope}_creator_a`,
      ownCreatorError ?? ownCreatorRows
    );

    const { data: ownPatternRows, error: ownPatternError } = await userA
      .from('niche_patterns')
      .select('pattern_type')
      .like('pattern_type', `${scope}%`);
    await assert(
      'authenticated user can read only own niche patterns',
      !ownPatternError
        && Array.isArray(ownPatternRows)
        && ownPatternRows.length === 1
        && ownPatternRows[0].pattern_type === `${scope}_pattern_a`,
      ownPatternError ?? ownPatternRows
    );

    const { data: crossUpdateRows, error: crossUpdateError } = await userA
      .from('niche_profiles')
      .update({ niche_category: `${scope}_unauthorized` })
      .eq('id', profileBId)
      .select('id');
    await assert(
      'authenticated user cannot update another user niche profile',
      !crossUpdateError && Array.isArray(crossUpdateRows) && crossUpdateRows.length === 0,
      crossUpdateError ?? crossUpdateRows
    );

    const { data: serviceRoasts, error: serviceRoastError } = await service
      .from('rmt_roast_sessions')
      .select('id')
      .in('id', [roastAId, roastBId]);
    await assert(
      'service role can read protected roast sessions',
      !serviceRoastError && Array.isArray(serviceRoasts) && serviceRoasts.length === 2,
      serviceRoastError ?? serviceRoasts
    );

    console.log('RLS verification completed successfully.');
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
