import Anthropic from '@anthropic-ai/sdk';

export const NICHE_CATEGORIES = [
  'comedy', 'education', 'lifestyle', 'fitness', 'beauty',
  'tech', 'food', 'finance', 'travel', 'gaming',
  'parenting', 'fashion', 'pets', 'diy', 'music',
] as const;

export type NicheCategory = (typeof NICHE_CATEGORIES)[number];

export interface NicheDetection {
  niche: NicheCategory;
  subNiche: string | null;
  confidence: 'high' | 'medium' | 'low';
  signals: string[];
}

/**
 * AI-based niche detection using Claude.
 * Uses frame descriptions + transcript + caption/hashtags to classify the video
 * into one of 15 niches with a sub-niche and confidence level.
 */
export async function detectNiche(params: {
  frameDescriptions: string;
  transcript?: string;
  caption?: string;
  hashtags?: string[];
}, anthropic: Anthropic): Promise<NicheDetection> {
  try {
    const { frameDescriptions, transcript, caption, hashtags } = params;

    const contextParts: string[] = [];
    if (frameDescriptions) contextParts.push(`Visual content:\n${frameDescriptions.slice(0, 3000)}`);
    if (transcript) contextParts.push(`Transcript:\n${transcript.slice(0, 2000)}`);
    if (caption) contextParts.push(`Caption: ${caption}`);
    if (hashtags?.length) contextParts.push(`Hashtags: ${hashtags.join(' ')}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Classify this video into exactly one niche category.

Available niches: ${NICHE_CATEGORIES.join(', ')}

${contextParts.join('\n\n')}

Return ONLY valid JSON:
{"niche": "one of the 15 categories above", "subNiche": "specific sub-category or null", "confidence": "high/medium/low", "signals": ["reason 1", "reason 2"]}

Rules:
- Choose the BEST FIT niche based on the overall content, not individual words
- An interview about dating is "lifestyle", not "food" just because someone mentions eating
- A person reviewing tech gadgets is "tech", not "education" just because they explain things
- confidence is "high" if the content clearly fits one niche, "medium" if it could be 2 niches, "low" if unclear
- signals should list 2-3 specific reasons for the classification`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[niche-detect] AI response not parseable, falling back to keyword detection');
      return detectNicheFallback({ caption, hashtags, transcript });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const niche = NICHE_CATEGORIES.includes(parsed.niche) ? parsed.niche as NicheCategory : 'lifestyle';
    const confidence = ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium';

    return {
      niche,
      subNiche: parsed.subNiche || null,
      confidence: confidence as NicheDetection['confidence'],
      signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 5) : [],
    };
  } catch (err) {
    console.warn('[niche-detect] AI niche detection failed, falling back:', err);
    return detectNicheFallback({
      caption: params.caption,
      hashtags: params.hashtags,
      transcript: params.transcript,
    });
  }
}

// ---------------------------------------------------------------------------
// Keyword fallback (used when AI call fails)
// ---------------------------------------------------------------------------

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasKeywordMatch(text: string, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return false;
  const pattern = normalizedKeyword.includes(' ')
    ? `(^|[^a-z0-9])${escapeRegex(normalizedKeyword).replace(/\s+/g, '\\s+')}([^a-z0-9]|$)`
    : `(^|[^a-z0-9])${escapeRegex(normalizedKeyword)}([^a-z0-9]|$)`;
  return new RegExp(pattern, 'i').test(text);
}

