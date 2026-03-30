export type ScriptFormat =
  | 'generic'
  | 'talking-head'
  | 'tutorial'
  | 'pov'
  | 'stitch-duet'
  | 'storytelling'
  | 'before-after';

export interface FormatDefinition {
  id: ScriptFormat;
  label: string;
  emoji: string;
  description: string;
  /** Shown to user before generation so they know the structure */
  templatePreview: string[];
  /** Injected into the generation prompt */
  promptSection: string;
  /** Niches where this format tends to perform best */
  bestForNiches: string[];
}

const FORMAT_PREFERENCE_KEY = 'rmt_script_format_preference';

export function saveFormatPreference(format: ScriptFormat): void {
  try {
    localStorage.setItem(FORMAT_PREFERENCE_KEY, format);
  } catch {
    // ignore
  }
}

export function getFormatPreference(): ScriptFormat | null {
  if (typeof window === 'undefined') return null;
  try {
    return (localStorage.getItem(FORMAT_PREFERENCE_KEY) as ScriptFormat) || null;
  } catch {
    return null;
  }
}

/**
 * Suggest a format based on the detected niche and roast data.
 */
export function suggestFormat(niche?: string, duration?: number): ScriptFormat {
  const n = (niche || '').toLowerCase();

  // Short duration videos → talking head or before/after
  if (duration && duration < 20) return 'talking-head';

  // Tutorial/education niches
  if (/tutorial|how.?to|diy|hack|recipe|cook|tech|code|programming|education|learn|tip/i.test(n)) {
    return 'tutorial';
  }
  // Fitness / transformation niches
  if (/fitness|gym|workout|weight.?loss|transformation|glow.?up|skincare|makeup/i.test(n)) {
    return 'before-after';
  }
  // Story / drama / storytime niches
  if (/story|storytime|drama|rant|experience|dating|relationship/i.test(n)) {
    return 'storytelling';
  }
  // POV / acting niches
  if (/pov|acting|skit|relatable|comedy/i.test(n)) {
    return 'pov';
  }
  // Reaction / commentary
  if (/react|stitch|duet|response|commentary|opinion/i.test(n)) {
    return 'stitch-duet';
  }

  return 'talking-head';
}

