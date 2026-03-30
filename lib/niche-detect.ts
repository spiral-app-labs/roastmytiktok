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

// Keyword signals mapped to niches. Order matters: first match with highest signal count wins.
const NICHE_SIGNALS: Record<NicheCategory, { keywords: string[]; subNiches: Record<string, string[]> }> = {
  comedy: {
    keywords: ['funny', 'comedy', 'joke', 'skit', 'prank', 'humor', 'laugh', 'hilarious', 'meme', 'parody', 'satire', 'standup', 'relatable', 'pov', 'acting', 'impression', 'roast'],
    subNiches: {
      'skit': ['skit', 'acting', 'pov', 'scene'],
      'standup': ['standup', 'stand up', 'comedy set', 'mic'],
      'prank': ['prank', 'reaction', 'surprise'],
      'meme': ['meme', 'trend', 'viral', 'relatable'],
      'impression': ['impression', 'impersonation', 'celebrity'],
    },
  },
  education: {
    keywords: ['learn', 'tutorial', 'howto', 'how to', 'tip', 'tips', 'hack', 'hacks', 'explained', 'guide', 'lesson', 'teach', 'study', 'school', 'college', 'university', 'knowledge', 'facts', 'didyouknow', 'science', 'history', 'psychology', 'mindset'],
    subNiches: {
      'science': ['science', 'biology', 'chemistry', 'physics', 'experiment'],
      'history': ['history', 'historical', 'ancient'],
      'psychology': ['psychology', 'mindset', 'mental', 'brain'],
      'study tips': ['study', 'exam', 'school', 'college', 'university'],
      'life hacks': ['hack', 'hacks', 'lifehack', 'tips'],
    },
  },
  lifestyle: {
    keywords: ['lifestyle', 'vlog', 'daily', 'routine', 'morning', 'grwm', 'get ready', 'aesthetic', 'dayinmylife', 'day in my life', 'minimalist', 'productive', 'self care', 'selfcare', 'wellness', 'journal'],
    subNiches: {
      'daily vlog': ['vlog', 'daily', 'dayinmylife', 'day in my life'],
      'grwm': ['grwm', 'get ready', 'getting ready'],
      'routine': ['routine', 'morning', 'night', 'productive'],
      'aesthetic': ['aesthetic', 'minimalist', 'cozy'],
    },
  },
  fitness: {
    keywords: ['fitness', 'workout', 'gym', 'exercise', 'gains', 'bulk', 'cut', 'protein', 'muscle', 'lift', 'squat', 'deadlift', 'bench', 'cardio', 'running', 'yoga', 'pilates', 'crossfit', 'bodybuilding', 'weightloss', 'weight loss', 'transformation', 'abs'],
    subNiches: {
      'weightlifting': ['lift', 'squat', 'deadlift', 'bench', 'bodybuilding', 'gains'],
      'yoga': ['yoga', 'stretch', 'flexibility', 'pilates'],
      'running': ['running', 'marathon', 'cardio', 'jog'],
      'weight loss': ['weightloss', 'weight loss', 'transformation', 'cut'],
      'workout routine': ['workout', 'exercise', 'gym', 'routine'],
    },
  },
  beauty: {
    keywords: ['beauty', 'makeup', 'skincare', 'skin', 'foundation', 'concealer', 'mascara', 'lips', 'eyeshadow', 'contour', 'glow', 'serum', 'moisturizer', 'sunscreen', 'acne', 'dermatologist', 'nails', 'hair', 'hairstyle'],
    subNiches: {
      'makeup tutorial': ['makeup', 'foundation', 'concealer', 'eyeshadow', 'contour', 'mascara'],
      'skincare': ['skincare', 'skin', 'serum', 'moisturizer', 'sunscreen', 'acne', 'dermatologist'],
      'nails': ['nails', 'manicure', 'nail art'],
      'hair': ['hair', 'hairstyle', 'haircare', 'curls'],
    },
  },
  tech: {
    keywords: ['tech', 'technology', 'app', 'iphone', 'android', 'gadget', 'coding', 'programming', 'software', 'ai', 'artificial intelligence', 'startup', 'saas', 'review', 'unboxing', 'setup', 'desk', 'laptop', 'pc', 'gaming setup', 'developer', 'code'],
    subNiches: {
      'app review': ['app', 'review', 'software'],
      'coding': ['coding', 'programming', 'developer', 'code', 'software'],
      'gadget review': ['gadget', 'unboxing', 'review', 'setup'],
      'ai': ['ai', 'artificial intelligence', 'chatgpt', 'machine learning'],
      'desk setup': ['setup', 'desk', 'pc', 'laptop'],
    },
  },
  food: {
    keywords: ['food', 'recipe', 'cooking', 'cook', 'baking', 'bake', 'meal', 'kitchen', 'chef', 'restaurant', 'eat', 'eating', 'mukbang', 'foodie', 'asmr', 'taste', 'review', 'snack', 'dinner', 'lunch', 'breakfast', 'healthy', 'protein'],
    subNiches: {
      'recipe tutorial': ['recipe', 'cooking', 'cook', 'baking', 'bake', 'meal'],
      'mukbang': ['mukbang', 'eating', 'asmr'],
      'food review': ['review', 'restaurant', 'taste', 'trying'],
      'meal prep': ['meal prep', 'healthy', 'protein', 'prep'],
    },
  },
  finance: {
    keywords: ['finance', 'money', 'investing', 'invest', 'stocks', 'crypto', 'bitcoin', 'budget', 'saving', 'passive income', 'side hustle', 'rich', 'wealth', 'financial', 'credit', 'debt', 'mortgage', 'real estate', 'entrepreneur', 'business'],
    subNiches: {
      'investing': ['investing', 'invest', 'stocks', 'crypto', 'bitcoin', 'portfolio'],
      'budgeting': ['budget', 'saving', 'debt', 'credit'],
      'real estate': ['real estate', 'mortgage', 'property', 'house'],
      'side hustle': ['side hustle', 'passive income', 'entrepreneur', 'business'],
    },
  },
  travel: {
    keywords: ['travel', 'trip', 'vacation', 'explore', 'adventure', 'destination', 'hotel', 'flight', 'airport', 'beach', 'hiking', 'backpacking', 'road trip', 'tourist', 'wanderlust', 'country', 'city'],
    subNiches: {
      'budget travel': ['budget', 'cheap', 'backpacking', 'hostel'],
      'luxury travel': ['luxury', 'hotel', 'resort', 'first class'],
      'adventure': ['hiking', 'adventure', 'explore', 'camping'],
      'city guide': ['city', 'guide', 'hidden gems', 'things to do'],
    },
  },
  gaming: {
    keywords: ['gaming', 'game', 'gamer', 'gameplay', 'stream', 'twitch', 'xbox', 'playstation', 'ps5', 'nintendo', 'switch', 'pc gaming', 'fortnite', 'minecraft', 'valorant', 'apex', 'cod', 'esports', 'speedrun', 'walkthrough', 'lets play'],
    subNiches: {
      'gameplay': ['gameplay', 'lets play', 'walkthrough', 'stream'],
      'game review': ['review', 'rating', 'recommendation'],
      'esports': ['esports', 'competitive', 'tournament', 'ranked'],
      'tips and tricks': ['tips', 'tricks', 'guide', 'tutorial', 'speedrun'],
    },
  },
  parenting: {
    keywords: ['parenting', 'parent', 'mom', 'dad', 'baby', 'toddler', 'kids', 'children', 'family', 'momlife', 'dadlife', 'pregnancy', 'newborn', 'motherhood', 'fatherhood', 'momtok'],
    subNiches: {
      'baby': ['baby', 'newborn', 'infant', 'pregnancy'],
      'toddler': ['toddler', 'kids', 'children'],
      'mom life': ['mom', 'momlife', 'motherhood', 'momtok'],
      'dad life': ['dad', 'dadlife', 'fatherhood'],
    },
  },
  fashion: {
    keywords: ['fashion', 'outfit', 'ootd', 'style', 'thrift', 'haul', 'shopping', 'closet', 'wardrobe', 'streetwear', 'designer', 'luxury', 'vintage', 'trend', 'dress', 'sneakers', 'accessories'],
    subNiches: {
      'outfit ideas': ['outfit', 'ootd', 'style', 'look'],
      'thrift': ['thrift', 'vintage', 'secondhand', 'haul'],
      'streetwear': ['streetwear', 'sneakers', 'hypebeast'],
      'luxury fashion': ['luxury', 'designer', 'gucci', 'louis'],
      'haul': ['haul', 'shopping', 'try on'],
    },
  },
  pets: {
    keywords: ['pet', 'pets', 'dog', 'cat', 'puppy', 'kitten', 'animal', 'animals', 'doggo', 'pupper', 'cute', 'rescue', 'adoption', 'vet', 'training', 'breed'],
    subNiches: {
      'dogs': ['dog', 'puppy', 'doggo', 'pupper'],
      'cats': ['cat', 'kitten', 'kitty'],
      'training': ['training', 'tricks', 'obedience'],
      'rescue': ['rescue', 'adoption', 'shelter'],
    },
  },
  diy: {
    keywords: ['diy', 'craft', 'handmade', 'build', 'project', 'woodworking', 'paint', 'decor', 'home', 'renovation', 'upcycle', 'repurpose', 'sewing', 'knitting', 'crochet', 'maker'],
    subNiches: {
      'home decor': ['decor', 'home', 'room', 'renovation'],
      'woodworking': ['woodworking', 'build', 'wood', 'furniture'],
      'crafts': ['craft', 'handmade', 'sewing', 'knitting', 'crochet'],
      'upcycle': ['upcycle', 'repurpose', 'thrift flip'],
    },
  },
  music: {
    keywords: ['music', 'song', 'singing', 'sing', 'rapper', 'rap', 'beat', 'producer', 'guitar', 'piano', 'drums', 'cover', 'original', 'studio', 'recording', 'artist', 'musician', 'concert', 'band', 'dj'],
    subNiches: {
      'covers': ['cover', 'singing', 'sing'],
      'original music': ['original', 'song', 'wrote', 'studio', 'recording'],
      'production': ['producer', 'beat', 'producing', 'dj'],
      'instrument': ['guitar', 'piano', 'drums', 'bass', 'instrument'],
    },
  },
};

