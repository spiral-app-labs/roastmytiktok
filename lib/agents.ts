import { AgentDef } from './types';

export const AGENTS: AgentDef[] = [
  {
    key: 'hook',
    emoji: '💀',
    name: 'Hook Agent',
    oneLiner: 'Your first 3 seconds were a war crime against attention spans',
    analyzes: 'Opening frame, first words, visual grab, scroll-stop power, hook timing, thumbnail/first-frame effectiveness',
  },
  {
    key: 'visual',
    emoji: '🎨',
    name: 'Visual Agent',
    oneLiner: 'Went to film school and isn\'t afraid to use it against you',
    analyzes: 'Lighting, color grading, composition, transitions, visual consistency',
  },
  {
    key: 'caption',
    emoji: '✍️',
    name: 'Caption Agent',
    oneLiner: 'Your on-screen text gave them a migraine',
    analyzes: 'On-screen text, captions, readability, CTA placement, caption timing/sync, font size, position safety, contrast ratio',
  },
  {
    key: 'audio',
    emoji: '🎧',
    name: 'Audio Agent',
    oneLiner: 'Performed an autopsy on your audio. It was already dead.',
    analyzes: 'Music choice, voice clarity, audio mixing, trending sound usage',
  },
  {
    key: 'algorithm',
    emoji: '🔮',
    name: 'Algorithm Agent',
    oneLiner: 'The algorithm saw your video and chose violence',
    analyzes: 'Posting time, hashtag strategy (count, categorization, banned tag detection, niche-specific suggestions), engagement bait, trend alignment, FYP potential',
  },
  {
    key: 'authenticity',
    emoji: '👁️',
    name: 'Authenticity Agent',
    oneLiner: 'Detects cringe at a molecular level',
    analyzes: 'Authenticity score, cringe detection, relatability index, trust signals',
  },
  {
    key: 'conversion',
    emoji: '💰',
    name: 'Conversion Agent',
    oneLiner: 'Your CTA is begging for attention and getting none',
    analyzes: 'CTA placement/clarity, value proposition, social proof, trust signals, friction points, urgency/scarcity',
  },
  {
    key: 'accessibility',
    emoji: '♿',
    name: 'Accessibility Agent',
    oneLiner: 'Not everyone experiences your content the same way',
    analyzes: 'Caption quality for deaf/HoH viewers, color contrast, text readability, audio descriptions, inclusive content',
  },
  {
    key: 'caption_quality',
    emoji: '📐',
    name: 'Caption Quality Agent',
    oneLiner: 'Measured your captions with a ruler and they failed',
    analyzes: 'Caption sync timing, font readability on mobile, contrast ratio, position safety zones, text density and chunking',
  },
];
