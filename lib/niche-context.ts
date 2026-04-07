import { NicheCategory, NicheDetection } from './niche-detect';

export interface NicheInfo {
  optimalLength: string;
  bestFormats: string[];
  bestHooks: string[];
  avgEngagement: string;
  commonMistakes: string[];
}

export const NICHE_CONTEXT: Record<NicheCategory, NicheInfo> = {
  comedy: {
    optimalLength: '7-20 seconds',
    bestFormats: ['POV', 'Stitch/Duet', 'Trending Sound Participation'],
    bestHooks: ['Visual Pattern Interrupt', 'Shocking Statement'],
    avgEngagement: '5-8%',
    commonMistakes: ['punchline too late', 'setup too long', 'explaining the joke'],
  },
  education: {
    optimalLength: '30-60 seconds',
    bestFormats: ['Tutorial', 'Talking Head', 'Green Screen'],
    bestHooks: ['Problem-Solution', 'Curiosity Gap'],
    avgEngagement: '3-6%',
    commonMistakes: ['too much jargon', 'no visual aids', 'burying the takeaway'],
  },
  lifestyle: {
    optimalLength: '15-45 seconds',
    bestFormats: ['Day-in-the-Life', 'GRWM', 'Vlog'],
    bestHooks: ['Relatable Statement', 'Aesthetic Pattern Interrupt'],
    avgEngagement: '4-7%',
    commonMistakes: ['no story arc', 'too generic', 'lacking a personal angle'],
  },
  fitness: {
    optimalLength: '15-45 seconds',
    bestFormats: ['Before/After', 'Tutorial', 'Transformation'],
    bestHooks: ['Transformation Tease', 'Problem-Solution'],
    avgEngagement: '4-7%',
    commonMistakes: ['no form cues', 'too many exercises in one video', 'unclear rep counts'],
  },
  beauty: {
    optimalLength: '20-45 seconds',
    bestFormats: ['GRWM', 'Tutorial', 'Before/After'],
    bestHooks: ['Before/After Reveal', 'Product Close-Up'],
    avgEngagement: '4-6%',
    commonMistakes: ['bad lighting on skin tones', 'skipping product names', 'rushing application steps'],
  },
  tech: {
    optimalLength: '30-60 seconds',
    bestFormats: ['Tutorial', 'Screen Recording', 'Unboxing'],
    bestHooks: ['Problem-Solution', 'Curiosity Gap', 'Bold Claim'],
    avgEngagement: '3-5%',
    commonMistakes: ['too much jargon for general audience', 'no real-world demo', 'boring screen recordings'],
  },
  food: {
    optimalLength: '15-45 seconds',
    bestFormats: ['Recipe Tutorial', 'Overhead Shot', 'Taste Test'],
    bestHooks: ['Final Dish Reveal', 'Ingredient Close-Up', 'Controversial Take'],
    avgEngagement: '5-8%',
    commonMistakes: ['no ingredient list on screen', 'poor lighting on food', 'skipping key steps'],
  },
  finance: {
    optimalLength: '30-60 seconds',
    bestFormats: ['Talking Head', 'Green Screen', 'Listicle'],
    bestHooks: ['Bold Claim', 'Problem-Solution', 'Shocking Stat'],
    avgEngagement: '3-5%',
    commonMistakes: ['too complex without visuals', 'no actionable advice', 'sounding like a textbook'],
  },
  travel: {
    optimalLength: '15-45 seconds',
    bestFormats: ['Montage', 'Day-in-the-Life', 'POV'],
    bestHooks: ['Destination Reveal', 'Aerial Shot', 'Unexpected Discovery'],
    avgEngagement: '4-7%',
    commonMistakes: ['generic drone shots with no story', 'no practical tips', 'missing location tags'],
  },
  gaming: {
    optimalLength: '15-30 seconds',
    bestFormats: ['Gameplay Clip', 'Tutorial', 'Fail/Win Compilation'],
    bestHooks: ['Insane Play Tease', 'Challenge Statement', 'Fail Clip'],
    avgEngagement: '4-7%',
    commonMistakes: ['too much dead gameplay', 'no face cam or commentary', 'clips too long without payoff'],
  },
  parenting: {
    optimalLength: '15-45 seconds',
    bestFormats: ['Relatable Skit', 'Day-in-the-Life', 'Storytelling'],
    bestHooks: ['Relatable Statement', 'Kid Reaction Tease'],
    avgEngagement: '5-8%',
    commonMistakes: ['oversharing about kids', 'too preachy', 'no humor in relatable moments'],
  },
  fashion: {
    optimalLength: '15-30 seconds',
    bestFormats: ['OOTD', 'Haul', 'Transition Video'],
    bestHooks: ['Outfit Transformation', 'Before/After', 'Trend Challenge'],
    avgEngagement: '4-6%',
    commonMistakes: ['no outfit details on screen', 'poor mirror quality', 'not tagging brands/items'],
  },
  pets: {
    optimalLength: '10-30 seconds',
    bestFormats: ['Cute Moment', 'Training Progress', 'POV From Pet'],
    bestHooks: ['Cute Moment Close-Up', 'Unexpected Behavior'],
    avgEngagement: '6-10%',
    commonMistakes: ['shaky camera chasing pet', 'too dark', 'video too long for the moment'],
  },
  diy: {
    optimalLength: '30-60 seconds',
    bestFormats: ['Tutorial', 'Before/After', 'Time-Lapse'],
    bestHooks: ['Final Result Reveal', 'Problem Statement', 'Material Close-Up'],
    avgEngagement: '4-7%',
    commonMistakes: ['skipping steps', 'no materials list', 'bad overhead angle'],
  },
  music: {
    optimalLength: '15-30 seconds',
    bestFormats: ['Performance Clip', 'Cover', 'Behind-the-Scenes'],
    bestHooks: ['Chorus/Hook First', 'Surprising Instrument', 'Mashup Tease'],
    avgEngagement: '5-8%',
    commonMistakes: ['bad audio recording quality', 'starting from the intro', 'no visual energy'],
  },
};

