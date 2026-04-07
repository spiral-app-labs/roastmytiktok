import type { DetectedHookType, HookTypeLens } from '@/lib/hook-help';

/* ------------------------------------------------------------------ */
/*  Hook type examples bank - strong vs weak, organized by hook type  */
/* ------------------------------------------------------------------ */

export interface HookExample {
  hookType: HookTypeLens['key'] | 'curiosity';
  strength: 'strong' | 'weak';
  line: string;
  breakdown: string;
}

export const HOOK_EXAMPLES_BANK: HookExample[] = [
  // - visual -
  { hookType: 'visual', strength: 'strong', line: 'Opens on a tight shot of the finished result - bright, centered, impossible to ignore on mute.', breakdown: 'Frame one does all the work. A stranger scrolling at speed sees the payoff before any words load, which earns the pause.' },
  { hookType: 'visual', strength: 'weak', line: 'Opens on a wide shot of a desk with ambient lighting and no focal point.', breakdown: 'Nothing in the frame demands attention. It looks like any other video, so the thumb keeps moving.' },

  // - spoken -
  { hookType: 'spoken', strength: 'strong', line: '"If your videos keep dying at 200 views, this is the one thing you are getting wrong."', breakdown: 'The first sentence names the pain, qualifies the audience, and promises a fix - all before the viewer can decide to leave.' },
  { hookType: 'spoken', strength: 'weak', line: '"Hey everyone, so today I wanted to talk about something I have been thinking about."', breakdown: 'Greetings and throat-clearing burn the first two seconds. A cold viewer has no reason to care yet.' },

  // - text -
  { hookType: 'text', strength: 'strong', line: 'Bold text overlay in frame one: "stop making this mistake"', breakdown: 'Short, high-contrast text in the upper third tells a muted scroller exactly what the video is about instantly.' },
  { hookType: 'text', strength: 'weak', line: 'Small text appearing at the 3-second mark: "here is my morning routine update"', breakdown: 'The text shows up too late and says nothing specific. Half your audience watches on mute - if the text is missing or vague in frame one, the hook fails silently.' },

  // - motion -
  { hookType: 'motion', strength: 'strong', line: 'Camera pushes in while hands are already mid-action - energy from the first frame.', breakdown: 'Movement in the opening frame signals that something is happening, which triggers a pause reflex even before the message registers.' },
  { hookType: 'motion', strength: 'weak', line: 'Static shot, camera settles for 2 seconds before anything moves.', breakdown: 'A still opening feels like dead air. The viewer has already decided to swipe before the content starts.' },

  // - curiosity -
  { hookType: 'curiosity', strength: 'strong', line: '"I tried the thing everyone says not to do - and it actually worked."', breakdown: 'Opens an information gap the brain wants to close. The viewer cannot get the answer without watching, which is the strongest retention mechanic on short-form.' },
  { hookType: 'curiosity', strength: 'weak', line: '"Let me walk you through what happened step by step."', breakdown: 'No gap, no tension, no reason to stay. The viewer knows the format will be slow before the payoff.' },

  // - attractiveness -
  { hookType: 'attractiveness', strength: 'strong', line: 'Clean lighting, intentional crop, styled frame - the opener feels premium before a word is spoken.', breakdown: 'Production quality signals credibility. A polished first frame earns a second chance even if the topic is not immediately clear.' },
  { hookType: 'attractiveness', strength: 'weak', line: 'Grainy selfie cam, cluttered background, uneven lighting.', breakdown: 'Low production value tells the viewer this is not worth their time - the brain pattern-matches "amateur" and moves on.' },
];

/* ------------------------------------------------------------------ */
/*  Educational tooltip definitions for hook concepts                  */
/* ------------------------------------------------------------------ */

export interface HookTooltip {
  id: string;
  term: string;
  definition: string;
  whyItMatters: string;
}

