export interface CreatorDeltaVideo {
  id: string;
  title: string;
  description: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration: number;
  timestamp: number;
  track?: string;
  artists?: string[];
}

export interface CreatorDeltaContext {
  winners: CreatorDeltaVideo[];
  losers: CreatorDeltaVideo[];
  exampleWinner: CreatorDeltaVideo;
  exampleLoser: CreatorDeltaVideo;
  winnerAvgViews: number;
  loserAvgViews: number;
  sampleSize: number;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function descriptionFor(video: CreatorDeltaVideo): string {
  return video.description || video.title || '(no caption)';
}

function videoLine(video: CreatorDeltaVideo): string {
  const date = video.timestamp
    ? new Date(video.timestamp * 1000).toISOString().split('T')[0]
    : 'unknown';
  const sound = video.track
    ? ` | Sound: "${video.track}"${video.artists?.length ? ` by ${video.artists.join(', ')}` : ''}`
    : '';

  return `${date} | ${video.view_count.toLocaleString()} views | ${video.like_count.toLocaleString()} likes | ${video.comment_count.toLocaleString()} comments | ${video.duration}s | ${descriptionFor(video)}${sound}`;
}

export function buildCreatorDeltaContext(videos: CreatorDeltaVideo[]): CreatorDeltaContext | null {
  if (videos.length < 2) return null;

  const sorted = [...videos].sort((a, b) => b.view_count - a.view_count);
  const maxSample = Math.floor(videos.length / 2);
  const sampleSize = Math.max(1, Math.min(5, Math.max(2, Math.ceil(videos.length * 0.25)), maxSample || 1));

  const winners = sorted.slice(0, sampleSize);
  const losers = sorted.slice(sorted.length - sampleSize).reverse();

  if (winners.length === 0 || losers.length === 0) return null;

  return {
    winners,
    losers,
    exampleWinner: winners[0],
    exampleLoser: losers[0],
    winnerAvgViews: average(winners.map((video) => video.view_count)),
    loserAvgViews: average(losers.map((video) => video.view_count)),
    sampleSize,
  };
}

export function buildCreatorDeltaPromptSection(videos: CreatorDeltaVideo[]): string {
  const context = buildCreatorDeltaContext(videos);
  if (!context) {
    return 'Creator delta analysis unavailable because there are not enough videos to compare winners vs losers.';
  }

  const winnerMultiple = context.loserAvgViews > 0
    ? (context.winnerAvgViews / context.loserAvgViews).toFixed(1)
    : 'n/a';

  return [
    `CREATOR DELTA DATASET: compare this creator's own winners vs losers using only their local history below.`,
    `- Winner sample size: ${context.winners.length} posts`,
    `- Loser sample size: ${context.losers.length} posts`,
    `- Winner average: ${context.winnerAvgViews.toLocaleString()} views`,
    `- Loser average: ${context.loserAvgViews.toLocaleString()} views`,
    `- Winner/loser multiple: ${winnerMultiple}x`,
    '',
    `TOP WINNER EXAMPLE: ${videoLine(context.exampleWinner)}`,
    `TOP LOSER EXAMPLE: ${videoLine(context.exampleLoser)}`,
    '',
    'WINNER CLUSTER:',
    ...context.winners.map((video, index) => `${index + 1}. ${videoLine(video)}`),
    '',
    'LOSER CLUSTER:',
    ...context.losers.map((video, index) => `${index + 1}. ${videoLine(video)}`),
    '',
    'Your job: identify the repeatable patterns that show up more in the winner cluster than the loser cluster, then explain why the example winner beat the example loser. Be concrete and tie every point back to this creator\'s own history, not generic TikTok advice.',
  ].join('\n');
}
