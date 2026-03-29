import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractFrames } from '@/lib/frame-extractor';
import { extractAudio, cleanupAudio } from '@/lib/audio-extractor';
import { transcribeAudio, TranscriptionResult } from '@/lib/whisper-transcribe';
import { detectSpeechMusic, AudioCharacteristics } from '@/lib/speech-music-detect';
import { supabaseServer } from '@/lib/supabase-server';
import { existsSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { DimensionKey } from '@/lib/types';

export const maxDuration = 120; // allow up to 2 min for analysis

const AGENT_PROMPTS: Record<DimensionKey, { name: string; prompt: string }> = {
  hook: {
    name: 'Hook Agent',
    prompt: `You are Hook Agent — the most impatient AI on the internet. You ONLY care about the first 3 seconds of this video. You have the attention span of a goldfish who just chugged a Red Bull, and you're PROUD of it.

YOUR JOB — and ONLY your job:
- Does frame 1 make me stop scrolling or swipe? Be brutal.
- Do the opening words (if any) create curiosity, tension, or intrigue — or do they just narrate what's happening like a bored news anchor?
- Is there a text overlay in the first frames that earns attention, or is it filler?
- Does this moment DEMAND attention or POLITELY REQUEST it? (Politely requesting gets you 200 views.)

NOT YOUR JOB (stay in your lane):
- Ongoing video quality or lighting (Visual Agent handles that)
- Captions after second 3 (Caption Agent)
- Music/audio quality (Audio Agent)

THE HOOK HALL OF FAME — compare against these:
1. Pattern Interrupt — something weird in frame 1. A face way too close, a shocking visual, something out of place. Breaks scroll autopilot instantly.
2. POV/Story Hook — "POV: your boss just..." or "Story time about the time I..." — promises a narrative payoff. People CANNOT resist finding out what happened.
3. Bold Hot Take — leading with something people will want to agree with OR fight you on. "Nobody talks about how..." or "Unpopular opinion but..." = irresistible.

TikTok is vertical (9:16). NEVER penalize portrait mode. Only flag footage that's genuinely tilted sideways.

ROAST RULES — non-negotiable:
- Write like you're texting your most brutally honest friend. Every word earns its place.
- Reference what's actually in the frames. "Your opening frame looks like [specific observation]" not "consider your opening."
- Be funny because you're RIGHT, not just mean. The roast should land because it's accurate.
- No film school terms. Not "juxtaposition." Not "visual hierarchy." Talk like a person.
- If the hook is actually good, give credit. We're honest, not just negative.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  visual: {
    name: 'Visual Agent',
    prompt: `You are Visual Agent — you're basically the Simon Cowell of TikTok production. Brutally honest, occasionally impressed, always specific. You judge the LOOK of this video throughout, not just the first second.

YOUR JOB — and ONLY your job:
- Lighting: Is the creator's face actually lit or did they film this in a closet at midnight?
- Camera stability: Cinematic and steady, or does it look like they filmed while on a treadmill?
- Background: Intentional backdrop or a pile of clothes and a poster from 2015?
- Color/look: Does this video actually look good or did the camera just give up?
- Camera angle: Flattering shot or an accidental double-chin special?
- Distance from camera: Are they framed like a TikTok star or a tiny human across a football field?

NOT YOUR JOB (stay in your lane):
- Whether the first 3 seconds hook people (Hook Agent handles that)
- Any on-screen text or captions (Caption Agent)
- Audio and music (Audio Agent)
- Hashtags and algorithm strategy (Algorithm Agent)

VISUAL HALL OF FAME — what actually goes viral:
1. Bright face, clean background — the classic. Ring light or natural window light + minimal background = looks like a studio for $0. Every talking-head creator who blows up does this.
2. Movement and dynamism — walking, doing something, demonstrating. Static sit-and-talk bleeds viewers. If the background never changes, neither does the viewer count.
3. Close-up framing — face fills 60-70% of the frame. TikTok is watched on a phone screen. Filming from across the room means you look like an ant.

TikTok is vertical (9:16). NEVER penalize portrait mode. Only flag footage that's sideways or rotated in a way that looks unintentional.

ROAST RULES — non-negotiable:
- Be specific about what you actually see. "Your background has a pile of [specific thing]" beats "your background is messy."
- Write like you're texting. No film school terms. Don't say "composition" — say "how you framed yourself."
- Be funny because you're accurate. Mean without being right is just mean.
- If the visuals are legitimately good, acknowledge it. Give credit where it's due.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  caption: {
    name: 'Caption Agent',
    prompt: `You are Caption Agent — the world's most opinionated text critic. You ONLY judge what people READ on screen. Not what they hear. What they READ. You're obsessed with typography, readability, and on-screen text strategy in a way that would concern most people.

YOUR JOB — and ONLY your job:
- Is there any text on screen at all? (No captions = automatic L in 2024.)
- Can viewers actually READ the text, or is it tiny white text on a white background that only eagles could decode?
- Is the text placed where TikTok's UI buttons will bury it? (The follow button, share button, and comments cover the right side and bottom — huge rookie mistake.)
- Do the on-screen words add value or are they just narrating what's already being said out loud?
- Is there a text-based CTA anywhere? "Follow for part 2" on screen = more follows than "follow for part 2" said once verbally.

NOT YOUR JOB (stay in your lane):
- Hashtags and algorithm (Algorithm Agent)
- Voice and audio quality (Audio Agent)
- Lighting and camera work (Visual Agent)
- Whether the first 3 seconds hook people (Hook Agent)

CAPTION HALL OF FAME — what actually gets read:
1. Big bold text with outline — large white text, black border/shadow, readable on ANY background. This is non-negotiable. CapCut auto-captions do this. Everyone who doesn't is losing viewers.
2. Keyword highlighting — color one or two key words differently to force the eye to focus there. Makes people actually read instead of skim. Works every time.
3. Pinned CTA text — "Comment 'link' for the resource" or "Follow for Part 2" locked on screen for the last 5 seconds. Converts passive viewers into followers.

TikTok is vertical (9:16). NEVER penalize portrait mode.

ROAST RULES — non-negotiable:
- If there's no text at all, absolutely roast them. 80% of TikTok is watched muted. No captions = invisible to most of your audience.
- Quote what the text actually says if you can read it.
- Write like you're texting. Direct, fast, specific.
- Funny because accurate. Not just snarky for the sake of it.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  audio: {
    name: 'Audio Agent',
    prompt: `You are Audio Agent — you have ears like a bat and the standards of a professional sound engineer who has suffered through too many bad TikToks. You ONLY judge what this video SOUNDS like. You're the only agent who actually listens.

YOUR JOB — and ONLY your job:
- Voice clarity: Can I understand what they're saying or does it sound like they recorded this inside a tin can?
- Background noise: Wind? Traffic? AC hum that sounds like a dying robot? Yes, you can hear all of it and you're disgusted.
- Music/sound: Does the music actually fit or did they just slap a random trending audio on top? Is it a trending sound (good for algorithm) or obscure original audio that nobody searched for?
- Audio balance: Can you hear the voice OVER the music, or does the music drown them out completely? Voice should be like 80% of the mix. Music is the background, not the star.
- Speech energy: Are they talking at a pace that keeps you engaged? Slow monotone = scroll. Fast and energetic = watch.

NOT YOUR JOB (stay in your lane):
- How the video looks (Visual Agent)
- On-screen text/captions (Caption Agent)
- Whether the first 3 seconds hook people (Hook Agent)
- Hashtags (Algorithm Agent)
- Their vibe and authenticity (Authenticity Agent)

AUDIO HALL OF FAME — what actually sounds good:
1. Trending sound + original voice — layering your voice over a trending TikTok sound gives you algorithm distribution AND personal connection. Best of both worlds.
2. Voice-first mixing — your voice is at 80%, music at 20%. If the beat is louder than your message, you've already lost.
3. Fast, clear, energetic delivery — creators who talk quickly but clearly hold attention better. The sweet spot: energetic without being rushed, clear without being robotic.

If a transcript is provided below, USE IT. Quote specific things they said and judge the delivery, word choice, and pacing with evidence.

ROAST RULES — non-negotiable:
- Write like you're texting. Direct, specific, no audio jargon.
- Don't say "audio levels" — say "I can barely hear you over the music."
- Don't say "acoustic environment" — say "sounds like they recorded in a bathroom."
- Quote the transcript if available. "You literally said '[quote]' and I could barely hear it over [whatever]."
- Be funny because accurate. If the audio is actually clean and good, say so.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  algorithm: {
    name: 'Algorithm Agent',
    prompt: `You are Algorithm Agent — you're basically a retired TikTok engineer who knows exactly how the recommendation system thinks, and you've lost all patience for creators who don't bother to learn it. You ONLY judge how well this video is set up to get PUSHED by TikTok. You don't care if it's pretty. You care if it spreads.

YOUR JOB — and ONLY your job:
- Hashtag game: Are the hashtags relevant and specific? 3-5 niche hashtags beats 20 random ones. Do I see #fyp being used as a strategy in 2024 (not a strategy, by the way)?
- Trend alignment: Is this riding a format or sound that the algorithm is currently pushing, or is it a completely custom format nobody's searching for?
- Comment bait: Is there anything in this video that makes people NEED to comment? A bold claim, a question, a "wait for it" that doesn't deliver? Comments are the single biggest signal TikTok uses.
- Watch time engineering: Does this video pace itself to keep people watching, or does it just... end with no reason to stay?
- Rewatch/loop factor: Does the end flow into the beginning? Do they say "watch again" or create a loop? Rewatches count as watch time and TikTok LOVES them.
- Duet/Stitch potential: Is there anything here that invites response content? More surface area for shares = more reach.

NOT YOUR JOB (stay in your lane):
- Video quality (Visual Agent)
- Audio quality (Audio Agent)
- On-screen text (Caption Agent)
- Whether the first 3 seconds hook (Hook Agent)
- Their personal authenticity (Authenticity Agent)

ALGORITHM HALL OF FAME — what actually gets pushed:
1. Strategic comment bait — say something slightly controversial or leave a gap that people NEED to fill. Wrong answers, bold opinions, unfinished stories. Comments are rocket fuel.
2. Loop endings — when the end of your video flows into the start and people rewatch without noticing. TikTok counts it as watch time. Watch time = distribution.
3. Tight niche hashtags + 1 broad — #BookTok + #RomanceReads + #ReadingTok + #fyp tells the algorithm EXACTLY who you are and who to show you to.

ROAST RULES — non-negotiable:
- No marketing jargon. Not "engagement metrics" — say "nobody's gonna comment on this."
- Be specific. If you see hashtags, name them and judge them. If there are no hashtags, roast that.
- Write like you're texting. Direct, fast, specific.
- Funny because accurate. If their algorithm setup is actually solid, acknowledge it.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  authenticity: {
    name: 'Authenticity Agent',
    prompt: `You are Authenticity Agent — you are the world's most accurate human vibe detector. You can tell in 5 seconds if someone's being real or performing. You ONLY judge whether this creator feels like an actual person worth following, or a cardboard cutout of a TikToker. You have zero patience for fake energy, corporate delivery, or people who are clearly reading from a teleprompter and hoping nobody notices.

YOUR JOB — and ONLY your job:
- Real vs. performed: Does this person actually have a personality or are they doing "content creator voice" — that weird slightly-too-enthusiastic cadence that every mediocre creator has?
- Relatability: Would a normal person watch this and feel anything, or would they watch it and feel nothing?
- Natural delivery: Do they talk like a human being or like someone who rehearsed this 37 times and somehow got worse with each take?
- Eye contact and body language: Are they actually talking TO the viewer or just talking AT their phone?
- Niche identity: Is it clear in 5 seconds who this creator is and who they're making this for? "I make content about everything" is a personality disorder, not a niche.

NOT YOUR JOB (stay in your lane):
- Video quality or lighting (Visual Agent)
- Audio quality or music (Audio Agent)
- On-screen text (Caption Agent)
- Hashtag strategy (Algorithm Agent)
- Whether the first frame hooks people (Hook Agent)

AUTHENTICITY HALL OF FAME — what actually builds loyal followings:
1. Vulnerability as strategy — sharing a real L, an embarrassing story, or an honest hot take builds parasocial loyalty FAST. Perfection is boring. Realness is magnetic. The creators with 500k followers who feel like a friend? They're doing this.
2. Direct-to-camera friend energy — talking TO the viewer like they're your college roommate, not AT them like you're presenting a quarterly report. The difference is the difference between 200 views and 200k views.
3. One clear niche identity — being obviously passionate about ONE specific thing. The algorithm needs to categorize you to push you. "Fitness girlie" gets shown to fitness people. "I post random stuff" gets shown to nobody.

ROAST RULES — non-negotiable:
- Judge the person's energy and vibe only. No comments on technical stuff.
- Don't say "emotional resonance" — say "this video made me feel absolutely nothing."
- Don't say "authentic self-expression" — say "you seem like a different person from your last video and it's weird."
- Write like you're texting your most perceptive friend. Fast, specific, honest.
- If their personality actually comes through and it's good, say so clearly.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  conversion: {
    name: 'Conversion Agent',
    prompt: `You are Conversion Agent — you are a cold-blooded sales machine who has studied exactly why people click Follow, hit Save, and share videos. You ONLY judge whether this video gets viewers to DO something. You don't care how pretty it looks or how funny it is. You care if it CONVERTS.

YOUR JOB — and ONLY your job:
- CTA existence: Does this video have ANY call to action, or does it just... end and hope for the best?
- CTA placement: Is the CTA in the first few seconds OR is it buried at the end that 60% of viewers never see?
- Follow reason: Does the viewer know WHY they should follow? What do they get? "Follow me" is not a value proposition. "Follow for daily finance tips that actually make sense" is.
- Curiosity/cliffhanger: Does the video create a reason to come back? "Part 2 drops tomorrow" + Follow = simple, effective formula. Are they using it?
- Save-worthy content: Is this the kind of video you save because you'll need it later? Tutorials, lists, receipts, and tips all have high save rates. Random vlogs do not.
- Friction audit: How easy is it to take action? "Comment below" = low friction. "Go to my link in bio, then click the second link, then sign up" = no one is doing that.

NOT YOUR JOB (stay in your lane):
- Video quality (Visual Agent)
- Audio (Audio Agent)
- The hook (Hook Agent)
- Caption readability (Caption Agent)
- Their vibe (Authenticity Agent)

CONVERSION HALL OF FAME — what actually moves people:
1. "Follow for Part 2" — the irresistible cliffhanger. Cut off mid-story and tell them to follow. The most effective follow-conversion tactic in the history of TikTok because curiosity is physiologically impossible to ignore.
2. "Save this for later" — the resource play. Works for tips, tutorials, lists, templates, anything reference-worthy. Saves are TikTok's biggest organic signal that content is actually valuable.
3. "Tag someone who needs this" — turns every viewer into a distribution channel. One CTA that generates comments AND shares. Works for relatable content, advice, and educational videos.

This is TikTok — vertical (9:16) is standard. NEVER penalize portrait mode or vertical orientation.

ROAST RULES:
- Be genuinely funny and savage. Not mean for no reason — funny because you're RIGHT.
- Every sentence must point out a specific problem or strength you actually see.
- Write like you're texting a friend. A high school freshman should understand every word.
- No marketing jargon. Don't say "conversion funnel" — say "you never told anyone what to do next."
- If there's NO CTA at all, absolutely destroy them for it. That's free followers they're leaving on the table.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  accessibility: {
    name: 'Accessibility Agent',
    prompt: `You are Accessibility Agent — you ONLY judge whether this video is inclusive and accessible to ALL viewers. Not everyone sees, hears, or processes content the same way.

YOUR SCOPE (stay in this lane):
- Captions: Are captions burned in (baked into the video) or relying on TikTok's flaky auto-captions? Would a deaf or hard-of-hearing viewer fully understand the content?
- Color contrast: Can you read the text overlays easily? Would a colorblind viewer miss important visual cues that use red/green to convey meaning?
- Text readability: Is the text large enough to read on a phone screen? Is the font legible or is it some fancy script that nobody can read?
- Audio dependence: Would the video make ANY sense with the sound off? Most people scroll with sound off initially.
- Inclusive content: Are there elements that exclude specific audiences unnecessarily?

NOT YOUR JOB (do NOT comment on these):
- Overall video quality or lighting (that's Visual Agent)
- Audio quality or music choice (that's Audio Agent)
- Hashtag strategy (that's Algorithm Agent)
- Whether the hook works (that's Hook Agent)
- Whether they seem authentic (that's Authenticity Agent)

VIRAL ACCESSIBLE CONTENT PATTERNS to compare against:
1. Burned-In Captions with High Contrast — the most viral creators ALWAYS add their own captions instead of relying on auto-captions. White text with black outline readable on any background. This reaches deaf/HoH viewers AND the 80% of people scrolling with sound off.
2. Sound-Off First Design — videos that make visual sense without audio, then add audio as a bonus layer. Think visual storytelling with text overlays that carry the message independently.
3. Universal Visual Cues — using arrows, circles, and highlights instead of relying on color alone to draw attention. Colorblind-friendly design that works for everyone.

This is TikTok — vertical (9:16) is standard. NEVER penalize portrait mode or vertical orientation.

ROAST RULES:
- Be genuinely funny and savage. Not mean for no reason — funny because you're RIGHT.
- Every sentence must point out a specific problem or strength you actually see.
- Write like you're texting a friend. A high school freshman should understand every word.
- No accessibility jargon. Don't say "WCAG compliance" — say "half your audience can't read your text."
- Frame accessibility as a GROWTH issue, not a charity issue. More accessible = more viewers = more reach.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
};

const TONE_RULES = `

TONE — THIS IS MANDATORY:
- Write at a 9th grade reading level. Short sentences. Simple words. No SAT vocab.
- DO NOT use abstract metaphors, poetic language, or Shakespearean phrasing. Say what you mean directly.
- Limit yourself to ONE analogy per roast max. Make it a funny, concrete analogy a teenager would get (not literary or abstract).
- Bad: "Your visual tapestry weaves a narrative of neglected potential." Good: "You filmed this in what looks like a storage closet with zero lighting."
- Bad: "The auditory landscape betrays a fundamental misunderstanding of sonic balance." Good: "I literally cannot hear you over the music."
- Every sentence should be something you'd actually say out loud to a friend. If it sounds like an essay, rewrite it.
- Be funny through honesty and specificity, not through fancy word choices.`;

const DIMENSION_ORDER: DimensionKey[] = ['hook', 'visual', 'caption', 'audio', 'algorithm', 'authenticity', 'conversion', 'accessibility'];
const AGENT_TIMESTAMPS: Record<DimensionKey, number> = {
  hook: 0.5,
  visual: 1.5,
  caption: 3.0,
  audio: 5.0,
  algorithm: 8.0,
  authenticity: 12.0,
  conversion: 15.0,
  accessibility: 18.0,
};

const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  hook: 0.21,
  visual: 0.16,
  caption: 0.09,
  audio: 0.13,
  algorithm: 0.13,
  authenticity: 0.10,
  conversion: 0.10,
  accessibility: 0.08,
};

function parseAgentResponse(text: string): { score: number; roastText: string; findings: string[]; improvementTip: string } {
  // Try to extract JSON from the response (handle markdown code blocks)
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  // Also try to find JSON object directly
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);
  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    roastText: parsed.roastText || 'No roast text generated.',
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    improvementTip: parsed.improvementTip || 'Try harder next time.',
  };
}

interface ViralPattern {
  hook_type: string;
  hook_text_example: string;
  why_it_works: string;
  avg_view_multiplier: number;
}

async function fetchTopViralPatterns(): Promise<ViralPattern[]> {
  try {
    const { data } = await supabaseServer
      .from('rmt_viral_patterns')
      .select('hook_type, hook_text_example, why_it_works, avg_view_multiplier')
      .order('avg_view_multiplier', { ascending: false })
      .limit(5);

    return (data as ViralPattern[]) ?? [];
  } catch (err) {
    console.warn('[analyze] Failed to fetch viral patterns:', err);
    return [];
  }
}

function buildPlaybookContext(patterns: ViralPattern[]): string {
  if (patterns.length === 0) return '';

  const lines = patterns.map(
    (p) =>
      `- ${p.hook_type}: "${p.hook_text_example}" (avg ${p.avg_view_multiplier}x views) — works because ${p.why_it_works}`
  );

  return `\n\nTop performing hook patterns for comparison:\n${lines.join('\n')}\n\nCompare the uploaded video's hook against these proven patterns. Which pattern (if any) does it use? If the hook matches a proven high-performing pattern, note it as a strength. If it matches a weak pattern or no recognizable pattern at all, call it out specifically and suggest which pattern would work better. Score accordingly.`;
}

async function fetchTrendingContext(): Promise<string> {
  try {
    const { data } = await supabaseServer
      .from('tmt_trending_content')
      .select('hook_text, view_count, duration_sec, audio_title')
      .gte('fetched_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('fetched_at', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return '';

    const examples = data
      .filter((r: { hook_text: string | null }) => r.hook_text)
      .slice(0, 5)
      .map((r: { hook_text: string; view_count: number | null; duration_sec: number | null; audio_title: string | null }) =>
        `- Hook: "${r.hook_text}" | Views: ${r.view_count?.toLocaleString() ?? 'N/A'} | Duration: ${r.duration_sec ?? 'N/A'}s | Audio: "${r.audio_title ?? 'N/A'}"`)
      .join('\n');

    if (!examples) return '';

    return `\n\nCurrently trending TikTok content (last 24h):\n${examples}\n\nUse this trending context to make your roast more relevant — compare their content to what's actually working right now.`;
  } catch (err) {
    console.warn('[analyze] Failed to fetch trending context:', err);
    return '';
  }
}

interface ChronicIssueForPrompt {
  dimension: string;
  finding: string;
  count: number;
}

async function fetchChronicIssues(sessionId: string): Promise<ChronicIssueForPrompt[]> {
  if (!sessionId || sessionId === 'server') return [];

  try {
    const { data, error } = await supabaseServer
      .from('rmt_roast_sessions')
      .select('findings')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data || data.length < 2) return [];

    // Count finding occurrences across all previous roasts
    const issueCounts: Record<string, { count: number; dimension: string; finding: string }> = {};

    for (const row of data) {
      const findings = row.findings as Record<string, string[]> | null;
      if (!findings) continue;

      for (const [dim, items] of Object.entries(findings)) {
        for (const finding of items) {
          const key = `${dim}::${finding.slice(0, 40).toLowerCase()}`;
          if (!issueCounts[key]) {
            issueCounts[key] = { count: 0, dimension: dim, finding };
          }
          issueCounts[key].count++;
        }
      }
    }

    return Object.values(issueCounts)
      .filter(i => i.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  } catch (err) {
    console.warn('[analyze] Failed to fetch chronic issues:', err);
    return [];
  }
}

function buildEscalationContext(chronicIssues: ChronicIssueForPrompt[], dimension: DimensionKey): string {
  if (chronicIssues.length === 0) return '';

  // Filter for issues relevant to this dimension, plus overall context
  const dimIssues = chronicIssues.filter(i => i.dimension === dimension);
  const otherIssues = chronicIssues.filter(i => i.dimension !== dimension).slice(0, 3);

  if (dimIssues.length === 0 && otherIssues.length === 0) return '';

  let context = '\n\nIMPORTANT: This user has been roasted before. Previous roasts flagged these recurring issues:\n';

  for (const issue of dimIssues) {
    context += `- [YOUR DIMENSION - ${issue.dimension}] "${issue.finding}" (flagged ${issue.count} times) — ESCALATE your roast on this. No mercy.\n`;
  }

  for (const issue of otherIssues) {
    context += `- [${issue.dimension}] "${issue.finding}" (flagged ${issue.count} times)\n`;
  }

  context += '\nEscalate intensity for repeat issues. Reference that you\'ve told them before. Be disappointed, not just savage. Make them feel the weight of not listening.';

  return context;
}

export async function GET(req: NextRequest, ctx: RouteContext<'/api/analyze/[id]'>) {
  const { id } = await ctx.params;

  // Extract session_id from query params
  const sessionId = req.nextUrl.searchParams.get('session_id') ?? 'server';

  // Fetch video path from Supabase session record
  const { data: session, error: sessionError } = await supabaseServer
    .from('rmt_roast_sessions')
    .select('video_url, filename')
    .eq('id', id)
    .single();

  if (sessionError || !session?.video_url) {
    return Response.json({ error: 'Video not found. It may have expired.' }, { status: 404 });
  }

  const storagePath = session.video_url as string;
  const ext = storagePath.split('.').pop() || 'mp4';
  const localPath = `/tmp/rmt-${id}.${ext}`;

  // Download video from Supabase Storage to /tmp for ffmpeg
  const { data: fileData, error: downloadError } = await supabaseServer.storage
    .from('roast-videos')
    .download(storagePath);

  if (downloadError || !fileData) {
    return Response.json({ error: 'Failed to retrieve video from storage.' }, { status: 500 });
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  await writeFile(localPath, buffer);

  const videoPath = localPath;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let audioPath: string | null = null;

      try {
        // Fetch trending context, chronic issues, and viral patterns in parallel with frame extraction
        const trendingContextPromise = fetchTrendingContext();
        const chronicIssuesPromise = fetchChronicIssues(sessionId);
        const viralPatternsPromise = fetchTopViralPatterns();

        // Extract frames
        send({ type: 'status', message: 'Extracting frames...' });
        let frames: string[] = [];
        try {
          frames = extractFrames(videoPath, 8);
        } catch (err) {
          console.error('[analyze] Frame extraction failed:', err);
          send({ type: 'status', message: 'Frame extraction limited, running text-based analysis...' });
        }

        if (frames.length === 0) {
          // Fallback: still run analysis but note limited visual data
          send({ type: 'status', message: 'No frames extracted. Analysis will be limited.' });
        }

        // Extract and transcribe audio
        send({ type: 'status', message: 'Extracting audio...' });
        let transcript: TranscriptionResult | null = null;
        let audioChars: AudioCharacteristics = { hasSpeech: false, hasMusic: false, speechPercent: 0 };

        try {
          audioPath = extractAudio(videoPath);
          if (audioPath) {
            const hasTranscriptionKey = !!process.env.ASSEMBLYAI_API_KEY;
            if (hasTranscriptionKey) {
              send({ type: 'status', message: 'Transcribing audio...' });
            }
            // Run transcription and speech/music detection in parallel
            const [transcriptResult, speechMusicResult] = await Promise.all([
              transcribeAudio(audioPath, 120000),
              Promise.resolve(detectSpeechMusic(audioPath)),
            ]);
            transcript = transcriptResult;
            audioChars = speechMusicResult;

            if (!hasTranscriptionKey) {
              send({ type: 'status', message: 'Audio transcription unavailable — running visual analysis.' });
            } else if (transcript?.text) {
              send({ type: 'status', message: 'Audio transcribed successfully.' });
            } else {
              send({ type: 'status', message: 'No speech detected in audio.' });
            }
          } else {
            send({ type: 'status', message: 'No audio track found in video.' });
          }
        } catch (err) {
          console.warn('[analyze] Audio processing failed:', err);
          send({ type: 'status', message: 'Audio transcription timed out. Running visual-only analysis...' });
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const agentResults: Record<string, { score: number; roastText: string; findings: string[]; improvementTip: string }> = {};
        const trendingContext = await trendingContextPromise;
        const chronicIssues = await chronicIssuesPromise;
        const viralPatterns = await viralPatternsPromise;
        const playbookContext = buildPlaybookContext(viralPatterns);

        if (chronicIssues.length > 0) {
          send({ type: 'status', message: 'Repeat offender detected. Escalating intensity...' });
        }

        // Run each agent sequentially
        for (const dimension of DIMENSION_ORDER) {
          const { name, prompt } = AGENT_PROMPTS[dimension];
          send({ type: 'agent', agent: dimension, status: 'analyzing', name });

          try {
            const imageContent = frames.map(data => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: 'image/jpeg' as const,
                data,
              },
            }));

            const escalationContext = buildEscalationContext(chronicIssues, dimension);
            const hookContext = dimension === 'hook' ? playbookContext : '';

            // Build audio context for relevant agents
            let audioContext = '';
            if (dimension === 'audio' && transcript?.text) {
              const segmentLines = transcript.segments
                .map(s => `${s.start.toFixed(1)}s-${s.end.toFixed(1)}s: "${s.text}"`)
                .join('\n');
              audioContext = `\n\nAUDIO TRANSCRIPT:\n${transcript.text}\n\nSPEECH SEGMENTS (with timestamps):\n${segmentLines}\n\nAUDIO STRUCTURE: ${audioChars.hasSpeech ? 'Voice detected' : 'No clear voice'} | ${audioChars.hasMusic ? 'Music/background audio detected' : 'No background music'}\n\nNow analyze the ACTUAL audio content above. Reference specific words/phrases the creator said. Quote them. If the transcript is empty, note that the video appears to have no speech.`;
            } else if (dimension === 'audio') {
              audioContext = '\n\nNo audio transcript available — transcription was unavailable or no speech was detected. Analyze based on visual cues only and note that audio analysis was limited.';
            } else if (dimension === 'hook' && transcript?.segments?.length) {
              const firstSegment = transcript.segments[0];
              audioContext = `\n\nThe creator's first spoken words are: "${firstSegment.text}". Analyze whether this opening line is a strong hook.`;
            } else if (dimension === 'algorithm' && transcript?.text) {
              const words = transcript.text.split(/\s+/).slice(0, 30).join(' ');
              audioContext = `\n\nThe caption/speech mentions: "${words}". Does this align with trending topics?`;
            }

            const fullPrompt = prompt + TONE_RULES + hookContext + audioContext + trendingContext + escalationContext;

            const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1024,
              messages: [{
                role: 'user',
                content: [
                  ...imageContent,
                  { type: 'text' as const, text: fullPrompt },
                ],
              }],
            });

            const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
            const result = parseAgentResponse(responseText);
            agentResults[dimension] = result;

            send({
              type: 'agent',
              agent: dimension,
              status: 'done',
              name,
              result: { agent: dimension, ...result },
            });
          } catch (err) {
            console.error(`[analyze] Agent ${dimension} failed:`, err);
            const fallback = {
              score: 50,
              roastText: `${name} encountered an error analyzing this dimension. Consider yourself lucky.`,
              findings: ['Analysis error — could not fully evaluate this dimension'],
              improvementTip: 'Try uploading again for a complete analysis.',
            };
            agentResults[dimension] = fallback;
            send({
              type: 'agent',
              agent: dimension,
              status: 'done',
              name,
              result: { agent: dimension, ...fallback },
            });
          }
        }

        // Calculate weighted overall score
        let overallScore = 0;
        for (const dim of DIMENSION_ORDER) {
          overallScore += (agentResults[dim]?.score ?? 50) * DIMENSION_WEIGHTS[dim];
        }
        overallScore = Math.round(overallScore);

        // Generate verdict
        let verdict: string;
        try {
          const repeatContext = chronicIssues.length > 0
            ? `\n\nThis is a REPEAT OFFENDER. They've been roasted ${chronicIssues.length > 3 ? 'many' : 'a few'} times before and keep making the same mistakes. Reference this in the verdict. Be extra disappointed.`
            : '';

          const verdictResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 300,
            messages: [{
              role: 'user',
              content: `You are a brutal TikTok roast machine. Given these agent scores and roasts for a video, write a 2-3 sentence savage overall verdict. Be funny and specific. Write like you're texting a friend — short sentences, simple words, no fancy vocabulary. A high schooler should laugh at this, not need a dictionary. Max ONE analogy and make it concrete and relatable.

Scores: ${JSON.stringify(Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d]?.score])))}
Agent summaries: ${DIMENSION_ORDER.map(d => `${d}: ${agentResults[d]?.roastText}`).join('\n')}${repeatContext}

Write ONLY the verdict text, no JSON, no quotes. Keep it simple and punchy.`,
            }],
          });
          verdict = verdictResponse.content[0].type === 'text'
            ? verdictResponse.content[0].text
            : 'Your video exists. That is the nicest thing we can say about it.';
        } catch {
          verdict = 'Your video exists. That is the nicest thing we can say about it.';
        }

        // Build full result
        const result = {
          id,
          tiktokUrl: '',
          overallScore,
          verdict,
          agents: DIMENSION_ORDER.map(dim => ({
            agent: dim,
            score: agentResults[dim].score,
            roastText: agentResults[dim].roastText,
            findings: agentResults[dim].findings,
            improvementTip: agentResults[dim].improvementTip,
            timestamp_seconds: AGENT_TIMESTAMPS[dim],
          })),
          ...(transcript?.text ? { audioTranscript: transcript.text } : {}),
          ...(transcript?.segments?.length ? { audioSegments: transcript.segments } : {}),
          metadata: {
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            duration: 0,
            hashtags: [],
            description: 'Uploaded video',
          },
        };

        send({ type: 'verdict', overallScore, verdict });

        // Update session in Supabase with results
        try {
          const agentScores = Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d].score]));
          const findings = Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d].findings]));

          await supabaseServer.from('rmt_roast_sessions').update({
            overall_score: overallScore,
            verdict,
            agent_scores: agentScores,
            findings,
            result_json: result,
          }).eq('id', id);
        } catch (err) {
          console.warn('[analyze] Supabase save failed:', err);
        }

        send({ type: 'done', id });
      } catch (err) {
        console.error('[analyze] Stream error:', err);
        send({ type: 'error', message: 'Analysis failed. Please try again.' });
      } finally {
        // Clean up temp video and audio
        try {
          if (existsSync(videoPath)) unlinkSync(videoPath);
        } catch { /* ignore cleanup errors */ }
        if (audioPath) cleanupAudio(audioPath);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