export const SCRIPT_FORMATS: FormatDefinition[] = [
  {
    id: 'generic',
    label: 'Auto / Generic',
    emoji: '🎯',
    description: 'Let AI pick the best structure based on your roast feedback',
    templatePreview: [
      'Hook (0-3s)',
      'Scenes (auto-structured)',
      'On-Screen Text',
      'Caption + Hashtags',
      'Audio Suggestion',
    ],
    promptSection: '', // No extra constraints — uses the default prompt
    bestForNiches: [],
  },
  {
    id: 'talking-head',
    label: 'Talking Head',
    emoji: '🗣️',
    description: 'Direct to camera, conversational — hook + content + CTA',
    templatePreview: [
      'Cold Open Hook (0-3s) — look straight into the camera',
      'Main Point (3-15s) — deliver the value with energy',
      'Retention Hook (mid) — "but here\'s the thing..."',
      'Payoff / Twist (last 5s)',
      'CTA — on screen or spoken',
    ],
    promptSection: `**FORMAT: TALKING HEAD (Direct-to-Camera)**
Structure the script for a single person speaking directly into the camera:
- Scene 1: Cold open hook — creator makes direct eye contact, uses a Direct Address or Curiosity Gap hook
- Scenes 2-3: Main content delivery — conversational tone, short punchy sentences, hand gestures encouraged
- Mid-scene: Retention hook — pause, lean in, change energy ("but here's the thing...")
- Final scene: Payoff + CTA delivered directly to viewer
- Dialogue is the centerpiece — write it to sound natural and spontaneous, NOT scripted
- Keep it punchy: ideal length 15-45 seconds
- On-screen text should reinforce key phrases from dialogue, not duplicate it entirely`,
    bestForNiches: ['lifestyle', 'opinion', 'advice', 'hot take', 'beauty', 'fashion'],
  },
  {
    id: 'tutorial',
    label: 'Tutorial / How-To',
    emoji: '📋',
    description: 'Step-by-step structure with numbered steps and clear transformation',
    templatePreview: [
      'Promise Hook (0-3s) — "How to X in Y"',
      'Step 1 — specific action',
      'Step 2 — specific action',
      'Step 3 — specific action',
      'Result / Proof (last 3s)',
      'CTA — "Save this for later"',
    ],
    promptSection: `**FORMAT: TUTORIAL / HOW-TO**
Structure the script as a step-by-step tutorial:
- Scene 1: Promise hook — state the transformation clearly ("How I [result] in [timeframe]" or "3 steps to [result]")
- Scenes 2-4: Numbered steps — each step should be ONE clear action, not multiple. Use "Step 1:", "Step 2:" etc. in dialogue
- Mid-point: Retention hook between steps — "now this next step is where most people mess up..."
- Final scene: Show or describe the result/transformation + CTA "Save this for later" (drives saves = highest algorithm weight for tutorials)
- On-screen text MUST show step numbers and key instructions — viewers should be able to follow sound-off
- Keep each step under 10 seconds
- Ideal total length: 30-60 seconds`,
    bestForNiches: ['tech', 'cooking', 'diy', 'beauty', 'fitness', 'education', 'hack', 'tip'],
  },
  {
    id: 'pov',
    label: 'POV',
    emoji: '👁️',
    description: 'First-person perspective — scenario setup with emotional hook',
    templatePreview: [
      'POV Setup (0-3s) — "POV: you..."',
      'Scenario Build (3-10s) — escalate the situation',
      'Emotional Peak / Twist',
      'Resolution or Punchline',
    ],
    promptSection: `**FORMAT: POV (Point of View)**
Structure the script as a first-person POV scenario:
- Scene 1: "POV:" text on screen + immediate immersion into the scenario — no explanation, drop the viewer IN the moment
- Scenes 2-3: Build the scenario — escalate tension, humor, or relatability. Use facial expressions, body language, and environment
- Mid-point: Emotional peak or unexpected twist — this is the retention hook
- Final scene: Punchline, resolution, or cliffhanger that makes viewers want to watch again (loop potential)
- Dialogue should be minimal or internal monologue style — POVs rely more on VISUAL storytelling
- On-screen text carries the narrative ("POV: your boss says 'we need to talk'" etc.)
- The viewer IS the character — write from their perspective
- Ideal length: 7-30 seconds`,
    bestForNiches: ['comedy', 'relatable', 'acting', 'skit', 'dating', 'work life', 'school'],
  },
  {
    id: 'stitch-duet',
    label: 'Stitch / Duet',
    emoji: '🪡',
    description: 'Response format — reference the original, add value or commentary',
    templatePreview: [
      'Reference Hook (0-3s) — react to original',
      'Your Take (3-15s) — add value or commentary',
      'Retention Hook (mid) — escalate your point',
      'Strong Closer — your conclusion + CTA',
    ],
    promptSection: `**FORMAT: STITCH / DUET (Response)**
Structure the script as a response/reaction to another video:
- Scene 1: Quick reference to the original content — "So this person said [X]..." or reaction face + "Wait, WHAT?" — grab attention by showing you have something to say
- Scenes 2-3: Your take — add value, correct misinformation, expand on the point, or provide expert commentary. Be specific and substantive, not just "I agree"
- Mid-point: Retention hook — escalate ("and it gets worse..." or "but what they DIDN'T mention...")
- Final scene: Strong conclusion + CTA — drive comments by asking "Am I wrong?" or "What's your take?"
- The original content reference in Scene 1 should be brief (2-3 seconds max) — YOUR content is the star
- Comment bait is critical here — stitch/duet thrives on debate
- Ideal length: 15-60 seconds`,
    bestForNiches: ['commentary', 'reaction', 'expert', 'opinion', 'education', 'debunk'],
  },
  {
    id: 'storytelling',
    label: 'Storytelling',
    emoji: '📖',
    description: 'Narrative arc — setup, conflict, resolution',
    templatePreview: [
      'Hook (0-3s) — tease the climax',
      'Setup (3-15s) — establish context',
      'Rising Action — build tension',
      'Climax / Twist',
      'Resolution + Reflection',
      'CTA — "Follow for Part 2"',
    ],
    promptSection: `**FORMAT: STORYTELLING (Narrative Arc)**
Structure the script with a classic story arc:
- Scene 1: Hook — tease the climax or most dramatic moment FIRST ("I still can't believe what happened next..." or "This is the story of how I [dramatic result]"). Start at the peak, then rewind
- Scene 2: Setup — establish who, where, when. Keep it tight, 1-2 sentences max. Viewer needs just enough context
- Scenes 3-4: Rising action — escalate tension, add details that build anticipation. Each scene should raise the stakes
- Mid-point: RETENTION HOOK — this is where you pause the narrative ("and then... they said something I'll never forget")
- Climax scene: The payoff — deliver the twist, revelation, or dramatic moment
- Final scene: Resolution + reflection + CTA ("Follow for Part 2" or "Has this happened to you?")
- Use cliffhanger energy even if the story resolves — make them want MORE
- Ideal length: 60-180 seconds
- On-screen text should highlight key dramatic moments`,
    bestForNiches: ['storytime', 'drama', 'dating', 'relationship', 'travel', 'life experience', 'rant'],
  },
  {
    id: 'before-after',
    label: 'Before / After',
    emoji: '🔄',
    description: 'Transformation reveal — stakes, process, result',
    templatePreview: [
      'Stakes Hook (0-3s) — show the "before" problem',
      'Process (3-20s) — show the transformation steps',
      'Build-up — tease the reveal',
      'Reveal (last 5s) — dramatic "after"',
      'CTA — "Save this" or "Follow for more"',
    ],
    promptSection: `**FORMAT: BEFORE / AFTER (Transformation)**
Structure the script around a dramatic transformation:
- Scene 1: Stakes hook — show the "before" state and make the viewer feel the pain/problem. The worse the "before", the more satisfying the reveal. ("This is what my [X] looked like 30 days ago...")
- Scenes 2-3: Process — show key steps of the transformation. Don't show everything, just the most visually interesting or surprising steps. Speed ramps and time-lapses work great here
- Mid-point: Retention hook — tease the reveal ("you're NOT ready for this..." or "and here's the crazy part..."). Build anticipation
- Final scene: DRAMATIC REVEAL — the "after" state. Use a visual pattern interrupt (camera angle change, lighting shift, slow-mo). Hold on the result for 2-3 seconds. Then CTA
- The contrast between before and after should be STARK — maximize the visual difference
- On-screen text should include before/after labels and any metrics ("Day 1 vs Day 30", "Before → After")
- CTA: "Save this" for tutorials, "Follow for more transformations" for series
- Ideal length: 15-45 seconds`,
    bestForNiches: ['fitness', 'skincare', 'home improvement', 'cooking', 'art', 'fashion', 'glow up', 'weight loss'],
  },
];

export function getFormatById(id: ScriptFormat): FormatDefinition {
  return SCRIPT_FORMATS.find((f) => f.id === id) || SCRIPT_FORMATS[0];
}
