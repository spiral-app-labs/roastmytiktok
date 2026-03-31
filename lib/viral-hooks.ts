import type { RoastResult } from '@/lib/types';

export interface ViralHookExample {
  id: string;
  pattern: string;
  line: string;
  angle: string;
  whyItWorks: string;
  bestFor: string[];
}

export interface HookPatternMatch extends ViralHookExample {
  fitScore: number;
  personalizationNote: string;
}

export const VIRAL_HOOK_LIBRARY: ViralHookExample[] = [
  { id: 'curiosity-1', pattern: 'curiosity gap', line: 'i did this for 30 days and the result surprised me', angle: 'withhold the payoff', whyItWorks: 'creates an information gap the brain wants to close.', bestFor: ['fitness', 'beauty', 'self-improvement', 'experiments', 'lifestyle'] },
  { id: 'curiosity-2', pattern: 'curiosity gap', line: 'the reason your [topic] is not working is probably this', angle: 'problem + unexpected cause', whyItWorks: 'calls out pain fast and promises a non-obvious explanation.', bestFor: ['fitness', 'business', 'skincare', 'tech', 'cooking'] },
  { id: 'curiosity-3', pattern: 'curiosity gap', line: 'nobody warned me this would happen when i started [topic]', angle: 'personal reveal', whyItWorks: 'mixes story and insider knowledge so viewers stay for the reveal.', bestFor: ['career', 'travel', 'parenting', 'creator tips', 'lifestyle'] },
  { id: 'curiosity-4', pattern: 'curiosity gap', line: 'this is the part nobody explains about [topic]', angle: 'missing context', whyItWorks: 'positions the creator as the one person who will finally explain the gap.', bestFor: ['education', 'finance', 'health', 'productivity', 'tech'] },
  { id: 'curiosity-5', pattern: 'curiosity gap', line: 'i thought [common belief] was true until this happened', angle: 'belief reversal', whyItWorks: 'sets up tension between assumption and reality.', bestFor: ['storytime', 'self-improvement', 'health', 'career', 'relationships'] },

  { id: 'controversy-1', pattern: 'controversial take', line: 'unpopular opinion: [hot take]', angle: 'clean disagreement', whyItWorks: 'disagreement drives comments and keeps people from scrolling.', bestFor: ['food', 'tech', 'fashion', 'relationships', 'sports'] },
  { id: 'controversy-2', pattern: 'controversial take', line: 'i am going to get hate for this but [opinion]', angle: 'framed backlash', whyItWorks: 'the warning itself creates anticipation and a reason to listen.', bestFor: ['parenting', 'lifestyle', 'dating', 'career', 'fitness'] },
  { id: 'controversy-3', pattern: 'controversial take', line: '[popular thing] is actually terrible and here is why', angle: 'attack the default', whyItWorks: 'people defend what they identify with, which spikes comment volume.', bestFor: ['tech reviews', 'food', 'travel', 'media', 'gaming'] },
  { id: 'controversy-4', pattern: 'controversial take', line: 'if you still believe this about [topic], you are behind', angle: 'status challenge', whyItWorks: 'threatens competence and creates a need to hear the correction.', bestFor: ['marketing', 'business', 'ai', 'productivity', 'fitness'] },
  { id: 'controversy-5', pattern: 'controversial take', line: 'everyone keeps saying [common advice], but that is exactly why they stay stuck', angle: 'anti-consensus', whyItWorks: 'turns familiar advice into the villain and earns attention instantly.', bestFor: ['creator tips', 'business', 'wellness', 'career', 'education'] },

  { id: 'direct-1', pattern: 'direct call-out', line: 'if you are struggling with [topic], watch this before you try again', angle: 'audience call-out', whyItWorks: 'helps the right viewer self-select in the first second.', bestFor: ['education', 'fitness', 'parenting', 'creator tips', 'business'] },
  { id: 'direct-2', pattern: 'direct call-out', line: 'if your [result] keeps happening, this is probably why', angle: 'pain-point diagnosis', whyItWorks: 'names the problem before the scroll and implies an actionable fix.', bestFor: ['cooking', 'skincare', 'fitness', 'productivity', 'money'] },
  { id: 'direct-3', pattern: 'direct call-out', line: 'stop scrolling if you want [specific result]', angle: 'hard qualification', whyItWorks: 'makes the opener feel selective instead of generic.', bestFor: ['sales', 'education', 'creator economy', 'fitness', 'beauty'] },
  { id: 'direct-4', pattern: 'direct call-out', line: 'this is for the people who are tired of [pain point]', angle: 'emotionally specific target', whyItWorks: 'signals empathy and relevance immediately.', bestFor: ['mental health', 'parenting', 'career', 'relationships', 'lifestyle'] },
  { id: 'direct-5', pattern: 'direct call-out', line: 'if you only fix one thing in your [topic] today, make it this', angle: 'single-fix urgency', whyItWorks: 'compresses value into one obvious takeaway.', bestFor: ['education', 'fitness', 'home', 'business', 'beauty'] },

  { id: 'counter-1', pattern: 'counter narrative', line: 'stop doing [common thing] if you want better [result]', angle: 'loss aversion', whyItWorks: 'telling people what to stop creates urgency faster than vague advice.', bestFor: ['fitness', 'cooking', 'productivity', 'finance', 'skincare'] },
  { id: 'counter-2', pattern: 'counter narrative', line: 'everything you know about [topic] is wrong', angle: 'belief disruption', whyItWorks: 'forces a viewer to test their assumptions against your claim.', bestFor: ['science', 'education', 'health', 'history', 'fitness'] },
  { id: 'counter-3', pattern: 'counter narrative', line: 'professionals never do this first', angle: 'insider correction', whyItWorks: 'promises a pro-level shortcut instead of beginner advice.', bestFor: ['design', 'photography', 'business', 'fitness', 'cooking'] },
  { id: 'counter-4', pattern: 'counter narrative', line: 'the advice everyone gives you about [topic] is backwards', angle: 'reverse the script', whyItWorks: 'contrarian framing creates tension and curiosity at once.', bestFor: ['career', 'money', 'productivity', 'creator tips', 'health'] },
  { id: 'counter-5', pattern: 'counter narrative', line: 'you do not need more [effort], you need this instead', angle: 'replace the obvious fix', whyItWorks: 'reframes the problem and promises a smarter path.', bestFor: ['fitness', 'business', 'self-improvement', 'dating', 'learning'] },

  { id: 'proof-1', pattern: 'result first', line: 'i cut [bad thing] in half with this one rule', angle: 'measurable win', whyItWorks: 'numbers make the promise feel real before the explanation starts.', bestFor: ['finance', 'fitness', 'cooking', 'productivity', 'creator tips'] },
  { id: 'proof-2', pattern: 'result first', line: 'this got me [specific result] faster than anything else', angle: 'compressed proof', whyItWorks: 'viewers see a payoff before they invest attention.', bestFor: ['business', 'beauty', 'career', 'learning', 'fitness'] },
  { id: 'proof-3', pattern: 'result first', line: 'before you buy another [thing], try this first', angle: 'save money or pain', whyItWorks: 'taps into loss aversion and practical utility.', bestFor: ['shopping', 'beauty', 'home', 'tech', 'parenting'] },
  { id: 'proof-4', pattern: 'result first', line: 'here is exactly how i fixed [problem] without [common pain]', angle: 'friction removal', whyItWorks: 'pairs transformation with a lower-cost path.', bestFor: ['health', 'business', 'productivity', 'home', 'education'] },
  { id: 'proof-5', pattern: 'result first', line: 'i wish i knew this before i wasted months on [topic]', angle: 'regret-driven proof', whyItWorks: 'borrowed regret makes the lesson feel urgent.', bestFor: ['career', 'business', 'fitness', 'education', 'creator tips'] },

  { id: 'question-1', pattern: 'direct question', line: 'why does nobody talk about this part of [topic]?', angle: 'missing conversation', whyItWorks: 'suggests hidden knowledge and invites agreement or debate.', bestFor: ['education', 'history', 'finance', 'health', 'creator tips'] },
  { id: 'question-2', pattern: 'direct question', line: 'am i the only one who thinks [observation]?', angle: 'shared identity', whyItWorks: 'people comment to validate or reject the feeling.', bestFor: ['lifestyle', 'work life', 'relationships', 'parenting', 'culture'] },
  { id: 'question-3', pattern: 'direct question', line: 'what would you do if this happened to your [topic]?', angle: 'simulation trigger', whyItWorks: 'the viewer starts answering before they realize it.', bestFor: ['relationships', 'money', 'career', 'storytime', 'ethics'] },
  { id: 'question-4', pattern: 'direct question', line: 'have you noticed this weird pattern with [topic]?', angle: 'pattern spotting', whyItWorks: 'turns a casual viewer into an active participant.', bestFor: ['marketing', 'culture', 'tech', 'health', 'food'] },
  { id: 'question-5', pattern: 'direct question', line: 'would you still do this if you knew this part?', angle: 'hidden-cost question', whyItWorks: 'creates suspense around a consequence people want to avoid.', bestFor: ['fitness', 'health', 'money', 'buying decisions', 'career'] },

  { id: 'pov-1', pattern: 'pov', line: 'pov: you finally realize why your [topic] keeps failing', angle: 'relatable realization', whyItWorks: 'puts the viewer inside a familiar emotional moment.', bestFor: ['creator tips', 'fitness', 'career', 'school', 'dating'] },
  { id: 'pov-2', pattern: 'pov', line: 'pov: you try the advice everyone swears by and it still does not work', angle: 'shared frustration', whyItWorks: 'makes the viewer feel seen before the lesson begins.', bestFor: ['fitness', 'beauty', 'productivity', 'career', 'parenting'] },
  { id: 'pov-3', pattern: 'pov', line: 'pov: you are the friend who always gets asked about [topic]', angle: 'identity flex', whyItWorks: 'signals expertise through a relatable role.', bestFor: ['beauty', 'food', 'tech', 'fitness', 'style'] },
  { id: 'pov-4', pattern: 'pov', line: 'pov: you ignored this small fix for months and it was the whole problem', angle: 'late realization', whyItWorks: 'combines regret and discovery in a single beat.', bestFor: ['home', 'money', 'fitness', 'creator tips', 'learning'] },
  { id: 'pov-5', pattern: 'pov', line: 'pov: you thought this was normal until you saw the better way', angle: 'new standard', whyItWorks: 'turns an ordinary scenario into a before-and-after mental shift.', bestFor: ['productivity', 'beauty', 'cooking', 'tech', 'lifestyle'] },

  { id: 'transformation-1', pattern: 'transformation', line: 'before vs after using this one [topic] rule', angle: 'visual contrast', whyItWorks: 'change is attention-grabbing even before the explanation lands.', bestFor: ['beauty', 'fitness', 'home', 'art', 'fashion'] },
  { id: 'transformation-2', pattern: 'transformation', line: 'watch this go from messy to clean in one move', angle: 'instant payoff', whyItWorks: 'shows momentum immediately and promises a satisfying outcome.', bestFor: ['cleaning', 'home', 'art', 'organization', 'cooking'] },
  { id: 'transformation-3', pattern: 'transformation', line: 'this looked terrible until i changed one thing', angle: 'single-variable turnaround', whyItWorks: 'isolates the fix so the viewer believes they can copy it.', bestFor: ['design', 'fashion', 'fitness', 'home decor', 'content creation'] },
  { id: 'transformation-4', pattern: 'transformation', line: 'watch me turn this from beginner to polished in 10 seconds', angle: 'speed transformation', whyItWorks: 'compresses progress into a tight promise viewers want to witness.', bestFor: ['design', 'editing', 'makeup', 'art', 'cooking'] },
  { id: 'transformation-5', pattern: 'transformation', line: 'the difference between doing it wrong and doing it right looks like this', angle: 'side-by-side correction', whyItWorks: 'comparisons make the lesson instantly legible on mute.', bestFor: ['fitness', 'education', 'beauty', 'dance', 'skills'] },

  { id: 'challenge-1', pattern: 'challenge', line: 'try this for 7 days and tell me what changes', angle: 'participation prompt', whyItWorks: 'invites the viewer into an easy test they can comment on later.', bestFor: ['fitness', 'productivity', 'skin', 'mindset', 'creator tips'] },
  { id: 'challenge-2', pattern: 'challenge', line: 'can you do this without making the mistake everyone makes?', angle: 'competence test', whyItWorks: 'challenge framing turns passive viewers into competitors.', bestFor: ['cooking', 'art', 'fitness', 'dance', 'education'] },
  { id: 'challenge-3', pattern: 'challenge', line: 'do this with your friend and see who gets it right', angle: 'social branch', whyItWorks: 'tagging and participation create built-in distribution.', bestFor: ['relationships', 'comedy', 'fitness', 'games', 'family'] },
  { id: 'challenge-4', pattern: 'challenge', line: 'most people cannot do this on the first try', angle: 'difficulty tease', whyItWorks: 'ego and curiosity work together to hold attention.', bestFor: ['skills', 'fitness', 'music', 'dance', 'puzzles'] },
  { id: 'challenge-5', pattern: 'challenge', line: 'i bet you will want to try this before the video ends', angle: 'anticipatory participation', whyItWorks: 'plants the idea of action before the lesson even starts.', bestFor: ['food', 'diy', 'fitness', 'art', 'magic'] },

  { id: 'comment-1', pattern: 'comment bait', line: 'be honest, which one would you pick?', angle: 'binary choice', whyItWorks: 'easy low-friction decisions spike comments without extra explanation.', bestFor: ['fashion', 'food', 'home', 'beauty', 'relationships'] },
  { id: 'comment-2', pattern: 'comment bait', line: 'finish this sentence: the worst part about [topic] is ___', angle: 'fill in the blank', whyItWorks: 'gives viewers a script for responding, which raises comment conversion.', bestFor: ['creator tips', 'parenting', 'career', 'fitness', 'lifestyle'] },
  { id: 'comment-3', pattern: 'comment bait', line: 'tell me if i am wrong, but most people waste time on this part', angle: 'invited disagreement', whyItWorks: 'debate hooks double as retention and engagement fuel.', bestFor: ['business', 'marketing', 'productivity', 'fitness', 'tech'] },
  { id: 'comment-4', pattern: 'comment bait', line: 'which mistake do you see people make first with [topic]?', angle: 'expert audience prompt', whyItWorks: 'turns the audience into contributors instead of passive viewers.', bestFor: ['education', 'creator tips', 'business', 'health', 'design'] },
  { id: 'comment-5', pattern: 'comment bait', line: 'drop a yes if this happens to you too', angle: 'fast identification', whyItWorks: 'simple self-identification prompts can quickly create social proof in comments.', bestFor: ['lifestyle', 'mental health', 'parenting', 'relationships', 'work life'] },
];