const NICHE_SIGNALS: Record<NicheCategory, { keywords: string[]; subNiches: Record<string, string[]> }> = {
  comedy: {
    keywords: ['funny', 'comedy', 'joke', 'skit', 'prank', 'humor', 'laugh', 'hilarious', 'meme', 'parody', 'satire', 'standup', 'relatable', 'pov', 'acting', 'impression', 'roast'],
    subNiches: { 'skit': ['skit', 'acting', 'pov', 'scene'], 'standup': ['standup', 'stand up', 'comedy set', 'mic'], 'prank': ['prank', 'reaction', 'surprise'], 'meme': ['meme', 'trend', 'viral', 'relatable'], 'impression': ['impression', 'impersonation', 'celebrity'] },
  },
  education: {
    keywords: ['learn', 'tutorial', 'howto', 'how to', 'tip', 'tips', 'hack', 'hacks', 'explained', 'guide', 'lesson', 'teach', 'study', 'school', 'college', 'university', 'knowledge', 'facts', 'didyouknow', 'science', 'history', 'psychology', 'mindset'],
    subNiches: { 'science': ['science', 'biology', 'chemistry', 'physics', 'experiment'], 'history': ['history', 'historical', 'ancient'], 'psychology': ['psychology', 'mindset', 'mental', 'brain'], 'study tips': ['study', 'exam', 'school', 'college', 'university'], 'life hacks': ['hack', 'hacks', 'lifehack', 'tips'] },
  },
  lifestyle: {
    keywords: ['lifestyle', 'vlog', 'daily', 'routine', 'morning', 'grwm', 'get ready', 'aesthetic', 'dayinmylife', 'day in my life', 'minimalist', 'productive', 'self care', 'selfcare', 'wellness', 'journal'],
    subNiches: { 'daily vlog': ['vlog', 'daily', 'dayinmylife', 'day in my life'], 'grwm': ['grwm', 'get ready', 'getting ready'], 'routine': ['routine', 'morning', 'night', 'productive'], 'aesthetic': ['aesthetic', 'minimalist', 'cozy'] },
  },
  fitness: {
    keywords: ['fitness', 'workout', 'gym', 'exercise', 'gains', 'bulk', 'cut', 'protein', 'muscle', 'lift', 'squat', 'deadlift', 'bench', 'cardio', 'running', 'yoga', 'pilates', 'crossfit', 'bodybuilding', 'weightloss', 'weight loss', 'transformation', 'abs'],
    subNiches: { 'weightlifting': ['lift', 'squat', 'deadlift', 'bench', 'bodybuilding', 'gains'], 'yoga': ['yoga', 'stretch', 'flexibility', 'pilates'], 'running': ['running', 'marathon', 'cardio', 'jog'], 'weight loss': ['weightloss', 'weight loss', 'transformation', 'cut'], 'workout routine': ['workout', 'exercise', 'gym', 'routine'] },
  },
  beauty: {
    keywords: ['beauty', 'makeup', 'skincare', 'skin', 'foundation', 'concealer', 'mascara', 'lips', 'eyeshadow', 'contour', 'glow', 'serum', 'moisturizer', 'sunscreen', 'acne', 'dermatologist', 'nails', 'hair', 'hairstyle'],
    subNiches: { 'makeup tutorial': ['makeup', 'foundation', 'concealer', 'eyeshadow', 'contour', 'mascara'], 'skincare': ['skincare', 'skin', 'serum', 'moisturizer', 'sunscreen', 'acne', 'dermatologist'], 'nails': ['nails', 'manicure', 'nail art'], 'hair': ['hair', 'hairstyle', 'haircare', 'curls'] },
  },
  tech: {
    keywords: ['tech', 'technology', 'iphone', 'android', 'gadget', 'coding', 'programming', 'software', 'ai', 'artificial intelligence', 'startup', 'saas', 'unboxing', 'laptop', 'pc', 'gaming setup', 'developer', 'code'],
    subNiches: { 'coding': ['coding', 'programming', 'developer', 'code', 'software'], 'gadget review': ['gadget', 'unboxing'], 'ai': ['ai', 'artificial intelligence', 'chatgpt', 'machine learning'], 'desk setup': ['setup', 'desk', 'pc', 'laptop'] },
  },
  food: {
    keywords: ['food', 'recipe', 'cooking', 'cook', 'baking', 'bake', 'meal', 'kitchen', 'chef', 'restaurant', 'mukbang', 'foodie', 'snack', 'dinner', 'lunch', 'breakfast'],
    subNiches: { 'recipe tutorial': ['recipe', 'cooking', 'cook', 'baking', 'bake', 'meal'], 'mukbang': ['mukbang', 'asmr'], 'food review': ['restaurant', 'foodie'], 'meal prep': ['meal prep', 'prep'] },
  },
  finance: {
    keywords: ['finance', 'money', 'investing', 'invest', 'stocks', 'crypto', 'bitcoin', 'budget', 'saving', 'passive income', 'side hustle', 'rich', 'wealth', 'financial', 'credit', 'debt', 'mortgage', 'real estate', 'entrepreneur', 'business'],
    subNiches: { 'investing': ['investing', 'invest', 'stocks', 'crypto', 'bitcoin', 'portfolio'], 'budgeting': ['budget', 'saving', 'debt', 'credit'], 'real estate': ['real estate', 'mortgage', 'property', 'house'], 'side hustle': ['side hustle', 'passive income', 'entrepreneur', 'business'] },
  },
  travel: {
    keywords: ['travel', 'trip', 'vacation', 'explore', 'adventure', 'destination', 'hotel', 'flight', 'airport', 'beach', 'hiking', 'backpacking', 'road trip', 'tourist', 'wanderlust', 'country', 'city'],
    subNiches: { 'budget travel': ['budget', 'cheap', 'backpacking', 'hostel'], 'luxury travel': ['luxury', 'hotel', 'resort', 'first class'], 'adventure': ['hiking', 'adventure', 'explore', 'camping'], 'city guide': ['city', 'guide', 'hidden gems', 'things to do'] },
  },
  gaming: {
    keywords: ['gaming', 'game', 'gamer', 'gameplay', 'stream', 'twitch', 'xbox', 'playstation', 'ps5', 'nintendo', 'switch', 'pc gaming', 'fortnite', 'minecraft', 'valorant', 'apex', 'cod', 'esports', 'speedrun', 'walkthrough', 'lets play'],
    subNiches: { 'gameplay': ['gameplay', 'lets play', 'walkthrough', 'stream'], 'esports': ['esports', 'competitive', 'tournament', 'ranked'], 'tips and tricks': ['tips', 'tricks', 'guide', 'tutorial', 'speedrun'] },
  },
  parenting: {
    keywords: ['parenting', 'parent', 'mom', 'dad', 'baby', 'toddler', 'kids', 'children', 'family', 'momlife', 'dadlife', 'pregnancy', 'newborn', 'motherhood', 'fatherhood', 'momtok'],
    subNiches: { 'baby': ['baby', 'newborn', 'infant', 'pregnancy'], 'toddler': ['toddler', 'kids', 'children'], 'mom life': ['mom', 'momlife', 'motherhood', 'momtok'], 'dad life': ['dad', 'dadlife', 'fatherhood'] },
  },
  fashion: {
    keywords: ['fashion', 'outfit', 'ootd', 'style', 'thrift', 'haul', 'shopping', 'closet', 'wardrobe', 'streetwear', 'designer', 'luxury', 'vintage', 'trend', 'dress', 'sneakers', 'accessories'],
    subNiches: { 'outfit ideas': ['outfit', 'ootd', 'style', 'look'], 'thrift': ['thrift', 'vintage', 'secondhand', 'haul'], 'streetwear': ['streetwear', 'sneakers', 'hypebeast'], 'luxury fashion': ['luxury', 'designer', 'gucci', 'louis'], 'haul': ['haul', 'shopping', 'try on'] },
  },
  pets: {
    keywords: ['pet', 'pets', 'dog', 'cat', 'puppy', 'kitten', 'animal', 'animals', 'doggo', 'pupper', 'cute', 'rescue', 'adoption', 'vet', 'training', 'breed'],
    subNiches: { 'dogs': ['dog', 'puppy', 'doggo', 'pupper'], 'cats': ['cat', 'kitten', 'kitty'], 'training': ['training', 'tricks', 'obedience'], 'rescue': ['rescue', 'adoption', 'shelter'] },
  },
  diy: {
    keywords: ['diy', 'craft', 'handmade', 'build', 'project', 'woodworking', 'paint', 'decor', 'home', 'renovation', 'upcycle', 'repurpose', 'sewing', 'knitting', 'crochet', 'maker'],
    subNiches: { 'home decor': ['decor', 'home', 'room', 'renovation'], 'woodworking': ['woodworking', 'build', 'wood', 'furniture'], 'crafts': ['craft', 'handmade', 'sewing', 'knitting', 'crochet'], 'upcycle': ['upcycle', 'repurpose', 'thrift flip'] },
  },
  music: {
    keywords: ['music', 'song', 'singing', 'sing', 'rapper', 'rap', 'beat', 'producer', 'guitar', 'piano', 'drums', 'cover', 'original', 'studio', 'recording', 'artist', 'musician', 'concert', 'band', 'dj'],
    subNiches: { 'covers': ['cover', 'singing', 'sing'], 'original music': ['original', 'song', 'wrote', 'studio', 'recording'], 'production': ['producer', 'beat', 'producing', 'dj'], 'instrument': ['guitar', 'piano', 'drums', 'bass', 'instrument'] },
  },
};

