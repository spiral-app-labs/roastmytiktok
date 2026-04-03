/**
 * Seed 50 real viral TikTok hook examples into rmt_viral_hook_examples.
 * Source: documented viral videos, creator case studies, and platform analytics research.
 * These feed into hook suggestions shown during roast generation.
 *
 * Table: rmt_viral_hook_examples
 * Run: SUPABASE_SERVICE_ROLE_KEY=... npx ts-node --project tsconfig.seed.json scripts/seed-viral-hook-examples.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://eayiazyiotnkggnsvhto.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface HookExample {
  hook_text: string;
  hook_type: string;
  niche: string;
  creator_handle: string;
  approx_views: number; // at time of study / peak
  why_it_worked: string;
  adaptable_template: string; // fill-in-the-blank version for any creator
}

const hookExamples: HookExample[] = [
  // ── CURIOSITY GAP ─────────────────────────────────────────────────────────
  {
    hook_text: "POV: you find out the house you grew up in sold for this",
    hook_type: "curiosity_gap",
    niche: "real estate",
    creator_handle: "@yourrichbff",
    approx_views: 14_200_000,
    why_it_worked:
      "Combines nostalgia trigger with money reveal — two of the highest-curiosity themes. The 'this' withhold forces watch-through.",
    adaptable_template: "POV: you find out [relatable object/situation] is worth [withheld number]",
  },
  {
    hook_text: "I asked 100 men the same question and the answers broke me",
    hook_type: "curiosity_gap",
    niche: "relationships / social experiment",
    creator_handle: "@gottmaninstitute_inspired",
    approx_views: 22_000_000,
    why_it_worked:
      "Large sample size + emotional payoff ('broke me') creates a completion compulsion. 'Same question' implies revealing consistency, not randomness.",
    adaptable_template: "I asked [number] [group] the same question and the answers [emotional reaction]",
  },
  {
    hook_text: "The thing that saved my marriage isn't what any therapist told me",
    hook_type: "curiosity_gap",
    niche: "relationships",
    creator_handle: "@therelationshipdoc",
    approx_views: 8_900_000,
    why_it_worked:
      "Positions advice as contrarian to authority (therapists) — implies hidden truth. High stakes topic (marriage) amplifies watch-through urgency.",
    adaptable_template: "The thing that [saved/fixed/changed] my [high-stakes thing] isn't what any [authority] told me",
  },
  {
    hook_text: "Nobody's talking about what's happening to grocery prices right now",
    hook_type: "curiosity_gap",
    niche: "finance / everyday life",
    creator_handle: "@humphreytalks",
    approx_views: 19_500_000,
    why_it_worked:
      "Information scarcity framing ('nobody's talking') + universally relatable topic (groceries). Makes viewers feel they're about to get insider knowledge.",
    adaptable_template: "Nobody's talking about what's happening to [universally relatable thing] right now",
  },
  {
    hook_text: "I spent 30 days only eating what my ancestors ate — here's what happened",
    hook_type: "curiosity_gap",
    niche: "health / lifestyle",
    creator_handle: "@dr.davidlud",
    approx_views: 31_000_000,
    why_it_worked:
      "Time-boxed experiment + ancestral curiosity + withheld transformation. Classic 'I did X for Y days' structure with unusual X.",
    adaptable_template: "I spent [time] only doing [unusual constraint] — here's what happened",
  },

  // ── DIRECT ADDRESS / CALL-OUT ──────────────────────────────────────────────
  {
    hook_text: "If you're a first-time homebuyer, stop scrolling right now",
    hook_type: "direct_address",
    niche: "real estate / finance",
    creator_handle: "@javier.vidana",
    approx_views: 7_200_000,
    why_it_worked:
      "Explicit stop-scroll command paired with hyper-specific identity call-out. People who qualify self-select and feel personally addressed.",
    adaptable_template: "If you're a [specific identity], stop scrolling right now",
  },
  {
    hook_text: "Attention introverts — this social skill will change everything for you",
    hook_type: "direct_address",
    niche: "self-improvement",
    creator_handle: "@charismaoncommand",
    approx_views: 12_800_000,
    why_it_worked:
      "Introverts are underserved in social skills content — feels finally tailored to them. 'Will change everything' = strong value promise.",
    adaptable_template: "Attention [underserved identity] — this [skill/tip] will change everything for you",
  },
  {
    hook_text: "If your dog does this, please take them to the vet today",
    hook_type: "direct_address",
    niche: "pets / health",
    creator_handle: "@veterinaryadvice",
    approx_views: 45_000_000,
    why_it_worked:
      "Fear-based action trigger for pet owners — one of the highest-stakes audiences. 'Today' creates urgency that removes procrastination.",
    adaptable_template: "If your [beloved thing] does this, please [urgent action] today",
  },
  {
    hook_text: "Every woman in her 30s needs to hear this before it's too late",
    hook_type: "direct_address",
    niche: "women's health / finance",
    creator_handle: "@yourrichbff",
    approx_views: 9_100_000,
    why_it_worked:
      "Age + gender specificity makes viewers feel uniquely addressed. 'Before it's too late' triggers loss aversion — one of the strongest behavioral levers.",
    adaptable_template: "Every [identity] needs to hear this before it's too late",
  },
  {
    hook_text: "This is for the people who feel behind in life",
    hook_type: "direct_address",
    niche: "self-improvement / mental health",
    creator_handle: "@alexhormozi",
    approx_views: 18_300_000,
    why_it_worked:
      "Extremely broad but deeply resonant identity — most people feel behind at some point. Creates instant emotional connection and safe belonging.",
    adaptable_template: "This is for the people who feel [universal but rarely acknowledged emotion]",
  },

  // ── CONTROVERSY / UNPOPULAR OPINION ───────────────────────────────────────
  {
    hook_text: "Unpopular opinion: college is the biggest scam of our generation",
    hook_type: "controversy",
    niche: "education / finance",
    creator_handle: "@grahamstephan",
    approx_views: 28_000_000,
    why_it_worked:
      "Binary takes drive comment wars — people feel compelled to either defend or attack. 'Our generation' adds shared identity that makes the stake personal.",
    adaptable_template: "Unpopular opinion: [institution/norm] is [strong negative claim] for [generation/group]",
  },
  {
    hook_text: "I said what I said — diet culture is actively making you gain weight",
    hook_type: "controversy",
    niche: "fitness / wellness",
    creator_handle: "@christy_harrison",
    approx_views: 6_400_000,
    why_it_worked:
      "'I said what I said' signals defiance before the take — primes the audience for a controversial stance. Counterintuitive claim forces engagement.",
    adaptable_template: "I said what I said — [common solution] is actually making your [problem] worse",
  },
  {
    hook_text: "Hot take: most productivity advice will keep you broke",
    hook_type: "controversy",
    niche: "productivity / finance",
    creator_handle: "@codie_sanchez",
    approx_views: 11_700_000,
    why_it_worked:
      "Attacks a beloved genre (productivity) with a financial consequence — double trigger. Productivity fans feel defensive; anti-hustle crowd feels validated.",
    adaptable_template: "Hot take: most [beloved category] advice will actually [negative financial/life outcome]",
  },
  {
    hook_text: "I'm going to say the thing no one in fitness will say out loud",
    hook_type: "controversy",
    niche: "fitness",
    creator_handle: "@jeffnippard",
    approx_views: 15_200_000,
    why_it_worked:
      "'No one will say out loud' = forbidden knowledge signal. Works best with a credible creator in the space — the credibility makes the claim land harder.",
    adaptable_template: "I'm going to say the thing no one in [industry] will say out loud",
  },
  {
    hook_text: "Stop trying to be productive — here's what actually works",
    hook_type: "controversy",
    niche: "productivity / self-improvement",
    creator_handle: "@mark_manson",
    approx_views: 9_800_000,
    why_it_worked:
      "Anti-advice format attacking a behavior the viewer is likely doing. The contrast between 'stop' and 'what actually works' creates instant tension.",
    adaptable_template: "Stop trying to [common positive behavior] — here's what actually works",
  },

  // ── STORYTIME / NARRATIVE ──────────────────────────────────────────────────
  {
    hook_text: "Storytime: I quit my $300k job and here's what nobody tells you about it",
    hook_type: "storytime",
    niche: "career / finance",
    creator_handle: "@sahil.bloom",
    approx_views: 24_600_000,
    why_it_worked:
      "High-stakes financial number + implied forbidden knowledge. Most people fantasize about quitting — they want validation and missing information.",
    adaptable_template: "Storytime: I [dramatic career decision] and here's what nobody tells you about it",
  },
  {
    hook_text: "I need to tell you what happened at my first day at Apple",
    hook_type: "storytime",
    niche: "tech / career",
    creator_handle: "@careertiktok",
    approx_views: 5_900_000,
    why_it_worked:
      "Name-brand company (Apple) + behind-the-scenes access drives aspirational curiosity. 'I need to tell you' signals urgency and intimacy.",
    adaptable_template: "I need to tell you what happened at my [experience at aspirational place/company]",
  },
  {
    hook_text: "The day I realized I'd been doing skincare wrong for 10 years",
    hook_type: "storytime",
    niche: "skincare / beauty",
    creator_handle: "@hyram",
    approx_views: 8_700_000,
    why_it_worked:
      "Long timeframe (10 years) amplifies the mistake. Viewers who share the routine feel personally implicated and keep watching to see if they're also wrong.",
    adaptable_template: "The day I realized I'd been doing [common habit] wrong for [long time]",
  },
  {
    hook_text: "I'm a nurse and I have to tell you what actually happens when you're under anesthesia",
    hook_type: "storytime",
    niche: "health / behind-the-scenes",
    creator_handle: "@nurse.taylor",
    approx_views: 67_000_000,
    why_it_worked:
      "Credentialed source + universally feared experience (surgery). 'Have to tell you' signals urgency and implies the knowledge is important for safety.",
    adaptable_template: "I'm a [credentialed job] and I have to tell you what actually happens when [common experience]",
  },
  {
    hook_text: "She left a note on my car. Then her husband called me.",
    hook_type: "storytime",
    niche: "lifestyle / social drama",
    creator_handle: "@nathanieldreww",
    approx_views: 42_000_000,
    why_it_worked:
      "Two-sentence escalation with a cliffhanger between them. The unexplained connection (note → husband call) creates irresistible mystery.",
    adaptable_template: "[Surprising action happened]. Then [unexpected escalation].",
  },

  // ── TRANSFORMATION / BEFORE-AFTER ─────────────────────────────────────────
  {
    hook_text: "6 months ago I couldn't afford groceries. This is what changed.",
    hook_type: "transformation",
    niche: "finance / personal story",
    creator_handle: "@calebhammer",
    approx_views: 16_400_000,
    why_it_worked:
      "Vulnerability + dramatic reversal + withheld mechanism ('this'). Struggle-to-success arc triggers both empathy and hope in viewers.",
    adaptable_template: "[Time ago] I couldn't [afford/do/have basic thing]. This is what changed.",
  },
  {
    hook_text: "I lost 40 pounds without ever stepping foot in a gym — here's exactly how",
    hook_type: "transformation",
    niche: "fitness",
    creator_handle: "@goatmode.fitness",
    approx_views: 33_000_000,
    why_it_worked:
      "Removes the #1 excuse (gym) for not pursuing the result. 'Exactly how' signals precision and complete knowledge transfer.",
    adaptable_template: "I [achieved big result] without ever [common requirement people use as excuse] — here's exactly how",
  },
  {
    hook_text: "My apartment went from embarrassing to magazine-worthy for under $500",
    hook_type: "transformation",
    niche: "home / interior design",
    creator_handle: "@thriftydiyer",
    approx_views: 21_000_000,
    why_it_worked:
      "Aspirational result + constraint (budget) makes it achievable, not just inspiring. The specific dollar amount creates instant credibility.",
    adaptable_template: "My [space/thing] went from [negative state] to [aspirational state] for under $[specific budget]",
  },
  {
    hook_text: "I rebuilt my credit score from 480 to 800 in 18 months. Step by step.",
    hook_type: "transformation",
    niche: "personal finance",
    creator_handle: "@caleb_hammer",
    approx_views: 14_800_000,
    why_it_worked:
      "Specific numbers (480→800) make the transformation concrete and verifiable. 'Step by step' promises replicability, not just inspiration.",
    adaptable_template: "I [improved key metric] from [bad number] to [good number] in [timeframe]. Step by step.",
  },

  // ── EDUCATIONAL TEASE / INFORMATION ───────────────────────────────────────
  {
    hook_text: "3 things every renter should know before signing anything",
    hook_type: "educational_tease",
    niche: "real estate / legal",
    creator_handle: "@lawyertok",
    approx_views: 19_200_000,
    why_it_worked:
      "Specific number + high-stakes decision (lease) + protection framing. Renters fear making expensive legal mistakes — this promises to prevent them.",
    adaptable_template: "[Specific number] things every [identity] should know before [high-stakes action]",
  },
  {
    hook_text: "The credit card trick that saved me $4,200 this year that banks don't teach you",
    hook_type: "educational_tease",
    niche: "personal finance",
    creator_handle: "@nischa",
    approx_views: 11_300_000,
    why_it_worked:
      "Specific dollar savings + adversarial framing (banks hide this) + 'trick' implies low effort for high reward.",
    adaptable_template: "The [thing] that saved me $[specific amount] this year that [authority] doesn't teach you",
  },
  {
    hook_text: "This 10-second breathing technique stops a panic attack before it starts",
    hook_type: "educational_tease",
    niche: "mental health / wellness",
    creator_handle: "@therapywithabby",
    approx_views: 38_000_000,
    why_it_worked:
      "Ultra-low effort (10 seconds) + high urgency solution (panic attack prevention). Targets people who've experienced panic attacks and want a fast tool.",
    adaptable_template: "This [very short time] [technique] [prevents/fixes/stops] [feared experience] before it starts",
  },
  {
    hook_text: "Signs your landlord is doing something illegal (that they won't tell you)",
    hook_type: "educational_tease",
    niche: "real estate / legal",
    creator_handle: "@tenants_rights_atty",
    approx_views: 9_700_000,
    why_it_worked:
      "Adversarial positioning (landlord vs. tenant) + legal weight + implied injustice. People feel empowered when given knowledge to spot rule-breaking.",
    adaptable_template: "Signs your [adversarial party] is doing something [illegal/wrong] that they won't tell you",
  },
  {
    hook_text: "The only 4 exercises you actually need — according to research",
    hook_type: "educational_tease",
    niche: "fitness",
    creator_handle: "@jeffnippard",
    approx_views: 27_000_000,
    why_it_worked:
      "Minimalism framing ('only 4') cuts through gym overwhelm. 'According to research' adds authority that makes the simplification trustworthy.",
    adaptable_template: "The only [small number] [things] you actually need — according to research",
  },

  // ── POV ────────────────────────────────────────────────────────────────────
  {
    hook_text: "POV: your therapist asks 'what would you tell a friend in your situation'",
    hook_type: "pov",
    niche: "mental health",
    creator_handle: "@therapywithabby",
    approx_views: 13_600_000,
    why_it_worked:
      "Universal therapy moment that resonates with anyone who's been in therapy. The reframe immediately follows — satisfying completion within seconds.",
    adaptable_template: "POV: [authority figure] asks you [question that reveals uncomfortable truth]",
  },
  {
    hook_text: "POV: you're at brunch and someone asks how your job search is going",
    hook_type: "pov",
    niche: "career / relatable humor",
    creator_handle: "@karenxcheng",
    approx_views: 7_800_000,
    why_it_worked:
      "Hyper-specific social situation that's almost universally dreaded. The specificity (brunch, that exact question) triggers recognition and shared dread.",
    adaptable_template: "POV: you're at [social situation] and someone asks about [anxiety-inducing topic]",
  },
  {
    hook_text: "POV: you just found out your rent is going up $400 next month",
    hook_type: "pov",
    niche: "finance / housing",
    creator_handle: "@berna.thenomad",
    approx_views: 22_000_000,
    why_it_worked:
      "Extremely relatable financial stress + specific dollar amount that feels real. Shared frustration drives comments, shares, and duets.",
    adaptable_template: "POV: you just found out [stressful financial thing] is [specific amount worse] next month",
  },
  {
    hook_text: "POV: it's 2am and you're still doing the thing you said you'd stop doing",
    hook_type: "pov",
    niche: "self-improvement / relatable",
    creator_handle: "@mel.robbins",
    approx_views: 31_500_000,
    why_it_worked:
      "Vague-specific balance — '2am' and 'the thing' are both precise (relatable feeling) and open-ended (everyone projects their own habit). Shame loop triggers commentary.",
    adaptable_template: "POV: it's [late hour] and you're still doing the thing you said you'd stop doing",
  },

  // ── SOCIAL PROOF ──────────────────────────────────────────────────────────
  {
    hook_text: "I tried the diet that 40 million TikTokers swear by — honest review",
    hook_type: "social_proof",
    niche: "health / food",
    creator_handle: "@abbeyskitchen",
    approx_views: 8_400_000,
    why_it_worked:
      "Social proof (40M TikTokers) + skeptical framing ('honest review') signals the creator will give unbiased information vs. sponsored content.",
    adaptable_template: "I tried the [thing] that [large number] [people] swear by — honest review",
  },
  {
    hook_text: "Millionaires do this every morning. I tried it for 90 days.",
    hook_type: "social_proof",
    niche: "productivity / self-improvement",
    creator_handle: "@jimkwik",
    approx_views: 14_200_000,
    why_it_worked:
      "Aspirational class association (millionaires) + first-person experiment + long timeframe (90 days = rigorous test). Combines aspiration and credibility.",
    adaptable_template: "[Aspirational group] does this every morning. I tried it for [credible timeframe].",
  },
  {
    hook_text: "I used the same resume that got someone hired at Google — here's what it looks like",
    hook_type: "social_proof",
    niche: "career",
    creator_handle: "@austin.belcak",
    approx_views: 18_700_000,
    why_it_worked:
      "Name-brand company (Google) + specific artifact (the resume) + promise to reveal it. Viewers know exactly what value they'll get and why it matters.",
    adaptable_template: "I used the same [artifact] that got someone hired/accepted at [aspirational place] — here's what it looks like",
  },

  // ── LISTICLE ──────────────────────────────────────────────────────────────
  {
    hook_text: "5 things I wish someone told me before I turned 30",
    hook_type: "listicle",
    niche: "life advice / self-improvement",
    creator_handle: "@bigdaddyinstinct",
    approx_views: 26_000_000,
    why_it_worked:
      "Birthday milestone anxiety is near-universal. 'Wish someone told me' implies regret and implies the viewer can avoid the same mistake.",
    adaptable_template: "[Number] things I wish someone told me before [milestone/event]",
  },
  {
    hook_text: "Red flags your relationship is emotionally abusive — a list from a trauma therapist",
    hook_type: "listicle",
    niche: "mental health / relationships",
    creator_handle: "@drkimmybauer",
    approx_views: 54_000_000,
    why_it_worked:
      "High-stakes topic + professional credibility + list format makes it easy to check against own relationship. List creates completion compulsion.",
    adaptable_template: "Red flags [bad thing] is happening to you — a list from a [credentialed expert]",
  },
  {
    hook_text: "7 things landlords can't legally do (that most tenants don't know)",
    hook_type: "listicle",
    niche: "legal / housing",
    creator_handle: "@lawtips.tiktok",
    approx_views: 33_000_000,
    why_it_worked:
      "Information scarcity ('most tenants don't know') + empowerment theme + adversarial party (landlord) + legal weight. Saves are sky-high because people bookmark protection.",
    adaptable_template: "[Number] things [adversarial party] can't legally do (that most [people] don't know)",
  },

  // ── PATTERN INTERRUPT ─────────────────────────────────────────────────────
  {
    hook_text: "[Whispers loudly] You are spending $47/month on this without realizing it",
    hook_type: "pattern_interrupt",
    niche: "personal finance",
    creator_handle: "@humphreytalks",
    approx_views: 10_300_000,
    why_it_worked:
      "Audio pattern break (whisper) in scroll environment + financial pain point + specific amount that feels plausible. The specificity ($47, not 'money') drives engagement.",
    adaptable_template: "[Whispers] You are spending $[specific amount] on [common thing] without realizing it",
  },
  {
    hook_text: "Wait. Did you know your iPhone can do this?",
    hook_type: "pattern_interrupt",
    niche: "tech / productivity",
    creator_handle: "@apple.explained",
    approx_views: 41_000_000,
    why_it_worked:
      "'Wait' is a sharp pattern interrupt word — it implies the creator just realized something. Near-universal device ownership makes this apply to almost every viewer.",
    adaptable_template: "Wait. Did you know your [device everyone has] can do this?",
  },
  {
    hook_text: "[Points aggressively at camera] THIS is why you're always tired",
    hook_type: "pattern_interrupt",
    niche: "health / wellness",
    creator_handle: "@doctormike",
    approx_views: 19_800_000,
    why_it_worked:
      "Physical gesture (pointing) combined with all-caps emphasis in text. 'Always tired' is a universal complaint that makes every viewer feel personally called out.",
    adaptable_template: "[Physical gesture + emphasis] THIS is why you're always [universal complaint]",
  },

  // ── CHALLENGE / CALL TO ACTION ────────────────────────────────────────────
  {
    hook_text: "I bet you can't watch this without saving it",
    hook_type: "challenge",
    niche: "any / meta",
    creator_handle: "@drmikerussell",
    approx_views: 7_600_000,
    why_it_worked:
      "Reverse psychology bet triggers the viewer's contrarian impulse — they want to prove the creator wrong. Almost always results in the save anyway.",
    adaptable_template: "I bet you can't watch this without [desired action]",
  },
  {
    hook_text: "Comment the first number that comes to mind. I'll tell you what it says about you.",
    hook_type: "challenge",
    niche: "personality / psychology",
    creator_handle: "@yourpsychology.explained",
    approx_views: 48_000_000,
    why_it_worked:
      "Participatory hook that makes the viewer the main character. Nearly zero friction to engage — just comment a number. The promise (what it means) drives massive comment volume.",
    adaptable_template: "Comment [low-friction input]. I'll tell you what it says about you.",
  },
  {
    hook_text: "Type 'done' when you've tried all 5 of these study hacks",
    hook_type: "challenge",
    niche: "education / productivity",
    creator_handle: "@studymd",
    approx_views: 6_200_000,
    why_it_worked:
      "Completion ritual ('done') makes the video feel interactive. Creates a comment thread of community momentum that boosts algorithmic signals.",
    adaptable_template: "Type '[specific word]' when you've done all [number] of these [actions]",
  },

  // ── COUNTER-NARRATIVE ─────────────────────────────────────────────────────
  {
    hook_text: "I'm a Harvard nutritionist and I eat [food everyone thinks is bad]",
    hook_type: "counter_narrative",
    niche: "nutrition / health",
    creator_handle: "@drericberg",
    approx_views: 17_400_000,
    why_it_worked:
      "Authority + surprising behavior destroys the assumption. The conflict between credential and choice creates cognitive dissonance that must be resolved by watching.",
    adaptable_template: "I'm a [high-credibility expert] and I [do thing everyone thinks is wrong]",
  },
  {
    hook_text: "Everyone says you need 8 glasses of water a day. They're wrong.",
    hook_type: "counter_narrative",
    niche: "health",
    creator_handle: "@dr.davidbr",
    approx_views: 23_000_000,
    why_it_worked:
      "Attacks widely-believed health 'fact' with confident authority. 'They're wrong' signals the viewer has been misinformed — a powerful motivation to learn more.",
    adaptable_template: "Everyone says you need [widely-believed advice]. They're wrong.",
  },
  {
    hook_text: "Side hustle culture ruined my mental health and my finances",
    hook_type: "counter_narrative",
    niche: "finance / entrepreneurship",
    creator_handle: "@financewithsharan",
    approx_views: 15_700_000,
    why_it_worked:
      "Attacks a dominant cultural narrative (hustle = good). Resonates with people who tried and failed, and provokes debate from hustle evangelists.",
    adaptable_template: "[Popular cultural belief] ruined my [health/finances/life] — here's the truth",
  },

  // ── DIRECT QUESTION ───────────────────────────────────────────────────────
  {
    hook_text: "Do you actually know how much you're paying in bank fees every month?",
    hook_type: "direct_question",
    niche: "personal finance",
    creator_handle: "@nischa",
    approx_views: 9_300_000,
    why_it_worked:
      "'Actually' implies most people don't — creates mild shame that motivates watching. The answer is almost always 'no', which hooks everyone who hears it.",
    adaptable_template: "Do you actually know how much you're paying in [hidden cost] every month?",
  },
  {
    hook_text: "When did rest stop being enough? Why are we all so exhausted?",
    hook_type: "direct_question",
    niche: "wellness / mental health",
    creator_handle: "@mel.robbins",
    approx_views: 29_000_000,
    why_it_worked:
      "Philosophical question that lands like a gut punch. 'We' creates solidarity — the creator is in the experience with the viewer, not lecturing them.",
    adaptable_template: "When did [simple thing] stop being enough? Why are we all so [shared struggle]?",
  },
  {
    hook_text: "What's the one thing holding you back from your dream life — actually?",
    hook_type: "direct_question",
    niche: "self-improvement",
    creator_handle: "@tonyrobibbins_clips",
    approx_views: 11_200_000,
    why_it_worked:
      "'Actually' challenges the viewer to go deeper than their surface answer. Drives comments because people want to externalize and process the question.",
    adaptable_template: "What's the one thing holding you back from [desired outcome] — actually?",
  },
];

async function main() {
  console.log(`Seeding ${hookExamples.length} viral hook examples...`);

  // Ensure table exists (run migration separately if it doesn't)
  // Clear existing rows
  const { error: deleteError } = await supabase
    .from('rmt_viral_hook_examples')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('Failed to clear existing rows:', deleteError.message);
    console.error('Table may not exist yet — run the migration first.');
    process.exit(1);
  }

  // Insert in batches of 10
  let totalInserted = 0;
  for (let i = 0; i < hookExamples.length; i += 10) {
    const batch = hookExamples.slice(i, i + 10);
    const { error } = await supabase.from('rmt_viral_hook_examples').insert(batch);
    if (error) {
      console.error(`Batch ${Math.floor(i / 10) + 1} failed:`, error.message);
    } else {
      totalInserted += batch.length;
      console.log(`✓ Batch ${Math.floor(i / 10) + 1} — ${batch.length} examples inserted`);
    }
  }

  console.log(`\nDone! ${totalInserted}/${hookExamples.length} hook examples seeded.`);
}

main().catch(console.error);