export const HOOK_TOOLTIPS: Record<string, HookTooltip> = {
  'hook': {
    id: 'hook',
    term: 'Hook',
    definition: 'The first 1-2 seconds of a video that decide whether a stranger keeps watching or swipes away.',
    whyItMatters: 'TikTok tests every video on a small batch of strangers first. If most of them swipe in the first second, the algorithm never shows it to more people - no matter how good the rest of the video is.',
  },
  'hook-type': {
    id: 'hook-type',
    term: 'Hook type',
    definition: 'The primary mechanism your opener uses to earn a pause: visual, spoken, text, motion, curiosity, or attractiveness.',
    whyItMatters: 'The strongest hooks stack 2-3 types at once (e.g., a curiosity line + bold text + tight visual). Knowing which type you are leading with helps you layer the others on top.',
  },
  'scroll-stop': {
    id: 'scroll-stop',
    term: 'Scroll-stop signal',
    definition: 'Whatever makes a person interrupt the swipe - a bold visual, a surprising claim, motion in frame one, or text that demands a read.',
    whyItMatters: 'Without a scroll-stop, the video never gets a chance to deliver its value. It is the single highest-leverage element in any short-form video.',
  },
  'open-loop': {
    id: 'open-loop',
    term: 'Open loop / curiosity gap',
    definition: 'A question, tease, or incomplete thought that creates tension the viewer needs to resolve by watching.',
    whyItMatters: 'Open loops are the strongest retention mechanic on short-form. The brain treats an unanswered question like an itch - it keeps watching to scratch it.',
  },
  'mute-mode': {
    id: 'mute-mode',
    term: 'Mute-mode readability',
    definition: 'Whether the video communicates its core promise through on-screen text and visuals alone, without sound.',
    whyItMatters: 'Roughly 50% of TikTok viewers browse with sound off. If your opener relies entirely on spoken words, half your audience never hears the hook.',
  },
  'hold-strength': {
    id: 'hold-strength',
    term: 'Hold strength',
    definition: 'A qualitative read on whether the opening beats are doing enough to keep a cold viewer past the first few seconds.',
    whyItMatters: 'Strong hold means the hook earned enough attention for the rest of the video to matter. Weak hold means every other improvement is wasted because nobody sticks around to see it.',
  },
  'hook-hierarchy': {
    id: 'hook-hierarchy',
    term: 'Hook hierarchy',
    definition: 'The principle that the hook is the gatekeeper to every other element in your video - captions, CTAs, hashtags, and strategy all sit downstream.',
    whyItMatters: 'When the hook fails, better captions and stronger strategy still lose because nobody sticks around long enough to see them. Fix the hook first, then polish everything else.',
  },
  'frame-one': {
    id: 'frame-one',
    term: 'Frame one',
    definition: 'The very first image a viewer sees before any animation, text, or audio plays.',
    whyItMatters: 'Frame one is your thumbnail in the feed. It needs to be visually distinct and promise value on its own - most swipe decisions happen before the audio even starts.',
  },
  'throat-clearing': {
    id: 'throat-clearing',
    term: 'Throat-clearing',
    definition: 'Any greeting, intro, or warm-up before the actual hook lands - "hey guys", "so today", "I wanted to talk about".',
    whyItMatters: 'Every word before the promise is a word where viewers leave. The strongest hooks start mid-thought, as if the viewer tuned in late to something already interesting.',
  },
  'downstream-advice': {
    id: 'downstream-advice',
    term: 'Downstream advice',
    definition: 'All feedback about elements that come after the hook - captions, CTAs, hashtags, posting time, audio mixing.',
    whyItMatters: 'Downstream advice only works when the hook is strong enough that people actually reach those elements. Polishing downstream when the hook is broken is like repainting a car that will not start.',
  },
};

/* ------------------------------------------------------------------ */
/*  Helper: get examples for a detected hook type                      */
/* ------------------------------------------------------------------ */

export function getExamplesForHookType(detected: DetectedHookType): { strong: HookExample; weak: HookExample } | null {
  const key = detected.type === 'none' ? 'spoken' : detected.type;
  const strong = HOOK_EXAMPLES_BANK.find(e => e.hookType === key && e.strength === 'strong');
  const weak = HOOK_EXAMPLES_BANK.find(e => e.hookType === key && e.strength === 'weak');
  if (!strong || !weak) return null;
  return { strong, weak };
}

/* ------------------------------------------------------------------ */
/*  Hook hierarchy teaching content                                    */
/* ------------------------------------------------------------------ */

export interface HookHierarchyLevel {
  label: string;
  description: string;
  gated: boolean;
}

export const HOOK_HIERARCHY: HookHierarchyLevel[] = [
  { label: 'Hook', description: 'Stops the scroll - decides whether anyone sees the rest.', gated: false },
  { label: 'Visual quality', description: 'Keeps the eye engaged after the pause.', gated: true },
  { label: 'Spoken / audio', description: 'Delivers the promise and builds trust.', gated: true },
  { label: 'On-screen text', description: 'Reinforces the message for muted viewers.', gated: true },
  { label: 'CTA / conversion', description: 'Turns attention into follows, saves, or clicks.', gated: true },
  { label: 'Captions & hashtags', description: 'Helps the algorithm categorize and distribute.', gated: true },
];