/**
 * Keyword-based fallback for when AI niche detection fails.
 * Requires 3+ keyword matches to assign a niche; otherwise defaults to lifestyle.
 */
export function detectNicheFallback(signals: {
  caption?: string;
  hashtags?: string[];
  transcript?: string;
  audioType?: 'speech' | 'music' | 'both' | 'none';
}): NicheDetection {
  const text = [
    signals.caption ?? '',
    (signals.hashtags ?? []).join(' '),
    signals.transcript ?? '',
  ].join(' ').toLowerCase();

  const scores: { niche: NicheCategory; score: number; matchedKeywords: string[] }[] = [];

  for (const niche of NICHE_CATEGORIES) {
    const { keywords } = NICHE_SIGNALS[niche];
    const matched: string[] = [];
    for (const kw of keywords) {
      if (hasKeywordMatch(text, kw)) {
        matched.push(kw);
      }
    }
    if (matched.length > 0) {
      scores.push({ niche, score: matched.length, matchedKeywords: matched });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  if (signals.audioType === 'music') {
    const musicEntry = scores.find(s => s.niche === 'music');
    if (musicEntry) {
      musicEntry.score += 3;
    } else {
      scores.push({ niche: 'music', score: 3, matchedKeywords: ['audio: music-only'] });
    }
    scores.sort((a, b) => b.score - a.score);
  }

  // Require 3+ matches to beat the lifestyle default
  if (scores.length === 0 || scores[0].score < 3) {
    return {
      niche: 'lifestyle',
      subNiche: null,
      confidence: 'low',
      signals: scores.length > 0
        ? [`Weak signal for ${scores[0].niche} (${scores[0].score} match${scores[0].score > 1 ? 'es' : ''}); defaulting to lifestyle`]
        : ['No clear niche signals detected; defaulting to lifestyle'],
    };
  }

  const top = scores[0];
  const confidence: NicheDetection['confidence'] =
    top.score >= 5 ? 'high' : top.score >= 3 ? 'medium' : 'low';

  const { subNiches } = NICHE_SIGNALS[top.niche];
  let detectedSubNiche: string | null = null;
  let bestSubScore = 0;

  for (const [subName, subKeywords] of Object.entries(subNiches)) {
    const subScore = subKeywords.filter((kw) => hasKeywordMatch(text, kw)).length;
    if (subScore > bestSubScore) {
      bestSubScore = subScore;
      detectedSubNiche = subName;
    }
  }

  return {
    niche: top.niche,
    subNiche: detectedSubNiche,
    confidence,
    signals: top.matchedKeywords.slice(0, 5),
  };
}