/**
 * Detect the niche of a TikTok video from available text signals.
 * Uses caption, hashtags, and transcript to score each niche category.
 */
export function detectNiche(signals: {
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

  // Score each niche by counting keyword matches
  const scores: { niche: NicheCategory; score: number; matchedKeywords: string[] }[] = [];

  for (const niche of NICHE_CATEGORIES) {
    const { keywords } = NICHE_SIGNALS[niche];
    const matched: string[] = [];
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matched.push(kw);
      }
    }
    if (matched.length > 0) {
      scores.push({ niche, score: matched.length, matchedKeywords: matched });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // If audio is primarily music with no speech, boost music niche
  if (signals.audioType === 'music') {
    const musicEntry = scores.find(s => s.niche === 'music');
    if (musicEntry) {
      musicEntry.score += 3;
    } else {
      scores.push({ niche: 'music', score: 3, matchedKeywords: ['audio: music-only'] });
    }
    scores.sort((a, b) => b.score - a.score);
  }

  if (scores.length === 0) {
    return {
      niche: 'lifestyle', // default fallback — most generic niche
      subNiche: null,
      confidence: 'low',
      signals: ['No clear niche signals detected; defaulting to lifestyle'],
    };
  }

  const top = scores[0];
  const confidence: NicheDetection['confidence'] =
    top.score >= 5 ? 'high' : top.score >= 3 ? 'medium' : 'low';

  // Detect sub-niche
  const { subNiches } = NICHE_SIGNALS[top.niche];
  let detectedSubNiche: string | null = null;
  let bestSubScore = 0;

  for (const [subName, subKeywords] of Object.entries(subNiches)) {
    const subScore = subKeywords.filter(kw => text.includes(kw)).length;
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
