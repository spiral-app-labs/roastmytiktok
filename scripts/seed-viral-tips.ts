import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://eayiazyiotnkggnsvhto.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ViralTip {
  category: 'hook' | 'format' | 'audio' | 'cta' | 'timing' | 'general';
  tip_text: string;
  source: 'research' | 'trend_analysis' | 'manual';
  relevance_score: number;
  active: boolean;
  metadata: Record<string, unknown>;
}

const tips: ViralTip[] = [
  // ── HOOK TIPS ──
  {
    category: 'hook',
    tip_text: 'Open with a bold, specific claim in the first 0.5 seconds. "I gained 10k followers in 7 days" outperforms "Here\'s how to grow on TikTok" by 3x in retention.',
    source: 'research',
    relevance_score: 95,
    active: true,
    metadata: { applies_to: ['all niches'], retention_impact: 'high' },
  },
  {
    category: 'hook',
    tip_text: 'Use pattern interrupts: start mid-sentence, whisper, or open with an unexpected visual. The brain\'s orienting response forces 1-2 extra seconds of attention.',
    source: 'research',
    relevance_score: 92,
    active: true,
    metadata: { applies_to: ['all niches'], retention_impact: 'high' },
  },
  {
    category: 'hook',
    tip_text: 'Text hooks on screen should be no more than 8 words. The viewer must be able to read it before they can scroll past - longer text gets skipped.',
    source: 'research',
    relevance_score: 88,
    active: true,
    metadata: { applies_to: ['educational', 'listicle'], retention_impact: 'medium' },
  },
  {
    category: 'hook',
    tip_text: 'Ask a direct question that your target viewer cannot resist answering internally. "Am I the only one who..." triggers automatic self-reflection.',
    source: 'research',
    relevance_score: 85,
    active: true,
    metadata: { applies_to: ['lifestyle', 'relatable'], retention_impact: 'medium' },
  },
  {
    category: 'hook',
    tip_text: 'Use the "wait for it" tease only when the payoff arrives within 3-5 seconds. Longer waits lose 40% of viewers before the reveal.',
    source: 'research',
    relevance_score: 80,
    active: true,
    metadata: { applies_to: ['transformation', 'reveal'], retention_impact: 'high' },
  },

  // ── FORMAT TIPS ──
  {
    category: 'format',
    tip_text: 'Videos between 21-34 seconds hit the sweet spot for completion rate AND replay value. Too short = no depth. Too long = drop-off.',
    source: 'research',
    relevance_score: 93,
    active: true,
    metadata: { optimal_duration_sec: [21, 34], applies_to: ['all niches'] },
  },
  {
    category: 'format',
    tip_text: 'Vertical 9:16 with face filling 40-60% of frame gets 2.5x more engagement than wide shots. Intimacy drives connection.',
    source: 'research',
    relevance_score: 90,
    active: true,
    metadata: { applies_to: ['talking head', 'storytime'], retention_impact: 'high' },
  },
  {
    category: 'format',
    tip_text: 'Split-screen formats (reaction, duet-style) perform 35% better than single-frame because they give the viewer two things to track.',
    source: 'research',
    relevance_score: 82,
    active: true,
    metadata: { applies_to: ['reaction', 'commentary'], retention_impact: 'medium' },
  },
  {
    category: 'format',
    tip_text: 'Green screen with screenshots/receipts as proof increases credibility scores by 2x in storytime content. Show evidence.',
    source: 'research',
    relevance_score: 78,
    active: true,
    metadata: { applies_to: ['storytime', 'drama', 'educational'], retention_impact: 'medium' },
  },
  {
    category: 'format',
    tip_text: 'Use jump cuts every 2-3 seconds in talking-head videos. Static shots lose 15% of viewers per 5 seconds of no visual change.',
    source: 'research',
    relevance_score: 87,
    active: true,
    metadata: { applies_to: ['talking head', 'educational'], retention_impact: 'high' },
  },

  // ── AUDIO TIPS ──
  {
    category: 'audio',
    tip_text: 'Using a trending sound (even at low volume under a voiceover) gets 2-3x more distribution than original audio alone. The algorithm indexes by sound.',
    source: 'research',
    relevance_score: 96,
    active: true,
    metadata: { applies_to: ['all niches'], distribution_impact: 'very high' },
  },
  {
    category: 'audio',
    tip_text: 'Voiceover pacing should be 150-170 words per minute - fast enough to feel energetic but slow enough to be understood. Match the energy of your niche.',
    source: 'research',
    relevance_score: 84,
    active: true,
    metadata: { applies_to: ['educational', 'storytime'], retention_impact: 'medium' },
  },
  {
    category: 'audio',
    tip_text: 'The first sound in your video matters: a voice saying "okay so" or a sharp sound effect stops the scroll 40% better than silence or music fade-in.',
    source: 'research',
    relevance_score: 89,
    active: true,
    metadata: { applies_to: ['all niches'], retention_impact: 'high' },
  },
  {
    category: 'audio',
    tip_text: 'Layer ambient sound under voiceovers - coffee shop noise, rain, keyboard typing. It adds production value and keeps auditory attention.',
    source: 'research',
    relevance_score: 70,
    active: true,
    metadata: { applies_to: ['aesthetic', 'study', 'ASMR-adjacent'], retention_impact: 'low' },
  },

  // ── CTA TIPS ──
  {
    category: 'cta',
    tip_text: 'End with a question, not a command. "What would you do?" gets 3x more comments than "Follow for more." Comments are the #1 signal for distribution.',
    source: 'research',
    relevance_score: 94,
    active: true,
    metadata: { applies_to: ['all niches'], engagement_impact: 'very high' },
  },
  {
    category: 'cta',
    tip_text: 'Use a "soft CTA" mid-video: "If this is helpful, you\'ll love part 2" performs better than end-screen CTAs because viewers are still engaged.',
    source: 'research',
    relevance_score: 86,
    active: true,
    metadata: { applies_to: ['series', 'educational'], engagement_impact: 'high' },
  },
  {
    category: 'cta',
    tip_text: 'Pin a controversial or incomplete comment on your own video. Viewers reply to correct or argue with it, boosting comment count organically.',
    source: 'research',
    relevance_score: 83,
    active: true,
    metadata: { applies_to: ['all niches'], engagement_impact: 'high' },
  },
  {
    category: 'cta',
    tip_text: '"Save this for later" is the highest-converting CTA for educational content. Saves heavily influence the For You page algorithm.',
    source: 'research',
    relevance_score: 91,
    active: true,
    metadata: { applies_to: ['educational', 'tips', 'listicle'], engagement_impact: 'very high' },
  },

  // ── TIMING TIPS ──
  {
    category: 'timing',
    tip_text: 'Post when your audience is about to open TikTok, not when they\'re already scrolling. Best general windows: 7-9am, 12-1pm, 7-10pm in your audience\'s timezone.',
    source: 'research',
    relevance_score: 88,
    active: true,
    metadata: { applies_to: ['all niches'], distribution_impact: 'high' },
  },
  {
    category: 'timing',
    tip_text: 'Tuesday, Thursday, and Saturday consistently outperform other days for new content. Monday and Wednesday are the most competitive - avoid unless your content is strong.',
    source: 'research',
    relevance_score: 79,
    active: true,
    metadata: { applies_to: ['all niches'], distribution_impact: 'medium' },
  },
  {
    category: 'timing',
    tip_text: 'Post 2-3x per day for the first 30 days of a new account. The algorithm needs volume to understand your content type and find your audience.',
    source: 'research',
    relevance_score: 85,
    active: true,
    metadata: { applies_to: ['new accounts'], distribution_impact: 'high' },
  },
  {
    category: 'timing',
    tip_text: 'Jump on trending sounds within the first 24-48 hours of emergence. Early adopters get 5-10x more distribution than latecomers using the same sound.',
    source: 'research',
    relevance_score: 93,
    active: true,
    metadata: { applies_to: ['all niches'], distribution_impact: 'very high' },
  },

  // ── GENERAL TIPS ──
  {
    category: 'general',
    tip_text: 'The TikTok algorithm prioritizes watch time > shares > comments > likes > follows. Optimize for completion rate above all other metrics.',
    source: 'research',
    relevance_score: 97,
    active: true,
    metadata: { applies_to: ['all niches'], priority: 'critical' },
  },
  {
    category: 'general',
    tip_text: 'Reply to comments with video responses - each reply-video gets its own distribution cycle AND links back to the original, creating a traffic loop.',
    source: 'research',
    relevance_score: 90,
    active: true,
    metadata: { applies_to: ['all niches'], distribution_impact: 'high' },
  },
  {
    category: 'general',
    tip_text: 'Use 3-5 hashtags max: 1 broad (#fyp or niche), 2 medium-specificity, 1-2 hyper-niche. More than 5 dilutes signal; fewer than 3 limits discovery.',
    source: 'research',
    relevance_score: 86,
    active: true,
    metadata: { applies_to: ['all niches'], distribution_impact: 'medium' },
  },
  {
    category: 'general',
    tip_text: 'Stitch and duet viral videos in your niche within the first 6 hours. You inherit a fraction of their distribution and reach their audience directly.',
    source: 'research',
    relevance_score: 84,
    active: true,
    metadata: { applies_to: ['commentary', 'reaction', 'educational'], distribution_impact: 'high' },
  },
  {
    category: 'general',
    tip_text: 'Your profile picture and bio are conversion tools, not decorations. Viewers who watch 3+ of your videos check your profile - make the bio answer "why should I follow?"',
    source: 'research',
    relevance_score: 77,
    active: true,
    metadata: { applies_to: ['all niches'], conversion_impact: 'medium' },
  },
  {
    category: 'general',
    tip_text: 'Batch-create content in themed sessions (5-10 videos at once). Consistency in style trains the algorithm to categorize you correctly.',
    source: 'research',
    relevance_score: 75,
    active: true,
    metadata: { applies_to: ['all niches'], workflow_impact: 'high' },
  },
];

async function main() {
  console.log(`Seeding ${tips.length} viral tips...`);

  // Clear existing tips
  const { error: deleteError } = await supabase
    .from('rmt_viral_tips')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

  if (deleteError) {
    console.error('Failed to clear existing tips:', deleteError);
  }

  // Insert in batches of 10
  for (let i = 0; i < tips.length; i += 10) {
    const batch = tips.slice(i, i + 10);
    const { error } = await supabase.from('rmt_viral_tips').insert(batch);
    if (error) {
      console.error(`Failed to insert batch ${i / 10 + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / 10 + 1} (${batch.length} tips)`);
    }
  }

  console.log('Done! Seeded viral tips.');
}

main().catch(console.error);