const GENERIC_TAGS = ['lifestyle', 'education', 'storytime'];

export function getPersonalizedHookPatterns(roast: RoastResult, limit = 6): HookPatternMatch[] {
  const topic = inferTopic(roast);
  const nicheTokens = getNicheTokens(roast, topic);

  return VIRAL_HOOK_LIBRARY
    .map((example) => {
      const fitScore = example.bestFor.reduce((score, tag) => {
        if (nicheTokens.includes(tag)) return score + 3;
        if (GENERIC_TAGS.includes(tag)) return score + 1;
        return score;
      }, 0) + patternBoost(example.pattern, roast);

      return {
        ...example,
        fitScore,
        line: personalizeLine(example.line, topic),
        personalizationNote: buildPersonalizationNote(example, topic, nicheTokens),
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, limit);
}

function inferTopic(roast: RoastResult) {
  const description = clean(roast.metadata?.description);
  const transcript = clean(roast.audioSegments?.[0]?.text || roast.audioTranscript);
  const seed = description || transcript || 'your topic';
  return seed
    .replace(/^#\w+\s*/g, '')
    .split(/[.!?]/)[0]
    .split(/\s+/)
    .slice(0, 8)
    .join(' ')
    .toLowerCase();
}

function getNicheTokens(roast: RoastResult, topic: string) {
  const tokens = new Set<string>();
  const detected = clean(roast.niche?.detected).toLowerCase();
  const subNiche = clean(roast.niche?.subNiche).toLowerCase();
  const haystack = `${topic} ${detected} ${subNiche}`;

  const aliases: Record<string, string[]> = {
    fitness: ['fitness', 'workout', 'gym', 'exercise'],
    beauty: ['beauty', 'makeup', 'skincare', 'hair'],
    business: ['business', 'startup', 'marketing', 'sales'],
    tech: ['tech', 'software', 'ai', 'app'],
    cooking: ['cooking', 'recipe', 'meal', 'food'],
    parenting: ['parent', 'baby', 'mom', 'dad'],
    relationships: ['relationship', 'dating', 'partner', 'couple'],
    career: ['career', 'job', 'work', 'interview'],
    education: ['learn', 'study', 'education', 'school'],
    finance: ['finance', 'money', 'budget', 'invest'],
    lifestyle: ['lifestyle', 'routine', 'daily', 'life'],
    productivity: ['productive', 'productivity', 'focus', 'habit'],
    home: ['home', 'clean', 'decor', 'room'],
    fashion: ['fashion', 'outfit', 'style', 'clothes'],
    creator: ['creator', 'content', 'tiktok', 'video'],
  };

  Object.entries(aliases).forEach(([label, synonyms]) => {
    if (synonyms.some((synonym) => haystack.includes(synonym))) {
      tokens.add(label === 'creator' ? 'creator tips' : label);
    }
  });

  if (tokens.size === 0) {
    GENERIC_TAGS.forEach((tag) => tokens.add(tag));
  }

  return Array.from(tokens);
}

function patternBoost(pattern: string, roast: RoastResult) {
  const weak = roast.analysisMode === 'hook-first' || roast.hookSummary?.strength === 'weak';
  if (weak) {
    if (pattern === 'direct call-out' || pattern === 'result first' || pattern === 'counter narrative') return 3;
    if (pattern === 'transformation') return 2;
  }
  return pattern === 'direct question' ? 1 : 0;
}

function personalizeLine(line: string, topic: string) {
  return line.replace(/\[topic\]/g, topic).replace(/\[result\]/g, 'results').replace(/\[thing\]/g, topic).replace(/\[common belief\]/g, `the usual advice on ${topic}`).replace(/\[bad thing\]/g, 'wasted time').replace(/\[specific result\]/g, 'better results').replace(/\[common pain\]/g, 'burnout').replace(/\[observation\]/g, `what people keep doing with ${topic}`).replace(/\[hot take\]/g, `most ${topic} advice is too safe to work`).replace(/\[opinion\]/g, `most ${topic} creators are burying the useful part`).replace(/\[popular thing\]/g, `the standard way people do ${topic}`).replace(/\[common advice\]/g, `the advice people repeat about ${topic}`).replace(/\[common thing\]/g, `the default approach to ${topic}`).replace(/\[do X\]/g, `start with the soft intro on ${topic}`).replace(/\[effort\]/g, `more effort on ${topic}`).trim();
}

function buildPersonalizationNote(example: ViralHookExample, topic: string, nicheTokens: string[]) {
  const tag = example.bestFor.find((entry) => nicheTokens.includes(entry)) || example.bestFor[0];
  return `good fit for ${topic} because it plays well in ${tag}-style content and gives the opener a clearer promise.`;
}

function clean(value?: string | null) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}
