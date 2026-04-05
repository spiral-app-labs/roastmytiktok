export interface TierBenchmark {
  tier: string;
  followerRange: string;
  avgEngagementRate: number;
  goodEngagementRate: number;
  excellentEngagementRate: number;
  avgCommentRate: number;
  avgSaveRate: number;
  avgShareRate: number;
  optimalPostsPerWeek: number;
  growthNotes: string;
}

const TIER_BENCHMARKS: TierBenchmark[] = [
  {
    tier: 'Nano',
    followerRange: 'Under 5K',
    avgEngagementRate: 4.2,
    goodEngagementRate: 7.0,
    excellentEngagementRate: 10.0,
    avgCommentRate: 0.8,
    avgSaveRate: 1.2,
    avgShareRate: 0.4,
    optimalPostsPerWeek: 7,
    growthNotes: 'Small accounts have the most engaged audiences. Focus on consistency and niche clarity to trigger algorithmic discovery.',
  },
  {
    tier: 'Micro',
    followerRange: '5K–100K',
    avgEngagementRate: 7.5,
    goodEngagementRate: 10.0,
    excellentEngagementRate: 15.0,
    avgCommentRate: 1.0,
    avgSaveRate: 1.5,
    avgShareRate: 0.6,
    optimalPostsPerWeek: 5,
    growthNotes: 'The growth inflection zone. Algorithm is testing your content with wider audiences — shareability and saves matter most here.',
  },
  {
    tier: 'Mid-Tier',
    followerRange: '100K–1M',
    avgEngagementRate: 5.0,
    goodEngagementRate: 7.0,
    excellentEngagementRate: 10.0,
    avgCommentRate: 0.6,
    avgSaveRate: 1.0,
    avgShareRate: 0.5,
    optimalPostsPerWeek: 4,
    growthNotes: 'Engagement rate naturally dips as audience grows. Maintaining above 5% here signals strong community loyalty and content-market fit.',
  },
  {
    tier: 'Macro',
    followerRange: '1M–10M',
    avgEngagementRate: 3.5,
    goodEngagementRate: 5.0,
    excellentEngagementRate: 7.0,
    avgCommentRate: 0.4,
    avgSaveRate: 0.7,
    avgShareRate: 0.3,
    optimalPostsPerWeek: 3,
    growthNotes: 'Scale dilutes engagement. Focus on brand deals, community building, and maintaining share rate to stay in acceleration phase.',
  },
  {
    tier: 'Mega',
    followerRange: 'Over 10M',
    avgEngagementRate: 2.88,
    goodEngagementRate: 4.0,
    excellentEngagementRate: 5.5,
    avgCommentRate: 0.3,
    avgSaveRate: 0.5,
    avgShareRate: 0.2,
    optimalPostsPerWeek: 3,
    growthNotes: 'At this scale, even small engagement rate changes represent massive absolute numbers. Focus on cultural moments and franchise content.',
  },
];

export function getTierForFollowerCount(followers: number): TierBenchmark {
  if (followers >= 10_000_000) return TIER_BENCHMARKS[4];
  if (followers >= 1_000_000) return TIER_BENCHMARKS[3];
  if (followers >= 100_000) return TIER_BENCHMARKS[2];
  if (followers >= 5_000) return TIER_BENCHMARKS[1];
  return TIER_BENCHMARKS[0];
}