/**
 * Build a prompt section with niche-specific context for agent prompts.
 */
export function buildNichePromptSection(detection: NicheDetection): string {
  const info = NICHE_CONTEXT[detection.niche];
  const nicheLabel = detection.subNiche
    ? `${detection.niche} → ${detection.subNiche}`
    : detection.niche;

  return `
DETECTED NICHE: ${nicheLabel} (confidence: ${detection.confidence})
Signals: ${detection.signals.join(', ')}

NICHE-SPECIFIC BENCHMARKS FOR ${detection.niche.toUpperCase()}:
- Optimal video length: ${info.optimalLength}
- Best-performing formats: ${info.bestFormats.join(', ')}
- Recommended hook styles: ${info.bestHooks.join(', ')}
- Average engagement rate: ${info.avgEngagement}
- Common mistakes in this niche: ${info.commonMistakes.join(', ')}`;
}

/**
 * Build agent-specific niche guidance. Each agent gets tailored advice
 * referencing the detected niche.
 */
export function buildAgentNicheContext(
  detection: NicheDetection,
  agent: string,
  videoDuration?: number,
): string {
  const info = NICHE_CONTEXT[detection.niche];
  const base = buildNichePromptSection(detection);

  let agentGuidance = '';

  switch (agent) {
    case 'hook':
      agentGuidance = `\n\nNICHE HOOK GUIDANCE: For ${detection.niche} videos, ${info.bestHooks.join(' and ')} hooks work best. Judge their hook against these niche-specific recommendations. If they used a hook style that's weak for ${detection.niche}, call it out and suggest a niche-appropriate alternative.`;
      break;

    case 'audio':
      if (detection.niche === 'music') {
        agentGuidance = `\n\nNICHE AUDIO GUIDANCE: This is a music niche video - audio quality is EVERYTHING. Original audio is expected and preferred. Judge recording quality, mixing, and musical performance with higher standards than other niches.`;
      } else if (['comedy', 'lifestyle', 'gaming'].includes(detection.niche)) {
        agentGuidance = `\n\nNICHE AUDIO GUIDANCE: In ${detection.niche}, trending sounds typically perform better than original audio. If they're using original audio, it needs to be genuinely engaging to compensate for missing the sound discovery boost.`;
      } else if (['education', 'tech', 'finance'].includes(detection.niche)) {
        agentGuidance = `\n\nNICHE AUDIO GUIDANCE: In ${detection.niche}, original audio with clear speech is preferred over trending sounds. Voice clarity and delivery pace are critical - viewers are here to learn, not to vibe.`;
      } else {
        agentGuidance = `\n\nNICHE AUDIO GUIDANCE: In ${detection.niche}, ${detection.niche === 'food' ? 'ASMR-style sounds and clear voiceover' : 'a mix of trending sounds and voiceover'} typically perform best.`;
      }
      break;

    case 'algorithm':
      agentGuidance = `\n\nNICHE ALGORITHM GUIDANCE: For ${detection.niche} accounts, ${info.avgEngagement} engagement is the benchmark. Judge their hashtag strategy against ${detection.niche}-specific hashtags. Their video format should align with what works in ${detection.niche}: ${info.bestFormats.join(', ')}.`;
      if (videoDuration) {
        const [minStr, maxStr] = info.optimalLength.replace(' seconds', '').split('-');
        const min = parseInt(minStr);
        const max = parseInt(maxStr);
        if (videoDuration < min) {
          agentGuidance += ` VIDEO LENGTH: At ${videoDuration}s, this is SHORTER than the optimal ${info.optimalLength} for ${detection.niche}. Shorter can work but risks not delivering enough value.`;
        } else if (videoDuration > max) {
          agentGuidance += ` VIDEO LENGTH: At ${videoDuration}s, this is LONGER than the optimal ${info.optimalLength} for ${detection.niche}. Risk of losing viewers before the payoff.`;
        } else {
          agentGuidance += ` VIDEO LENGTH: At ${videoDuration}s, this falls within the optimal ${info.optimalLength} range for ${detection.niche}. Smart length choice.`;
        }
      }
      break;

    case 'visual':
      agentGuidance = `\n\nNICHE VISUAL GUIDANCE: In ${detection.niche}, the best-performing formats are ${info.bestFormats.join(', ')}. Judge the visual quality against what top ${detection.niche} creators deliver. ${detection.niche === 'beauty' ? 'Lighting on skin tones is critical.' : detection.niche === 'food' ? 'Food must look appetizing - lighting and color grading matter extra.' : detection.niche === 'travel' ? 'Visual variety and cinematic quality set apart good travel content.' : `Production quality should match ${detection.niche} audience expectations.`}`;
      break;

    case 'authenticity':
      agentGuidance = `\n\nNICHE IDENTITY GUIDANCE: This video was detected as ${detection.niche}${detection.subNiche ? ` (${detection.subNiche})` : ''} content. Judge whether the creator's niche identity is clear and consistent. In ${detection.niche}, the common mistakes that kill authenticity are: ${info.commonMistakes.join(', ')}.`;
      break;

    case 'conversion':
      agentGuidance = `\n\nNICHE CTA GUIDANCE: For ${detection.niche} content, the best CTAs match the format. ${['education', 'tech', 'finance', 'diy', 'food'].includes(detection.niche) ? '"Save this for later" is the highest-value CTA - this niche drives saves.' : ['comedy', 'pets', 'parenting'].includes(detection.niche) ? '"Send this to someone who..." is the highest-value CTA - this niche drives shares.' : '"Follow for more" works if specific to the niche, e.g., "Follow for daily ' + detection.niche + ' tips."'}`;
      break;

    case 'caption':
      agentGuidance = `\n\nNICHE CAPTION GUIDANCE: In ${detection.niche}, ${['education', 'tech', 'finance', 'diy'].includes(detection.niche) ? 'on-screen text with key steps/takeaways is essential for save-worthiness' : ['comedy'].includes(detection.niche) ? 'punchline timing in text matters - reveal text should sync with the verbal punchline' : 'clean, readable captions are expected as a baseline'}.`;
      break;

    case 'accessibility':
      agentGuidance = `\n\nNICHE ACCESSIBILITY GUIDANCE: In ${detection.niche}, ${['education', 'tech', 'finance'].includes(detection.niche) ? 'captions are absolutely critical - the entire value is in the words' : ['music', 'food', 'pets', 'travel'].includes(detection.niche) ? 'visual storytelling should carry the content even without sound' : 'standard accessibility expectations apply'}.`;
      break;
  }

  return `\n${base}${agentGuidance}`;
}
