import { AgentDef } from './types';

export const AGENTS: AgentDef[] = [
  {
    key: 'hook',
    emoji: '💀',
    name: 'Hook Agent',
    oneLiner: 'Your first 3 seconds were a war crime against attention spans',
    analyzes: 'Opening frame, first words, visual grab, scroll-stop power, hook timing',
  },
  {
    key: 'visual',
    emoji: '🎨',
    name: 'Visual Agent',
    oneLiner: "Went to film school and isn't afraid to use it against you",
    analyzes: 'Lighting, color grading, composition, transitions, visual consistency',
  },
  {
    key: 'caption',
    emoji: '✍️',
    name: 'Caption Agent',
    oneLiner: 'Your on-screen text gave them a migraine',
    analyzes: 'On-screen text, captions, readability, CTA placement, hashtag strategy',
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
    analyzes: 'Posting time, hashtags, engagement bait, trend alignment, FYP potential',
  },
  {
    key: 'authenticity',
    emoji: '👁️',
    name: 'Authenticity Agent',
    oneLiner: 'Detects cringe at a molecular level',
    analyzes: 'Authenticity score, cringe detection, relatability index, trust signals',
  },
];