export function buildBenchmarkPromptSection(
  followerCount: number | undefined,
  videos: Array<{
    view_count: number;
    like_count: number;
    comment_count: number;
    timestamp: number;
  }>,
): string {
  const totalViews = videos.reduce((s, v) => s + v.view_count, 0);
  const totalLikes = videos.reduce((s, v) => s + v.like_count, 0);
  const totalComments = videos.reduce((s, v) => s + v.comment_count, 0);

  const overallEngagement = totalViews > 0
    ? (((totalLikes + totalComments) / totalViews) * 100)
    : 0;
  const likeRate = totalViews > 0
    ? ((totalLikes / totalViews) * 100)
    : 0;
  const commentRate = totalViews > 0
    ? ((totalComments / totalViews) * 100)
    : 0;

  // Per-video engagement rates for distribution analysis
  const videoEngagements = videos
    .filter((v) => v.view_count > 0)
    .map((v) => (((v.like_count + v.comment_count) / v.view_count) * 100))
    .sort((a, b) => a - b);

  const viewCounts = videos
    .map((v) => v.view_count)
    .filter((count) => count > 0)
    .sort((a, b) => a - b);

  const median = videoEngagements.length > 0
    ? videoEngagements[Math.floor(videoEngagements.length / 2)]
    : 0;
  const medianViews = viewCounts.length > 0
    ? viewCounts[Math.floor(viewCounts.length / 2)]
    : 0;
  const top10pctIndex = Math.max(0, Math.floor(videoEngagements.length * 0.9));
  const top10pct = videoEngagements.length > 0
    ? videoEngagements[top10pctIndex]
    : 0;

  const bestVideo = videos.reduce(
    (best, v) => (v.view_count > best.view_count ? v : best),
    videos[0],
  );
  const bestEngagement = bestVideo.view_count > 0
    ? (((bestVideo.like_count + bestVideo.comment_count) / bestVideo.view_count) * 100)
    : 0;

  // Posting frequency analysis
  const timestamps = videos
    .map((v) => v.timestamp)
    .filter((t) => t > 0)
    .sort((a, b) => a - b);
  let postsPerWeek = 0;
  let consistencyLabel = 'unknown';
  if (timestamps.length >= 2) {
    const spanDays = (timestamps[timestamps.length - 1] - timestamps[0]) / 86400;
    postsPerWeek = spanDays > 0 ? (timestamps.length / spanDays) * 7 : 0;

    // Calculate gaps between posts to assess consistency
    const gaps: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push((timestamps[i] - timestamps[i - 1]) / 86400);
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const gapVariance = gaps.reduce((s, g) => s + (g - avgGap) ** 2, 0) / gaps.length;
    const gapStdDev = Math.sqrt(gapVariance);
    const cv = avgGap > 0 ? gapStdDev / avgGap : 0;
    consistencyLabel = cv < 0.5 ? 'regular' : cv < 1.0 ? 'somewhat irregular' : 'irregular';
  }

  // Build tier comparison section
  const tier = followerCount !== undefined
    ? getTierForFollowerCount(followerCount)
    : null;

  let tierSection: string;
  if (tier && followerCount !== undefined) {
    const comparison = overallEngagement > tier.avgEngagementRate ? 'above' :
      overallEngagement < tier.avgEngagementRate * 0.9 ? 'below' : 'at';
    tierSection = `
**TIER BENCHMARK COMPARISON — MUST reference these numbers in your analysis:**
With ${followerCount.toLocaleString()} followers, this creator is in the ${tier.tier} tier (${tier.followerRange}).
- Tier average engagement rate: ${tier.avgEngagementRate}%  |  This creator's engagement rate: ${overallEngagement.toFixed(1)}%  →  ${comparison} average
- Good for this tier: ${tier.goodEngagementRate}%  |  Excellent: ${tier.excellentEngagementRate}%
- Tier avg comment rate: ${tier.avgCommentRate}%  |  This creator: ${commentRate.toFixed(2)}%
- Like rate: ${likeRate.toFixed(2)}% (engagement here means likes + comments per view)
- ${tier.growthNotes}

You MUST say: "With ${followerCount.toLocaleString()} followers, you're in the ${tier.tier} tier where the average engagement rate is ${tier.avgEngagementRate}%. Your ${overallEngagement.toFixed(1)}% is ${comparison} average."
Identify which metrics (likes, comments) are strong vs weak relative to their tier and give specific advice on the weakest one.`;
  } else {
    tierSection = `
**ENGAGEMENT CONTEXT (follower count unknown):**
- This creator's engagement rate: ${overallEngagement.toFixed(1)}% (likes + comments per view)
- General healthy range: 3-6%
- Like rate: ${likeRate.toFixed(2)}%
- Comment rate: ${commentRate.toFixed(2)}%`;
  }

  const postingSection = `
**POSTING STRATEGY — MUST include in overallVerdict or nicheAnalysis:**
- Current posting frequency: ${postsPerWeek.toFixed(1)} posts/week
- Posting consistency: ${consistencyLabel}${tier ? `\n- Optimal for ${tier.tier} tier growth: ${tier.optimalPostsPerWeek} posts/week` : ''}
- Consistent accounts grow 30-50% faster than irregular posters at the same quality level.
${postsPerWeek > 0 && tier ? `You MUST say: "Posting ${postsPerWeek.toFixed(1)} times per week. Optimal for growth at your tier is ${tier.optimalPostsPerWeek} times per week."` : ''}
You MUST say: "Your posting consistency is ${consistencyLabel}. Consistent accounts grow 30-50% faster."

**Best posting times (general TikTok):** Tue-Thu 10am-12pm, 7pm-9pm local time. Fri-Sat evenings for entertainment niches.`;

  const distributionSection = `
**PERFORMANCE DISTRIBUTION — reference in overallVerdict:**
- Median engagement rate: ${median.toFixed(1)}%
- Median views (true baseline per post): ${medianViews.toLocaleString()}
- Average views: ${Math.round(totalViews / Math.max(videos.length, 1)).toLocaleString()}${medianViews > 0 ? ` (${(totalViews / Math.max(videos.length, 1)) / medianViews >= 1.8 ? 'likely inflated by spikes' : 'close to baseline'})` : ''}
- Top 10% engagement rate: ${top10pct.toFixed(1)}%
- Gap: ${(top10pct - median).toFixed(1)} percentage points — ${top10pct - median > 3 ? 'wide gap indicates inconsistency — their best content proves they CAN perform, they just don\'t do it reliably' : 'narrow gap indicates consistent quality'}
- Best video engagement: ${bestEngagement.toFixed(1)}% (${bestVideo.view_count.toLocaleString()} views)${tier ? `\n- Compare to tier average: ${bestEngagement > tier.excellentEngagementRate ? 'best video is EXCELLENT for this tier' : bestEngagement > tier.goodEngagementRate ? 'best video is GOOD for this tier' : 'best video is just average for this tier — even peaks aren\'t breaking through'}` : ''}
You MUST treat median views as the creator's baseline and use average views only as outlier context.
You MUST reference the gap between median and top 10% as a consistency indicator.`;

  return `${tierSection}\n${distributionSection}\n${postingSection}`;
}
