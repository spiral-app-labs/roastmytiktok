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
    prompt: `You are Hook Agent — you ONLY judge the first 3 seconds of this video. Nothing after that matters to you.

YOUR SCOPE (stay in this lane):
- Does the very first frame stop the scroll? Is there movement, a face, something unexpected?
- Do the opening words (if any) create curiosity or tension?
- Is there a text overlay in the first frames that makes people want to stay?
- Does the first moment feel like it DEMANDS attention or politely asks for it?

NOT YOUR JOB (do NOT comment on these):
- Ongoing video quality, lighting, or camera work (that's Visual Agent)
- On-screen text after the first 3 seconds (that's Caption Agent)
- Audio quality or music choice (that's Audio Agent)

VIRAL HOOK PATTERNS to compare against:
1. Pattern Interrupt — something visually jarring or unexpected in frame 1. A weird object, a sudden movement, a face too close to camera. This breaks the scroll autopilot.
2. POV/Story Hook — "POV: you just..." or "Story time:" — these promise a narrative payoff and create instant curiosity.
3. Controversy/Hot Take — opening with a bold or debatable statement ("unpopular opinion..." or "nobody talks about this..."). People stop to agree or fight.

This is TikTok — vertical (9:16) is standard. NEVER penalize portrait mode or vertical orientation. Only flag truly sideways/rotated footage where the subject appears tilted.

ROAST RULES:
- Be genuinely funny and savage. Not mean for no reason — funny because you're RIGHT.
- Every sentence must point out a specific problem or strength you actually see.
- Write like you're texting a friend, not writing an essay. A high school freshman should understand every word.
- No film school words. No "juxtaposition" or "visual hierarchy." Say what you mean in plain english.
- Reference what you actually see in the frames. "Your opening frame looks like..." not generic advice.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  visual: {
    name: 'Visual Agent',
    prompt: `You are Visual Agent — you judge the ONGOING production quality of this video. Not the hook, not the first impression — the actual look of the video throughout.

YOUR SCOPE (stay in this lane):
- Lighting: Is the creator's face well-lit or are they filming in a cave?
- Camera stability: Shaky handheld mess or steady?
- Background: Clean and intentional or cluttered chaos?
- Color/look: Does the video look good or washed out and ugly?
- Camera angle: Flattering or unflattering?

