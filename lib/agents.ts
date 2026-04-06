import { AgentDef } from './types';

export const AGENTS: AgentDef[] = [
  {
    key: 'hook',
    emoji: '💀',
    name: 'Hook Agent',
    displayName: 'Opening',
    oneLiner: 'Your first 3 seconds were a war crime against attention spans',
    analyzes: 'Opening frame, first words, visual grab, scroll-stop power, hook timing, thumbnail/first-frame effectiveness',
  },
  {
    key: 'visual',
    emoji: '🎨',
    name: 'Visual Agent',
    displayName: 'Visuals',
    oneLiner: 'Went to film school and isn\'t afraid to use it against you',
    analyzes: 'Lighting, color grading, composition, transitions, visual consistency',
  },
  {
    key: 'audio',
    emoji: '🎧',
    name: 'Audio Agent',
    displayName: 'Audio',
    oneLiner: 'Performed an autopsy on your audio. It was already dead.',
    analyzes: 'Music choice, voice clarity, audio mixing, trending sound usage',
  },
  {
    key: 'authenticity',
    emoji: '👁️',
    name: 'Authenticity Agent',
    displayName: 'Authenticity',
    oneLiner: 'Detects cringe at a molecular level',
    analyzes: 'Authenticity score, cringe detection, relatability index, trust signals',
  },
  {
    key: 'conversion',
    emoji: '💰',
    name: 'Conversion Agent',
    displayName: 'Call to Action',
    oneLiner: 'Your CTA is begging for attention and getting none',
    analyzes: 'CTA placement/clarity, value proposition, social proof, trust signals, friction points, urgency/scarcity',
  },
  {
    key: 'accessibility',
    emoji: '♿',
    name: 'Accessibility Agent',
    displayName: 'Accessibility',
    oneLiner: 'Not everyone experiences your content the same way',
    analyzes: 'Caption quality for deaf/HoH viewers, color contrast, text readability, audio descriptions, inclusive content',
  },
];
