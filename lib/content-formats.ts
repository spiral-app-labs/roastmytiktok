export interface ContentFormatDefinition {
  id: string;
  name: string;
  rank: number;
  category: 'education' | 'story' | 'social' | 'commentary' | 'transformation' | 'entertainment';
  summary: string;
  bestFor: string;
  mustHaves: string[];
  upgradeIdeas: string[];
}

export interface FormatDiagnosis {
  primaryFormatId: string;
  primaryFormatName: string;
  rank: number;
  confidence: 'high' | 'medium' | 'low';
  whyThisFormat: string;
  distributionFit: string;
  mustHaves: string[];
  upgrades: string[];
  runnerUpFormatId?: string;
  runnerUpFormatName?: string;
}

export const CONTENT_FORMATS: ContentFormatDefinition[] = [
  {
    id: 'educational-tutorial',
    name: 'Educational Tutorial',
    rank: 1,
    category: 'education',
    summary: 'Teach one practical thing fast enough that people save it.',
    bestFor: 'step-by-step advice, demos, how-to content',
    mustHaves: ['clear payoff in frame one', 'visible steps or examples', 'save-worthy takeaway'],
    upgradeIdeas: ['show the finished result before the steps', 'turn the lesson into 2-4 fast beats'],
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    rank: 2,
    category: 'story',
    summary: 'Build tension, then pay it off with a turn or reveal.',
    bestFor: 'personal stories, lessons, emotional arcs',
    mustHaves: ['strong setup line', 'midpoint escalation', 'clean payoff'],
    upgradeIdeas: ['tease the ending sooner', 'cut throat-clearing before the conflict starts'],
  },
  {
    id: 'pov-skit',
    name: 'POV / Skit',
    rank: 3,
    category: 'entertainment',
    summary: 'Drop viewers into a recognizable scenario immediately.',
    bestFor: 'relatable humor, niche memes, creator personality',
    mustHaves: ['instant scene setup', 'clear character point of view', 'punchline or twist'],
    upgradeIdeas: ['start on the funniest line', 'make the setup readable on mute'],
  },
  {
    id: 'duet-stitch',
    name: 'Duet / Stitch',
    rank: 4,
    category: 'commentary',
    summary: 'Borrow momentum from an existing clip, then add a real take.',
    bestFor: 'responses, disagreement, added expertise',
    mustHaves: ['fast context', 'clear opinion or value-add', 'reaction worth staying for'],
    upgradeIdeas: ['show the exact moment you are reacting to', 'make your take sharper and earlier'],
  },
  {
    id: 'before-after',
    name: 'Before / After',
    rank: 5,
    category: 'transformation',
    summary: 'Use contrast to prove a result people can feel instantly.',
    bestFor: 'makeovers, fitness, cleaning, design, glow-ups',
    mustHaves: ['obvious contrast', 'credible process', 'satisfying reveal'],
    upgradeIdeas: ['flash the after in frame one', 'make both states equally readable'],
  },
  {
    id: 'trend-participation',
    name: 'Trend Participation',
    rank: 6,
    category: 'social',
    summary: 'Ride a familiar format, sound, or meme with a niche twist.',
    bestFor: 'trend jumps, remixable formats, fast relevance',
    mustHaves: ['recognizable trend signal', 'creator-specific angle', 'quick execution'],
    upgradeIdeas: ['localize the trend to your niche faster', 'skip any setup the audience already knows'],
  },
  {
    id: 'talking-head',
    name: 'Talking Head',
    rank: 7,
    category: 'commentary',
    summary: 'One face, one opinion, one reason to keep listening.',
    bestFor: 'hot takes, authority building, direct advice',
    mustHaves: ['tight framing', 'clean delivery', 'caption support'],
    upgradeIdeas: ['add b-roll or text proof', 'compress dead air between sentences'],
  },
  {
    id: 'day-in-the-life',
    name: 'Day in the Life',
    rank: 8,
    category: 'story',
    summary: 'Turn an ordinary routine into a watchable sequence.',
    bestFor: 'lifestyle, work, creator world-building',
    mustHaves: ['clear story spine', 'varied shots', 'specific moments not generic montage'],
    upgradeIdeas: ['anchor the day around one tension or goal', 'show more decisive beats, fewer filler clips'],
  },
  {
    id: 'green-screen-commentary',
    name: 'Green Screen Commentary',
    rank: 9,
    category: 'commentary',
    summary: 'Use visual context behind you to make commentary easier to process.',
    bestFor: 'news takes, receipts, internet drama, explainers',
    mustHaves: ['readable background asset', 'tight framing', 'clear commentary angle'],
    upgradeIdeas: ['zoom into the proof people need to see', 'cut faster between receipts and reaction'],
  },
  {
    id: 'reaction-video',
    name: 'Reaction Video',
    rank: 10,
    category: 'social',
    summary: 'Shared emotion works when the payoff is visible fast.',
    bestFor: 'reveals, surprises, cringe, wins, losses',
    mustHaves: ['readable source moment', 'clear facial or verbal reaction', 'why the viewer should care'],
    upgradeIdeas: ['show the stimulus earlier', 'avoid over-explaining the reaction'],
  },
  {
    id: 'listicle',
    name: 'Listicle',
    rank: 11,
    category: 'education',
    summary: 'Numbered structure makes info easy to follow but easy to make generic.',
    bestFor: 'tips, mistakes, tools, resources',
    mustHaves: ['specific items', 'strong #1 line', 'tight pacing between points'],
    upgradeIdeas: ['lead with the most surprising item', 'replace generic bullets with concrete examples'],
  },
  {
    id: 'myth-vs-fact',
    name: 'Myth vs Fact',
    rank: 12,
    category: 'education',
    summary: 'Conflict-heavy education that works when the correction is crisp.',
    bestFor: 'expert creators, debunks, contrarian takes',
    mustHaves: ['clear wrong belief', 'fast correction', 'proof or explanation'],
    upgradeIdeas: ['make the myth more concrete', 'show the proof instead of just claiming it'],
  },
  {
    id: 'case-study-breakdown',
    name: 'Case Study Breakdown',
    rank: 13,
    category: 'education',
    summary: 'Break down a real example so the takeaway feels earned.',
    bestFor: 'marketing, business, design, creator analysis',
    mustHaves: ['specific example', 'what happened', 'why it matters'],
    upgradeIdeas: ['put the result on screen first', 'trim context and move to analysis faster'],
  },
  {
    id: 'screen-record-breakdown',
    name: 'Screen Recording Breakdown',
    rank: 14,
    category: 'education',
    summary: 'Let the screen do the explaining while you narrate the move.',
    bestFor: 'apps, websites, workflows, software tips',
    mustHaves: ['zoomed readable screen', 'guided narration', 'one clear objective'],
    upgradeIdeas: ['highlight the exact click faster', 'remove tiny unreadable sections'],
  },
  {
    id: 'product-demo',
    name: 'Product Demo',
    rank: 15,
    category: 'education',
    summary: 'Show the thing working instead of describing it.',
    bestFor: 'consumer products, tools, app features',
    mustHaves: ['product visible immediately', 'clear benefit', 'proof of outcome'],
    upgradeIdeas: ['start with the end result', 'reduce time spent on setup shots'],
  },
  {
    id: 'transformation-journey',
    name: 'Transformation Journey',
    rank: 16,
    category: 'transformation',
    summary: 'Longer arc version of before/after that depends on emotional buy-in.',
    bestFor: 'fitness, business progress, routines, self-improvement',
    mustHaves: ['starting point', 'progress beats', 'earned payoff'],
    upgradeIdeas: ['make the starting pain sharper', 'show more proof of progress, less narration'],
  },
  {
    id: 'challenge-experiment',
    name: 'Challenge / Experiment',
    rank: 17,
    category: 'story',
    summary: 'A simple question or test keeps people watching for the result.',
    bestFor: 'social experiments, tests, creator bets',
    mustHaves: ['clear premise', 'stakes', 'result reveal'],
    upgradeIdeas: ['state the rules in one line', 'tease the outcome before showing method'],
  },
  {
    id: 'interview-street',
    name: 'Interview / Street Clip',
    rank: 18,
    category: 'social',
    summary: 'The answer has to earn the setup quickly.',
    bestFor: 'vox pop, dating questions, quick opinions',
    mustHaves: ['provocative question', 'clean audio', 'best answer first'],
    upgradeIdeas: ['cut straight to the strongest answer', 'show the question on screen for mute viewers'],
  },
  {
    id: 'vlog-montage',
    name: 'Vlog Montage',
    rank: 19,
    category: 'story',
    summary: 'Aesthetic clips alone are rarely enough without a narrative spine.',
    bestFor: 'travel, lifestyle, behind-the-scenes',
    mustHaves: ['clear theme', 'visual variety', 'something specific happened'],
    upgradeIdeas: ['add a point of view or mini-story', 'cut filler clips that all feel the same'],
  },
  {
    id: 'unstructured-rant',
    name: 'Unstructured Rant',
    rank: 20,
    category: 'commentary',
    summary: 'Can work from personality, but usually leaks retention fast.',
    bestFor: 'strong creator voices with existing audience',
    mustHaves: ['clear stance', 'tight pacing', 'one memorable line'],
    upgradeIdeas: ['repackage into a talking-head or myth-vs-fact structure', 'script the first three lines instead of freestyling'],
  },
];

const FORMAT_MAP = new Map(CONTENT_FORMATS.map((format) => [format.id, format]));

export function getContentFormat(id: string | undefined | null): ContentFormatDefinition | undefined {
  if (!id) return undefined;
  return FORMAT_MAP.get(id);
}

export function buildContentFormatPromptSection(): string {
  return CONTENT_FORMATS.map((format) => (
    `${format.rank}. ${format.name} [${format.id}] — ${format.summary} Best for: ${format.bestFor}. Must-haves: ${format.mustHaves.join(', ')}.`
  )).join('\n');
}