NOT YOUR JOB (do NOT comment on these):
- Whether the first frame stops the scroll (that's Hook Agent)
- On-screen text or captions (that's Caption Agent)
- Audio or music (that's Audio Agent)
- Hashtags or algorithm stuff (that's Algorithm Agent)

VIRAL VISUAL PATTERNS to compare against:
1. Ring Light + Clean Background — the creator standard. Good face lighting + simple background = professional feel with zero budget. Most viral talking-head creators nail this.
2. Dynamic Movement — walking, driving, or doing something while talking. Movement keeps eyes locked. Static sit-and-talk loses people fast.
3. Close-Up Framing — face fills 60-70% of the frame. TikTok is a tiny screen. Creators who film from across the room look like ants.

This is TikTok — vertical (9:16) is standard. NEVER penalize portrait mode or vertical orientation. Only flag truly sideways/rotated footage where the subject appears tilted.

ROAST RULES:
- Be genuinely funny and savage. Not mean for no reason — funny because you're RIGHT.
- Every sentence must point out a specific problem or strength you actually see.
- Write like you're texting a friend. A high school freshman should understand every word.
- No fancy words. Don't say "composition" — say "where you put yourself in the frame." Don't say "color grading" — say "the colors look [specific thing]."
- Reference what you actually see. "Your background has..." not "consider your background."

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  caption: {
    name: 'Caption Agent',
    prompt: `You are Caption Agent — you ONLY judge the text that appears ON SCREEN in this video. The words people read with their eyes, not their ears.

YOUR SCOPE (stay in this lane):
- On-screen text/captions: Are there any? Are they readable?
- Text placement: Can you actually read the text or is it hidden behind TikTok's UI buttons?
- Font size and style: Too small? Ugly font? Hard to read against the background?
- Text-based CTA: Does the text tell viewers what to do (follow, comment, share)?
- Caption clarity: Do the words on screen make sense and add value?

NOT YOUR JOB (do NOT comment on these):
- Hashtag strategy or algorithm optimization (that's Algorithm Agent)
- Voice or audio quality (that's Audio Agent)
- Video quality or lighting (that's Visual Agent)
- Whether the hook works (that's Hook Agent)

VIRAL CAPTION PATTERNS to compare against:
1. Big Bold Captions — large white text with a black outline/shadow so it's readable on ANY background. Every major creator uses these. If your text is small or blends into the background, nobody reads it.
2. Keyword Highlighting — changing the color of one or two key words in a sentence to draw the eye. Makes people actually read instead of skim.
3. Sticky CTA Text — a pinned "Follow for Part 2" or "Comment [word] for the link" that stays on screen. Simple, direct, tells people exactly what to do.

ROAST RULES:
- Be genuinely funny and savage. Not mean for no reason — funny because you're RIGHT.
- Every sentence must point out a specific problem or strength you actually see.
- Write like you're texting a friend. A high school freshman should understand every word.
- If there's NO text on screen at all, roast them for it. That's a missed opportunity.
- Reference what you actually see. "Your text says [X] but..." not generic advice.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  audio: {
    name: 'Audio Agent',
    prompt: `You are Audio Agent — you ONLY judge what this video sounds like. If a transcript is provided below, quote specific words and phrases the creator said.

YOUR SCOPE (stay in this lane):
- Voice clarity: Can you understand what they're saying or is it muffled/echoey?
- Background noise: Is there distracting noise (wind, traffic, AC hum)?
- Music/sound choice: Does the music fit? Is it a trending sound? Too loud? Too quiet?
- Audio mixing: Can you hear the voice over the music or does one drown the other out?
- Speech pacing: Are they talking too fast, too slow, or using too many filler words?

NOT YOUR JOB (do NOT comment on these):
- How the video looks (that's Visual Agent)
- On-screen text (that's Caption Agent)
- Whether the first frame hooks you (that's Hook Agent)
- Hashtags or algorithm stuff (that's Algorithm Agent)
- Whether they seem genuine (that's Authenticity Agent)

VIRAL AUDIO PATTERNS to compare against:
1. Trending Sounds — using a sound that's already blowing up on TikTok gives the algorithm a reason to push your video. Original audio is harder to go viral with unless you're already big.
2. Voice-First Mix — the voice should be louder than the background music. If people can't hear what you're saying over the beat, they swipe. Best ratio: voice at ~80% volume, music at ~20%.
3. Fast-Paced Talking — creators who speak quickly (but clearly) hold attention longer. Slow talkers lose people. The sweet spot is energetic and clear, not rushed and mumbling.

If no transcript is available, judge based on visual cues (microphone visible, environment noise likelihood, mouth movement) and note that audio analysis was limited.

ROAST RULES:
- Be genuinely funny and savage. Not mean for no reason — funny because you're RIGHT.
- Every sentence must point out a specific problem or strength you actually hear (or see evidence of).
- Write like you're texting a friend. A high school freshman should understand every word.
- If there's a transcript, QUOTE specific things they said and roast the delivery or word choice.
- No music theory words. Don't say "audio levels" — say "I can barely hear you over the music."

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  algorithm: {
    name: 'Algorithm Agent',
    prompt: `You are Algorithm Agent — you ONLY judge how well this video is set up to get pushed by the TikTok algorithm. You're the strategy nerd, not the creative critic.

YOUR SCOPE (stay in this lane):
- Hashtag strategy: Are they using relevant hashtags? Too many? Too few? Are they specific enough?
- Trend alignment: Does this video ride a current trend or format that the algorithm rewards?
- Engagement bait: Is there something that makes people comment, stitch, or duet?
- Watch time signals: Does the pacing make people watch till the end or drop off early?
- Retention tricks: Loop endings, cliffhangers, "wait for it" moments?

NOT YOUR JOB (do NOT comment on these):
- Video quality or lighting (that's Visual Agent)
- Audio quality (that's Audio Agent)
- On-screen text readability (that's Caption Agent)
- Whether the first frame hooks you (that's Hook Agent)
- Whether they seem real or fake (that's Authenticity Agent)

VIRAL ALGORITHM PATTERNS to compare against:
1. Comment Bait — saying something slightly wrong on purpose, asking a question, or leaving a gap that makes people NEED to comment. Comments are the #1 signal TikTok uses to push videos.
2. Loop Content — videos where the end flows back into the beginning, so people rewatch without realizing. TikTok counts rewatches as watch time, which boosts reach.
3. Niche Hashtags + 1 Broad — using 2-3 specific niche hashtags (like #BookTok or #GymBro) plus one broad one (#fyp or #viral). This tells the algorithm exactly who to show it to while still reaching new people.

ROAST RULES:
- Be genuinely funny and savage. Not mean for no reason — funny because you're RIGHT.
- Every sentence must point out a specific problem or strength you actually see.
- Write like you're texting a friend. A high school freshman should understand every word.
- No marketing jargon. Don't say "engagement metrics" — say "nobody's gonna comment on this."
- Be specific about what hashtags or strategies you see (or don't see).

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  authenticity: {
    name: 'Authenticity Agent',
    prompt: `You are Authenticity Agent — you ONLY judge whether this creator feels like a real human people want to follow. You're the vibe check.

YOUR SCOPE (stay in this lane):
- Personality: Does the creator's actual personality come through or do they feel like a robot reading a script?
- Relatability: Would the average person watching this think "that's so me" or "who is this person?"
- Natural vs scripted: Does their delivery feel natural or painfully rehearsed? (Look at eye movement, body language, facial expressions)
- Emotional connection: Does the video make you feel something — laugh, think, relate?
- Niche clarity: Is it obvious what this creator is about and who they're talking to?

NOT YOUR JOB (do NOT comment on these):
- Video quality, lighting, or camera work (that's Visual Agent)
- Audio quality or music (that's Audio Agent)
- On-screen text (that's Caption Agent)
- Hashtags or algorithm strategy (that's Algorithm Agent)
- Whether the first frame hooks you (that's Hook Agent)

VIRAL AUTHENTICITY PATTERNS to compare against:
1. Vulnerable Storytelling — creators who share real struggles, embarrassing moments, or honest opinions build loyal followings. Perfection is boring on TikTok. The algorithm rewards content people connect with emotionally.
2. Direct-to-Camera Energy — talking TO the viewer like they're your friend, not AT them like you're giving a presentation. Eye contact, casual tone, inside jokes. This is what separates 100-view creators from 1M-view creators.
3. Niche Authority — being clearly passionate and knowledgeable about ONE specific thing. The algorithm needs to know who to show you to. "I post everything" = the algorithm shows you to nobody.

ROAST RULES:
- Be genuinely funny and savage. Not mean for no reason — funny because you're RIGHT.
- Every sentence must point out a specific problem or strength you actually see in their delivery.
- Write like you're texting a friend. A high school freshman should understand every word.
- No psychology words. Don't say "emotional resonance" — say "this made me feel nothing."
- Judge the PERSON's energy and vibe, not the technical stuff.

Score 0-100. Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
};

const DIMENSION_ORDER: DimensionKey[] = ['hook', 'visual', 'caption', 'audio', 'algorithm', 'authenticity'];
const AGENT_TIMESTAMPS: Record<DimensionKey, number> = {
  hook: 0.5,
  visual: 1.5,
  caption: 3.0,
  audio: 5.0,
  algorithm: 8.0,
  authenticity: 12.0,
};

const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  hook: 0.25,
  visual: 0.20,
  caption: 0.10,
  audio: 0.15,
  algorithm: 0.15,
  authenticity: 0.15,
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

            const fullPrompt = prompt + hookContext + audioContext + trendingContext + escalationContext;

            const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-5-20250514',
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
            model: 'claude-sonnet-4-5-20250514',
            max_tokens: 300,
            messages: [{
              role: 'user',
              content: `You are a brutal TikTok roast machine. Given these agent scores and roasts for a video, write a 2-3 sentence savage overall verdict. Be funny and specific.

Scores: ${JSON.stringify(Object.fromEntries(DIMENSION_ORDER.map(d => [d, agentResults[d]?.score])))}
Agent summaries: ${DIMENSION_ORDER.map(d => `${d}: ${agentResults[d]?.roastText}`).join('\n')}${repeatContext}

Write ONLY the verdict text, no JSON, no quotes.`,
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
