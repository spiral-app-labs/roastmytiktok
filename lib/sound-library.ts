import { RoastResult } from '@/lib/types';
import { TrendingContext } from '@/lib/trending-context';

export interface SoundLibraryRecommendation {
  name: string;
  status: string;
  velocity: number;
  fitLabel: 'best bet' | 'worth testing' | 'watchlist';
  usage: string;
  whyItFits: string[];
  caution: string;
  searchQuery: string;
}

export interface SoundLibraryPlan {
  headline: string;
  summary: string;
  creatorAngle: string;
  recommendations: SoundLibraryRecommendation[];
  actionSteps: string[];
}

const NICHE_SOUND_GUIDANCE: Record<string, { usage: string; keywords: string[]; caution: string }> = {
  education: {
    usage: 'Use under a clean voiceover at 8-12% volume so the lesson still lands with sound-off captions.',
    keywords: ['explain', 'mistake', 'before', 'after', 'tutorial'],
    caution: 'Do not let the sound overpower the spoken takeaway or make the clip feel trend-chasing.',
  },
  business: {
    usage: 'Layer it quietly under a contrarian take, framework, or story so the content feels current without losing authority.',
    keywords: ['framework', 'mistake', 'lesson', 'storytime', 'hot take'],
    caution: 'If the tone is too playful, it can undercut credibility. Keep the delivery crisp.',
  },
  finance: {
    usage: 'Use it as a low-volume bed under an opinionated hook or myth-busting opener.',
    keywords: ['myth', 'mistake', 'money', 'truth', 'warning'],
    caution: 'Avoid novelty sounds that make serious advice feel unserious.',
  },
  parenting: {
    usage: 'Pair it with relatable on-screen text or a quick parenting confession, then let the voiceover carry the lesson.',
    keywords: ['relatable', 'mom', 'dad', 'toddler', 'new parent'],
    caution: 'Skip sounds that feel too chaotic if the video is trying to build trust or calm.',
  },
  fitness: {
    usage: 'Use on quick demo cuts, before/after transitions, or energetic POV training clips.',
    keywords: ['before', 'after', 'POV', 'routine', 'workout'],
    caution: 'If the sound is too soft, it can drain the energy from a performance-based clip.',
  },
  beauty: {
    usage: 'Best on transformation reveals, mini tutorials, and product payoff shots.',
    keywords: ['get ready', 'transformation', 'routine', 'before', 'after'],
    caution: 'Do not bury important tutorial steps under a sound-first edit.',
  },
  food: {
    usage: 'Use on prep montages or reveal shots, then blend back to natural cooking audio when the payoff hits.',
    keywords: ['recipe', 'reveal', 'asmr', 'quick', 'easy'],
    caution: 'If the recipe relies on instructions, switch back to clear voice quickly.',
  },
  tech: {
    usage: 'Pair with a punchy demo, screen recording, or comparison while the voiceover explains the win.',
    keywords: ['tool', 'app', 'hack', 'workflow', 'demo'],
    caution: 'Do not make the clip feel gimmicky if the point is product clarity.',
  },
};

const FALLBACK_GUIDANCE = {
  usage: 'Use it under the first 5-8 seconds of a voiceover-driven opener, then keep it subtle while the point develops.',
  keywords: ['POV', 'mistake', 'storytime', 'before', 'after'],
  caution: 'If the sound distracts from the point, lower it or cut it after the opener.',
};

export function buildSoundLibraryPlan(roast: RoastResult, ctx: TrendingContext): SoundLibraryPlan | null {
  if (!ctx.trendingSounds.length) return null;

  const niche = roast.niche?.detected?.toLowerCase() ?? 'general';
  const guidance = NICHE_SOUND_GUIDANCE[niche] ?? FALLBACK_GUIDANCE;
  const audioAgent = roast.agents.find((agent) => agent.agent === 'audio');
  const algorithmAgent = roast.agents.find((agent) => agent.agent === 'algorithm');
  const hookAgent = roast.agents.find((agent) => agent.agent === 'hook');
  const audioScore = audioAgent?.score ?? 50;
  const algorithmScore = algorithmAgent?.score ?? 50;
  const hookScore = hookAgent?.score ?? roast.hookSummary?.score ?? 50;
  const needsSaferEntry = hookScore < 65 || audioScore < 60;

  const recommendations = ctx.trendingSounds.slice(0, 4).map((sound, index) => {
    const fitLabel: SoundLibraryRecommendation['fitLabel'] =
      index === 0 ? 'best bet' : sound.status === 'emerging' || sound.status === 'peak' ? 'worth testing' : 'watchlist';

    const whyItFits = [
      `${sound.status === 'emerging' ? 'still early' : sound.status === 'peak' ? 'already moving' : 'still alive'} at velocity ${sound.velocity}/100, so it gives you a real discovery tail instead of recycled audio.`,
      needsSaferEntry
        ? 'works best as a low-volume support layer while you fix the opener and keep the spoken point clear.'
        : 'strong enough to add freshness without changing your whole content style.',
      roast.niche?.detected
        ? `fits a ${roast.niche.detected} creator when the edit leans into ${guidance.keywords.slice(0, 2).join(' + ')} framing.`
        : `fits best when the edit leans into ${guidance.keywords.slice(0, 2).join(' + ')} framing.`,
    ];

    return {
      name: sound.name,
      status: sound.status,
      velocity: sound.velocity,
      fitLabel,
      usage: guidance.usage,
      whyItFits,
      caution:
        sound.status === 'declining'
          ? `This sound is already cooling off. Use only if the format match is perfect and the post is going out immediately. ${guidance.caution}`
          : guidance.caution,
      searchQuery: `${sound.name} ${guidance.keywords[0]} ${guidance.keywords[1]}`,
    };
  });

  const actionSteps = [
    'pick one sound from the shortlist, not four. creator advantage comes from cleaner execution, not more options.',
    'build the first 2 seconds around text plus motion first, then lay the sound under it at low volume.',
    'search the sound inside tiktok and copy the format language from top recent posts, not just the audio itself.',
  ];

  if (algorithmScore < 60) {
    actionSteps.push('post fast if you choose an emerging sound. the time advantage matters more than perfect polish here.');
  }

  return {
    headline: 'sound library plays that actually fit this roast',
    summary: needsSaferEntry
      ? 'you do not need a random trending track. you need one sound that upgrades distribution without hijacking the message.'
      : 'your next edge is smarter audio selection, not louder audio. these are the sounds worth testing first.',
    creatorAngle: roast.niche?.detected
      ? `for ${roast.niche.detected} creators, the win is using a trend as packaging while keeping the niche payoff obvious.`
      : 'the win is using a trend as packaging while keeping the point obvious.',
    recommendations,
    actionSteps,
  };
}
