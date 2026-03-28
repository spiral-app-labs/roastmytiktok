import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://eayiazyiotnkggnsvhto.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ViralPattern {
  hook_type: string;
  hook_text_example: string;
  category: string;
  why_it_works: string;
  avg_view_multiplier: number;
  engagement_pattern: string;
  best_for_niches: string[];
  avoid_when: string;
}

const patterns: ViralPattern[] = [
  // ── CURIOSITY GAP ──
  {
    hook_type: 'curiosity_gap',
    hook_text_example: 'I did X for 30 days and here\'s what happened',
    category: 'hook',
    why_it_works: 'Zeigarnik effect — the brain cannot let go of incomplete information. Withholding the outcome forces viewers to watch through to resolution, dramatically boosting watch time.',
    avg_view_multiplier: 3.2,
    engagement_pattern: 'High watch-through rate (70%+), moderate shares, low early drop-off. Comments asking for the result drive algorithmic boost.',
    best_for_niches: ['fitness', 'self-improvement', 'finance', 'beauty', 'experiments', 'lifestyle'],
    avoid_when: 'The payoff is weak or anticlimactic — viewers feel cheated and leave angry comments that tank future reach.',
  },
  {
    hook_type: 'curiosity_gap',
    hook_text_example: 'Nobody told me this would happen when I moved to [city]',
    category: 'hook',
    why_it_works: 'Combines personal narrative with information asymmetry. Viewers assume insider knowledge they lack, creating FOMO-driven completion.',
    avg_view_multiplier: 2.8,
    engagement_pattern: 'Strong saves and shares as people tag friends in similar situations. Comments become a shared experience thread.',
    best_for_niches: ['travel', 'relocation', 'lifestyle', 'expat content', 'real estate'],
    avoid_when: 'The reveal is something everyone already knows — it reads as clickbait and erodes trust.',
  },
  {
    hook_type: 'curiosity_gap',
    hook_text_example: 'The reason your [X] isn\'t working (and it\'s not what you think)',
    category: 'hook',
    why_it_works: 'Dual curiosity trigger: identifies a pain point AND promises a non-obvious explanation. Viewers self-select as having the problem, increasing relevance.',
    avg_view_multiplier: 3.5,
    engagement_pattern: 'Very high saves (people bookmark solutions). Comments debate the answer, driving engagement loops.',
    best_for_niches: ['fitness', 'skincare', 'tech', 'cooking', 'business', 'productivity'],
    avoid_when: 'You don\'t actually have a novel insight — generic advice destroys credibility.',
  },

  // ── CONTROVERSY ──
  {
    hook_type: 'controversy',
    hook_text_example: 'Unpopular opinion: [statement]',
    category: 'hook',
    why_it_works: 'Triggers the brain\'s threat detection system — disagreement activates amygdala response, making it nearly impossible to scroll past. Comments flood in from both sides.',
    avg_view_multiplier: 4.1,
    engagement_pattern: 'Massive comment volume (10-50x normal), high shares as people tag friends to argue. Comment wars keep the video in algorithmic rotation for days.',
    best_for_niches: ['food', 'fashion', 'relationships', 'tech', 'pop culture', 'sports'],
    avoid_when: 'The opinion is genuinely harmful or bigoted — controversy should spark debate, not harm. Also avoid if your brand requires consensus.',
  },
  {
    hook_type: 'controversy',
    hook_text_example: 'I\'m going to get hate for this but [opinion]',
    category: 'hook',
    why_it_works: 'Pre-framing as controversial creates anticipation bias. The disclaimer itself functions as a hook — viewers expect something shocking.',
    avg_view_multiplier: 3.6,
    engagement_pattern: 'Comments split into defenders and attackers. Duets and stitches multiply reach beyond original audience.',
    best_for_niches: ['lifestyle', 'parenting', 'career advice', 'fitness', 'dating'],
    avoid_when: 'The actual opinion is mild — the buildup creates expectations that boring takes can\'t meet.',
  },
  {
    hook_type: 'controversy',
    hook_text_example: '[Popular thing] is actually terrible and here\'s proof',
    category: 'hook',
    why_it_works: 'Attacks identity-linked preferences, triggering defensive engagement. People who love the thing MUST comment to defend it.',
    avg_view_multiplier: 4.5,
    engagement_pattern: 'Extremely high comment rate and duets. Negative engagement counts the same as positive for the algorithm.',
    best_for_niches: ['food reviews', 'tech reviews', 'travel', 'entertainment', 'gaming'],
    avoid_when: 'You\'re attacking something sacred to your core audience — controversy with outsiders helps; alienating your base kills growth.',
  },

  // ── TRANSFORMATION ──
  {
    hook_type: 'transformation',
    hook_text_example: 'Before vs after [X]',
    category: 'hook',
    why_it_works: 'Visual contrast triggers dopamine through novelty detection. The brain is hardwired to notice change — dramatic transformations hijack attention.',
    avg_view_multiplier: 2.9,
    engagement_pattern: 'High shares and saves. Comments request tutorials/details. Strong replay rate as people re-watch the transformation moment.',
    best_for_niches: ['beauty', 'fitness', 'home renovation', 'fashion', 'art', 'cooking'],
    avoid_when: 'The transformation is minor or requires misleading angles/lighting tricks — audiences are savvy and will call it out.',
  },
  {
    hook_type: 'transformation',
    hook_text_example: 'Watch this [thing] go from trash to treasure',
    category: 'hook',
    why_it_works: 'Combines curiosity with aspirational content. The journey narrative keeps viewers engaged across the full video duration.',
    avg_view_multiplier: 3.1,
    engagement_pattern: 'Strong watch-through and saves. Comments often ask "where did you get that" or "how much did this cost" — practical engagement.',
    best_for_niches: ['DIY', 'upcycling', 'thrift flips', 'restoration', 'home decor'],
    avoid_when: 'The process is boring or too long — transformation hooks need a satisfying payoff within TikTok\'s attention window.',
  },

  // ── POV ──
  {
    hook_type: 'pov',
    hook_text_example: 'POV: you just [relatable scenario]',
    category: 'hook',
    why_it_works: 'Identity-based hook triggers mirror neurons. Viewers see themselves in the scenario, creating instant emotional connection and self-referential processing.',
    avg_view_multiplier: 2.7,
    engagement_pattern: 'High shares ("this is so me") and tags. Comment section becomes a shared experience thread, driving community building.',
    best_for_niches: ['comedy', 'relationships', 'work life', 'student life', 'parenting', 'Gen Z culture'],
    avoid_when: 'The scenario is too niche or doesn\'t resonate broadly — POV hooks need mass relatability to work.',
  },
  {
    hook_type: 'pov',
    hook_text_example: 'POV: your [family member] catches you [embarrassing thing]',
    category: 'hook',
    why_it_works: 'Combines relatability with humor and mild embarrassment — viewers laugh because they\'ve been there. Social scenarios trigger strongest identification.',
    avg_view_multiplier: 2.5,
    engagement_pattern: 'Very high share rate. Comments are stories of similar experiences, creating engagement cascades.',
    best_for_niches: ['comedy', 'family content', 'lifestyle', 'cultural humor'],
    avoid_when: 'You\'re not a natural actor — forced POV content reads as cringe and gets negative engagement.',
  },
  {
    hook_type: 'pov',
    hook_text_example: 'POV: you\'re the only one who [understands/does X]',
    category: 'hook',
    why_it_works: 'Creates in-group identification. Viewers who relate feel seen and validated, forming parasocial loyalty.',
    avg_view_multiplier: 2.4,
    engagement_pattern: 'Strong follow conversion — viewers who identify with the POV follow for more. High save rate.',
    best_for_niches: ['niche hobbies', 'career-specific humor', 'introvert content', 'neurodivergent community'],
    avoid_when: 'The "only one" claim is too common — it needs to feel genuinely specific to resonate.',
  },

  // ── CHALLENGE ──
  {
    hook_type: 'challenge',
    hook_text_example: '[X] challenge — can you do it?',
    category: 'hook',
    why_it_works: 'Activates competitive instinct and social proof. Challenges are inherently participatory — viewers want to prove they can do it, driving UGC and duets.',
    avg_view_multiplier: 3.8,
    engagement_pattern: 'Exponential reach through duets and recreations. Original creator gets attribution on every copy. Comments are attempts/results.',
    best_for_niches: ['fitness', 'dance', 'comedy', 'cooking', 'art', 'music'],
    avoid_when: 'The challenge is too easy (no bragging rights) or too hard (nobody can do it, no participation).',
  },
  {
    hook_type: 'challenge',
    hook_text_example: 'Try this with your [friend/partner] and see what happens',
    category: 'hook',
    why_it_works: 'Social challenges multiply reach by requiring a second person. Each participant creates their own video, branching the content tree.',
    avg_view_multiplier: 3.4,
    engagement_pattern: 'Very high duet and stitch rate. Comments tag friends, creating organic distribution.',
    best_for_niches: ['relationships', 'friendship content', 'family', 'comedy', 'couples'],
    avoid_when: 'The challenge requires specific equipment or settings that limit participation.',
  },

  // ── PATTERN INTERRUPT ──
  {
    hook_type: 'pattern_interrupt',
    hook_text_example: '[Opens with something visually unexpected in first frame]',
    category: 'hook',
    why_it_works: 'Breaks the scroll pattern by violating visual expectations. The orienting response forces attention — the brain must process the unexpected stimulus before it can decide to scroll.',
    avg_view_multiplier: 3.0,
    engagement_pattern: 'Very low 1-second drop-off rate. High initial retention that cascades into full watch-through if content delivers.',
    best_for_niches: ['comedy', 'magic', 'cooking', 'art', 'science', 'fashion'],
    avoid_when: 'The interrupt doesn\'t connect to the content — random shock without payoff feels like bait-and-switch.',
  },
  {
    hook_type: 'pattern_interrupt',
    hook_text_example: 'Wait for it... [unexpected visual transition]',
    category: 'hook',
    why_it_works: 'The "wait for it" prompt combined with visual novelty creates anticipation. Dopamine spikes at the unexpected transition.',
    avg_view_multiplier: 2.6,
    engagement_pattern: 'High replay rate — viewers want to see the transition again. Shares spike for particularly creative transitions.',
    best_for_niches: ['editing/filmmaking', 'art', 'magic', 'cooking reveals', 'outfit changes'],
    avoid_when: 'The "wait" is too long — if viewers wait 10+ seconds for a mediocre payoff, they feel tricked.',
  },
  {
    hook_type: 'pattern_interrupt',
    hook_text_example: '[Starts mid-action with high energy and no context]',
    category: 'hook',
    why_it_works: 'In medias res storytelling. Dropping viewers into action creates immediate tension and confusion that demands resolution.',
    avg_view_multiplier: 2.8,
    engagement_pattern: 'Low drop-off in first 3 seconds. Comments asking "wait what happened" drive engagement signals.',
    best_for_niches: ['storytime', 'comedy sketches', 'sports', 'adventure', 'extreme activities'],
    avoid_when: 'The context never becomes clear — confusion without resolution is just confusing.',
  },

  // ── DIRECT QUESTION ──
  {
    hook_type: 'direct_question',
    hook_text_example: 'Why does nobody talk about [X]?',
    category: 'hook',
    why_it_works: 'Exploits information gap bias and novelty-seeking. The implied "everyone is missing this" positions the creator as an insider with exclusive knowledge.',
    avg_view_multiplier: 2.9,
    engagement_pattern: 'High comment rate — people either agree (validating) or explain why it IS talked about (debate). Both drive algorithmic signal.',
    best_for_niches: ['education', 'science', 'history', 'health', 'finance', 'niche interests'],
    avoid_when: 'People DO talk about it frequently — you\'ll get called out in comments and look uninformed.',
  },
  {
    hook_type: 'direct_question',
    hook_text_example: 'Am I the only one who [common experience]?',
    category: 'hook',
    why_it_works: 'False uniqueness bias — viewers love discovering others share their "unique" experience. The rush of "it\'s not just me!" drives engagement.',
    avg_view_multiplier: 2.5,
    engagement_pattern: 'Very high comment rate with "YES" and personal stories. Creates community feeling that converts to follows.',
    best_for_niches: ['lifestyle', 'mental health', 'daily routines', 'cultural observations', 'work life'],
    avoid_when: 'The experience is literally universal (eating food, breathing) — it needs to feel specific enough to be validating.',
  },
  {
    hook_type: 'direct_question',
    hook_text_example: 'What would you do if [hypothetical scenario]?',
    category: 'hook',
    why_it_works: 'Activates the brain\'s simulation circuits. Hypotheticals are irresistible because the brain automatically generates an answer before you can scroll.',
    avg_view_multiplier: 2.7,
    engagement_pattern: 'Extremely high comment rate. Each comment is an answer, creating a poll-like engagement pattern.',
    best_for_niches: ['relationships', 'ethics', 'finance', 'career', 'hypothetical scenarios'],
    avoid_when: 'The scenario is too outlandish to feel real — grounded hypotheticals outperform fantasy ones.',
  },

  // ── COUNTER NARRATIVE ──
  {
    hook_type: 'counter_narrative',
    hook_text_example: 'Stop doing [common thing] — here\'s why',
    category: 'hook',
    why_it_works: 'Authority positioning through contrarianism. Telling someone to STOP triggers loss aversion — they must know what they\'re risking by continuing.',
    avg_view_multiplier: 3.3,
    engagement_pattern: 'High saves (actionable advice), strong comment debate. "I\'ve been doing this wrong" comments validate and amplify.',
    best_for_niches: ['fitness', 'skincare', 'cooking', 'productivity', 'finance', 'career'],
    avoid_when: 'You can\'t back it up with evidence or credentials — baseless contrarianism gets torn apart in comments.',
  },
  {
    hook_type: 'counter_narrative',
    hook_text_example: 'Everything you know about [X] is wrong',
    category: 'hook',
    why_it_works: 'Maximal cognitive dissonance. This hook challenges the viewer\'s entire knowledge framework, making it psychologically impossible to ignore.',
    avg_view_multiplier: 3.7,
    engagement_pattern: 'Polarizing engagement — believers save and share, skeptics comment aggressively. Both behaviors feed the algorithm.',
    best_for_niches: ['science', 'health', 'history', 'nutrition', 'fitness myths', 'education'],
    avoid_when: 'It\'s actual misinformation — this hook carries responsibility because of its authority framing.',
  },
  {
    hook_type: 'counter_narrative',
    hook_text_example: 'Professionals never [do X] — here\'s what they do instead',
    category: 'hook',
    why_it_works: 'Insider knowledge + authority gap. Viewers want to be "in the know" and feel they\'re getting professional secrets.',
    avg_view_multiplier: 3.0,
    engagement_pattern: 'Very high save rate — people bookmark professional tips. Comments ask follow-up questions, extending engagement.',
    best_for_niches: ['cooking', 'photography', 'design', 'fitness', 'business', 'any skill-based niche'],
    avoid_when: 'You\'re not actually a professional — audiences verify credentials quickly on TikTok.',
  },

  // ── SOCIAL PROOF ──
  {
    hook_type: 'social_proof',
    hook_text_example: 'I used [X] and got [specific result]',
    category: 'hook',
    why_it_works: 'Specific results activate credibility circuits. Numbers and concrete outcomes feel trustworthy. The brain processes "I gained 10k followers" differently than "I grew my account."',
    avg_view_multiplier: 2.6,
    engagement_pattern: 'High saves and follows. Comments ask "how" and "what exactly did you do" — creating Q&A engagement loops.',
    best_for_niches: ['business', 'marketing', 'fitness', 'skincare', 'productivity', 'investing'],
    avoid_when: 'Results are exaggerated or fabricated — TikTok audiences are extremely good at detecting fake social proof.',
  },
  {
    hook_type: 'social_proof',
    hook_text_example: 'This [product/method] changed my life — here\'s my honest review after [time]',
    category: 'hook',
    why_it_works: 'Time-gated reviews signal genuine experience. "After 6 months" carries more weight than "just tried this." Combines social proof with delayed gratification.',
    avg_view_multiplier: 2.4,
    engagement_pattern: 'High saves. Comments ask about specific details and long-term results. Creates trust-based following.',
    best_for_niches: ['product reviews', 'skincare', 'tech', 'fitness equipment', 'subscription services'],
    avoid_when: 'It\'s an obvious sponsored post disguised as organic — audiences reject inauthentic social proof aggressively.',
  },

  // ── EDUCATIONAL TEASE ──
  {
    hook_type: 'educational_tease',
    hook_text_example: '3 things [experts] never tell you about [topic]',
    category: 'hook',
    why_it_works: 'Triple-layer hook: listicle structure (completion psychology), insider framing (exclusivity), topic specificity (self-selection). The number creates a clear contract with the viewer.',
    avg_view_multiplier: 3.1,
    engagement_pattern: 'Highest save rate of any hook type. Watch-through is strong because viewers mentally track "1 of 3... 2 of 3..." Comments debate additional items.',
    best_for_niches: ['education', 'finance', 'health', 'career', 'science', 'psychology'],
    avoid_when: 'The "secrets" are common knowledge — educational tease hooks must deliver genuine value or they destroy trust.',
  },
  {
    hook_type: 'educational_tease',
    hook_text_example: 'You\'re making this common mistake with [X] and it\'s costing you',
    category: 'hook',
    why_it_works: 'Loss aversion is 2x stronger than gain anticipation. Telling someone they\'re losing something they didn\'t know they were losing creates urgent attention.',
    avg_view_multiplier: 3.4,
    engagement_pattern: 'High saves and shares to friends. Comments split between "I do this!" (validation) and "this is wrong" (debate).',
    best_for_niches: ['finance', 'fitness', 'skincare', 'cooking', 'career', 'productivity'],
    avoid_when: 'The "cost" is trivial — overstating consequences for minor mistakes erodes credibility.',
  },
  {
    hook_type: 'educational_tease',
    hook_text_example: 'The science behind why [everyday thing] works',
    category: 'hook',
    why_it_works: 'Takes something familiar and re-frames it as mysterious. The brain craves understanding of things it takes for granted.',
    avg_view_multiplier: 2.8,
    engagement_pattern: 'Strong shares ("did you know this?") and saves. Comments add additional facts, creating collaborative knowledge-building.',
    best_for_niches: ['science', 'psychology', 'cooking chemistry', 'fitness science', 'technology'],
    avoid_when: 'The explanation is wrong or oversimplified — science audiences are rigorous and will correct you publicly.',
  },

  // ── STORYTIME ──
  {
    hook_type: 'storytime',
    hook_text_example: 'The day I [dramatic event]...',
    category: 'hook',
    why_it_works: 'Narrative transportation — the brain literally enters a different processing mode for stories. Neural coupling causes viewers to experience the story as if it\'s happening to them.',
    avg_view_multiplier: 3.0,
    engagement_pattern: 'Highest watch-through rates of any format. Comments ask for parts 2, 3, etc. Creates serial content opportunities.',
    best_for_niches: ['personal stories', 'career', 'travel', 'relationships', 'entrepreneurship', 'survival'],
    avoid_when: 'The story doesn\'t have a clear arc or payoff — rambling stories lose viewers fast despite the hook.',
  },
  {
    hook_type: 'storytime',
    hook_text_example: 'Story time: how I went from [bad situation] to [good outcome]',
    category: 'hook',
    why_it_works: 'Hero\'s journey archetype in miniature. Underdog stories activate empathy circuits and aspirational identification simultaneously.',
    avg_view_multiplier: 3.2,
    engagement_pattern: 'High follow conversion — viewers want to follow the journey. Comments share their own stories. Saves for motivation.',
    best_for_niches: ['entrepreneurship', 'fitness transformation', 'career change', 'education', 'personal growth'],
    avoid_when: 'The transformation feels fake or privileged — "how I went from rich to richer" doesn\'t have underdog appeal.',
  },
  {
    hook_type: 'storytime',
    hook_text_example: 'I was today years old when I found out [surprising fact about personal life]',
    category: 'hook',
    why_it_works: 'Combines storytime with revelation. The phrase "today years old" is a recognized TikTok signal that primes viewers for a genuine surprise.',
    avg_view_multiplier: 2.6,
    engagement_pattern: 'High share rate — "wait what??" reaction shares. Comments are people sharing when they learned similar things.',
    best_for_niches: ['personal stories', 'family', 'cultural discoveries', 'history', 'life hacks'],
    avoid_when: 'The discovery isn\'t actually surprising — the bar for genuine surprise is high on a platform full of revelations.',
  },

  // ── LISTICLE ──
  {
    hook_type: 'listicle',
    hook_text_example: '5 reasons why [X]',
    category: 'hook',
    why_it_works: 'Completion psychology (Zeigarnik effect applied to lists). The brain needs to see all items. Numbers set clear expectations, reducing bounce from uncertainty.',
    avg_view_multiplier: 2.5,
    engagement_pattern: 'Strong watch-through driven by completion urge. Comments debate ranking or add items. High save rate for reference.',
    best_for_niches: ['education', 'product reviews', 'travel', 'career advice', 'lifestyle tips'],
    avoid_when: 'The list has padding — if only 3 of 5 reasons are good, viewers feel cheated and comment negatively.',
  },
  {
    hook_type: 'listicle',
    hook_text_example: 'Ranking every [X] from worst to best',
    category: 'hook',
    why_it_works: 'Rankings trigger competitive comparison instinct. Viewers MUST see where their favorite lands. Disagreement is built into the format.',
    avg_view_multiplier: 3.3,
    engagement_pattern: 'Very high comment rate — "how is [X] not number 1?!" Comments are long and passionate. Duets with counter-rankings multiply reach.',
    best_for_niches: ['food', 'gaming', 'music', 'movies', 'products', 'travel destinations'],
    avoid_when: 'You\'re ranking something your audience cares deeply about and your rankings are poorly justified.',
  },
  {
    hook_type: 'listicle',
    hook_text_example: 'Things in [category] that just hit different',
    category: 'hook',
    why_it_works: 'Casual listicle format combined with the "hit different" meme phrase. Low-pressure hook that feels relatable rather than educational.',
    avg_view_multiplier: 2.3,
    engagement_pattern: 'High share and tag rate. Comments add to the list. Creates community-driven content.',
    best_for_niches: ['nostalgia', 'food', 'music', 'seasonal content', 'cultural moments', 'Gen Z culture'],
    avoid_when: 'The items are too generic or don\'t actually "hit different" — the casualness of the format demands genuine curation.',
  },

  // ── BONUS PATTERNS (cross-category) ──
  {
    hook_type: 'curiosity_gap',
    hook_text_example: 'I spent $[amount] on [X] so you don\'t have to',
    category: 'hook',
    why_it_works: 'Vicarious spending + consumer protection. Viewers get the outcome without the risk. The specific dollar amount adds concrete credibility.',
    avg_view_multiplier: 3.0,
    engagement_pattern: 'High saves ("shopping list" behavior). Comments ask about specific products. Strong affiliate/monetization potential.',
    best_for_niches: ['product reviews', 'tech', 'beauty', 'fitness', 'cooking gadgets'],
    avoid_when: 'The amount is small or the products are boring — the hook implies significant investment and interesting results.',
  },
  {
    hook_type: 'social_proof',
    hook_text_example: 'As a [professional title], here\'s what I actually think about [X]',
    category: 'hook',
    why_it_works: 'Authority + authenticity signal. Professional credentialing provides permission to trust. "Actually" implies previous information was wrong.',
    avg_view_multiplier: 2.8,
    engagement_pattern: 'High trust-based engagement. Comments ask professional questions. Strong follow conversion from niche audiences.',
    best_for_niches: ['medical', 'legal', 'financial', 'culinary', 'fitness', 'any credentialed field'],
    avoid_when: 'You\'re not actually credentialed or your opinion is irresponsible — professional hooks carry professional responsibility.',
  },
  {
    hook_type: 'challenge',
    hook_text_example: 'I bet you can\'t watch this without [reaction]',
    category: 'hook',
    why_it_works: 'Direct psychological challenge. The viewer\'s ego is now invested — they MUST watch to prove they won\'t react. Regardless of outcome, they watched the whole video.',
    avg_view_multiplier: 3.5,
    engagement_pattern: 'High completion rate. Comments declare success or failure. Often shared as a test for friends.',
    best_for_niches: ['comedy', 'satisfying content', 'cringe', 'scary', 'emotional', 'ASMR'],
    avoid_when: 'The content doesn\'t actually trigger the promised reaction — empty challenges feel manipulative.',
  },
  {
    hook_type: 'counter_narrative',
    hook_text_example: 'The [industry] doesn\'t want you to know this',
    category: 'hook',
    why_it_works: 'Conspiracy framing activates anti-establishment instinct. Creates an us-vs-them narrative where the viewer and creator are allied against a powerful entity.',
    avg_view_multiplier: 3.9,
    engagement_pattern: 'High shares (spreading "hidden" knowledge). Comments add their own "suppressed" facts. Can go viral in conspiracy-adjacent communities.',
    best_for_niches: ['health', 'finance', 'beauty industry', 'food industry', 'big tech'],
    avoid_when: 'It veers into actual conspiracy theory territory — there\'s a line between "industry insider tip" and "tinfoil hat content."',
  },
  {
    hook_type: 'educational_tease',
    hook_text_example: 'I analyzed 1000 [X] and found a pattern nobody noticed',
    category: 'hook',
    why_it_works: 'Data-driven authority combined with exclusivity. The large sample size signals rigor while "nobody noticed" creates information scarcity.',
    avg_view_multiplier: 3.6,
    engagement_pattern: 'Extremely high save rate. Comments request methodology or additional data. Strong credibility builder for creator brand.',
    best_for_niches: ['marketing', 'data science', 'business', 'social media strategy', 'finance', 'sports analytics'],
    avoid_when: 'You didn\'t actually analyze that many — audiences will ask for proof and methodology.',
  },
  {
    hook_type: 'pattern_interrupt',
    hook_text_example: '[Whispers] I probably shouldn\'t be showing you this',
    category: 'hook',
    why_it_works: 'Breaks audio pattern (whisper in a loud feed) + forbidden knowledge framing. Double interrupt — both sensory and psychological.',
    avg_view_multiplier: 3.2,
    engagement_pattern: 'Very high watch-through — the whisper creates intimacy that makes scrolling away feel like leaving a secret. High share rate.',
    best_for_niches: ['behind-the-scenes', 'industry secrets', 'restricted access', 'hidden gems', 'exclusive content'],
    avoid_when: 'The "secret" is mundane — the whisper-secret framing demands genuinely exclusive or interesting content.',
  },
];

async function main() {
  console.log(`Seeding ${patterns.length} viral patterns...`);

  // Clear existing patterns
  const { error: deleteError } = await supabase
    .from('rmt_viral_patterns')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all rows

  if (deleteError) {
    console.error('Failed to clear existing patterns:', deleteError);
  }

  // Insert in batches of 10
  for (let i = 0; i < patterns.length; i += 10) {
    const batch = patterns.slice(i, i + 10);
    const { error } = await supabase.from('rmt_viral_patterns').insert(batch);
    if (error) {
      console.error(`Failed to insert batch ${i / 10 + 1}:`, error);
    } else {
      console.log(`Inserted batch ${i / 10 + 1} (${batch.length} patterns)`);
    }
  }

  console.log('Done! Seeded viral patterns.');
}

main().catch(console.error);
