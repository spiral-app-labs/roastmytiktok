import { supabaseServer } from '@/lib/supabase-server';

// ── Sample data generators (swap for real data sources later) ──────────────

interface TrendingItem {
  type: 'sound' | 'format' | 'hashtag' | 'challenge';
  name: string;
  description: string;
  velocity: number;
  category: string;
  source_url: string | null;
  metadata: Record<string, unknown>;
}

const SAMPLE_SOUNDS: TrendingItem[] = [
  {
    type: 'sound',
    name: 'Original Sound - lofi beats',
    description: 'Chill lofi beat trending for study/aesthetic content',
    velocity: 85,
    category: 'music',
    source_url: null,
    metadata: { genre: 'lofi', bpm: 90 },
  },
  {
    type: 'sound',
    name: 'Aesthetic remix - viral drop',
    description: 'Bass drop remix used in transformation reveals',
    velocity: 72,
    category: 'music',
    source_url: null,
    metadata: { genre: 'electronic', bpm: 128 },
  },
  {
    type: 'sound',
    name: 'Voiceover AI narration',
    description: 'AI narrator voice for storytime and educational content',
    velocity: 90,
    category: 'voiceover',
    source_url: null,
    metadata: { voice_type: 'ai_narrator' },
  },
];

const SAMPLE_FORMATS: TrendingItem[] = [
  {
    type: 'format',
    name: 'Split-screen reaction',
    description: 'Creator reacts on one side while content plays on the other',
    velocity: 65,
    category: 'reaction',
    source_url: null,
    metadata: { avg_duration_sec: 30 },
  },
  {
    type: 'format',
    name: 'Green screen storytime',
    description: 'Creator uses green screen with screenshots/images as evidence',
    velocity: 78,
    category: 'storytime',
    source_url: null,
    metadata: { avg_duration_sec: 60 },
  },
  {
    type: 'format',
    name: 'POV mini-movie',
    description: 'Cinematic POV content with dramatic lighting and music',
    velocity: 55,
    category: 'entertainment',
    source_url: null,
    metadata: { avg_duration_sec: 45 },
  },
];

const SAMPLE_HASHTAGS: TrendingItem[] = [
  {
    type: 'hashtag',
    name: '#deinfluencing',
    description: 'Creators telling people what NOT to buy - reverse psychology engagement',
    velocity: 92,
    category: 'shopping',
    source_url: null,
    metadata: { estimated_posts: 2_400_000 },
  },
  {
    type: 'hashtag',
    name: '#BookTok',
    description: 'Book recommendations and emotional reactions to reading',
    velocity: 70,
    category: 'education',
    source_url: null,
    metadata: { estimated_posts: 45_000_000 },
  },
  {
    type: 'hashtag',
    name: '#GRWMChallenge',
    description: 'Get Ready With Me format with trending twist or story',
    velocity: 80,
    category: 'beauty',
    source_url: null,
    metadata: { estimated_posts: 8_500_000 },
  },
];

const SAMPLE_CHALLENGES: TrendingItem[] = [
  {
    type: 'challenge',
    name: '30 Day Glow Up',
    description: 'Daily transformation challenge with before/after comparisons',
    velocity: 88,
    category: 'self-improvement',
    source_url: null,
    metadata: { duration_days: 30 },
  },
  {
    type: 'challenge',
    name: 'Duet This If You Can',
    description: 'Skill-based challenge inviting duets from talented creators',
    velocity: 75,
    category: 'talent',
    source_url: null,
    metadata: { participation_type: 'duet' },
  },
];

function getSampleTrending(): TrendingItem[] {
  // Randomize velocities slightly to simulate real-world changes
  const jitter = () => Math.floor(Math.random() * 21) - 10; // -10 to +10
  const all = [
    ...SAMPLE_SOUNDS,
    ...SAMPLE_FORMATS,
    ...SAMPLE_HASHTAGS,
    ...SAMPLE_CHALLENGES,
  ];
  return all.map((item) => ({
    ...item,
    velocity: Math.max(0, Math.min(100, item.velocity + jitter())),
  }));
}

// ── Status lifecycle logic ─────────────────────────────────────────────────

function computeStatus(
  currentStatus: string,
  previousVelocity: number | null,
  newVelocity: number,
): 'emerging' | 'peak' | 'declining' | 'dead' {
  if (previousVelocity === null) return 'emerging';

  const delta = newVelocity - previousVelocity;

  if (currentStatus === 'emerging' && newVelocity >= 80) return 'peak';
  if (currentStatus === 'peak' && delta < -15) return 'declining';
  if (currentStatus === 'declining' && newVelocity < 20) return 'dead';
  if (currentStatus === 'dead') return 'dead';

  // Re-emerging case
  if (currentStatus === 'declining' && delta > 10) return 'emerging';

  return currentStatus as 'emerging' | 'peak' | 'declining' | 'dead';
}

// ── Main cron handler ──────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = getSampleTrending();
    const now = new Date().toISOString();
    let upserted = 0;
    let snapshots = 0;

    for (const item of items) {
      // Check if this trending item already exists (by type + name)
      const { data: existing } = await supabaseServer
        .from('rmt_trending_content')
        .select('id, velocity, status')
        .eq('type', item.type)
        .eq('name', item.name)
        .maybeSingle();

      const newStatus = computeStatus(
        existing?.status ?? 'emerging',
        existing?.velocity ?? null,
        item.velocity,
      );

      let contentId: string;

      if (existing) {
        // Update existing record
        const { error } = await supabaseServer
          .from('rmt_trending_content')
          .update({
            description: item.description,
            velocity: item.velocity,
            category: item.category,
            source_url: item.source_url,
            last_seen_at: now,
            status: newStatus,
            metadata: item.metadata,
          })
          .eq('id', existing.id);

        if (error) throw error;
        contentId = existing.id;
      } else {
        // Insert new record
        const { data: inserted, error } = await supabaseServer
          .from('rmt_trending_content')
          .insert({
            type: item.type,
            name: item.name,
            description: item.description,
            velocity: item.velocity,
            category: item.category,
            source_url: item.source_url,
            first_seen_at: now,
            last_seen_at: now,
            status: newStatus,
            metadata: item.metadata,
          })
          .select('id')
          .single();

        if (error) throw error;
        contentId = inserted.id;
      }

      upserted++;

      // Create a snapshot
      const { error: snapError } = await supabaseServer
        .from('rmt_trending_snapshots')
        .insert({
          trending_content_id: contentId,
          snapshot_at: now,
          rank: items.indexOf(item) + 1,
          usage_count: null,
          engagement_data: { velocity: item.velocity, status: newStatus },
        });

      if (snapError) throw snapError;
      snapshots++;
    }

    return Response.json({
      ok: true,
      upserted,
      snapshots,
      timestamp: now,
    });
  } catch (err) {
    console.error('[cron/trending] Error:', err);
    return Response.json(
      { error: 'Cron job failed', detail: String(err) },
      { status: 500 },
    );
  }
}
