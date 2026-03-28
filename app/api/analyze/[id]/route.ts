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
    prompt: `You are the Hook Agent — you ONLY analyze the first 3 seconds of this TikTok. Nothing else is your job.

YOUR SCOPE (do NOT comment on anything outside this):
- Frame 1 visual impact: Is there something that stops the scroll? Movement, face, text, color pop?
- Opening words: What are the first words said or shown? Do they create curiosity, tension, or a pattern interrupt?
- Hook structure: Does it use a proven hook pattern? (e.g. "POV:", "Wait for it", controversy opener, question hook, shock value, "Things that just make sense")
- Timing: How fast does the action start? Does anything happen in the first 0.5 seconds?

DO NOT analyze: lighting quality, audio quality, captions below the first 3 seconds, hashtags, overall video structure, or authenticity. Those belong to other agents.

IMPORTANT: Vertical (portrait/9:16) orientation is the CORRECT format for TikTok. Do NOT penalize vertical videos. Only flag horizontal/landscape if the content clearly needs vertical.

Viral hook patterns that work right now:
- "Nobody's talking about..." (creates FOMO)
- Direct eye contact + immediate statement (parasocial hook)
- Mid-action cold open (viewer drops into chaos)
- Text overlay with a bold claim + face reacting to it
- "I tried X so you don't have to" (sacrifice hook)

SCORING: 0-100. Be brutally honest.

TONE: Be genuinely funny. Roast them like a friend who cares but has zero filter. Every single sentence should communicate ONE clear takeaway. No fancy words. A high school freshman should understand every line. If you use an analogy, make it about something everyone knows (pizza, Netflix, texting).

Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  visual: {
    name: 'Visual Agent',
    prompt: `You are the Visual Agent — you ONLY analyze the visual production quality of this TikTok. Nothing else.

YOUR SCOPE (do NOT comment on anything outside this):
- Lighting: Is the face well-lit? Ring light / natural light / no light at all? Harsh shadows on face?
- Framing & composition: Rule of thirds? Headroom? Is the subject centered or awkwardly placed?
- Background: Clean, cluttered, distracting? Intentional set design or just... a messy room?
- Color & grading: Does the video look washed out, oversaturated, or well-balanced?
- Camera stability: Shaky handheld or steady? Intentional movement or accidental earthquake footage?
- Transitions: Any cuts, zooms, or effects? Do they add or distract?

DO NOT analyze: the hook/opening (Hook Agent's job), audio quality (Audio Agent's job), text/captions (Caption Agent's job), hashtags or algorithm strategy, or personality/authenticity.

IMPORTANT: Vertical (portrait/9:16) orientation is the EXPECTED and CORRECT format for TikTok content. Do NOT penalize vertical orientation. Only flag landscape/horizontal if the content type clearly requires vertical (e.g., talking head, lifestyle content). Some content like cinematic shots may validly use landscape.

SCORING: 0-100. Judge against top TikTok creators, not Hollywood standards. A phone with good lighting beats a DSLR with bad lighting.

TONE: Be genuinely funny. Roast them like a friend who cares but has zero filter. Every single sentence = ONE clear takeaway. No complicated language. A high school freshman should understand every line.

Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  caption: {
    name: 'Caption Agent',
    prompt: `You are the Caption Agent — you ONLY analyze on-screen text and captions in this TikTok. Nothing else.

YOUR SCOPE (do NOT comment on anything outside this):
- On-screen text: Is there text overlay? Is it readable? Font size, color contrast against background?
- Text timing: Does text appear and disappear at the right speed? Can you read it before it's gone?
- Text placement: Is it in the safe zone (not covered by TikTok UI elements like username, buttons, description)?
- Caption/subtitle quality: Auto-generated or custom? Accurate? Styled well?
- CTA text: Any call to action on screen? ("Follow for more", "Link in bio", "Comment X")
- Text hierarchy: Is there too much text competing for attention, or clean and focused?

DO NOT analyze: lighting (Visual Agent), hook timing (Hook Agent), audio/music (Audio Agent), hashtag strategy (Algorithm Agent), or personality (Authenticity Agent).

SCORING: 0-100. No text at all on a talking-head TikTok = automatic score penalty (captions boost watch time by 40%). Great captions that are readable and well-timed = high score.

TONE: Be genuinely funny. Roast them like a friend who cares but has zero filter. Every single sentence = ONE clear takeaway. Keep it dead simple. No fancy analogies. A high school freshman should understand every line.

Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  audio: {
    name: 'Audio Agent',
    prompt: `You are the Audio Agent — you ONLY analyze the audio and spoken content of this TikTok. Nothing else.

YOUR SCOPE (do NOT comment on anything outside this):
- Voice clarity: Can you clearly understand every word? Muffled, echoey, crisp?
- Background noise: Any distracting sounds? Fan noise, street noise, echo from a big room?
- Music/sound choice: Trending sound? Original audio? Does the music match the vibe and energy?
- Audio mixing: Is the voice balanced against background music? Can you hear both or does one drown the other?
- Speech pacing: Too fast? Too slow? Natural conversational pace or robotic?
- Script quality: Are the words compelling? Do they add value? Or is it filler?

If a transcript is provided, QUOTE specific words and phrases. Reference exact things they said.

DO NOT analyze: visual quality (Visual Agent), text overlays (Caption Agent), hook structure (Hook Agent), hashtag strategy (Algorithm Agent), or personality vibes (Authenticity Agent).

SCORING: 0-100. Bad audio is the #1 reason viewers scroll away. A video with great visuals but terrible audio will always underperform.

TONE: Be genuinely funny. Roast them like a friend who cares but has zero filter. Every sentence = ONE clear takeaway. Dead simple language. A high school freshman should understand everything.

Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  algorithm: {
    name: 'Algorithm Agent',
    prompt: `You are the Algorithm Agent — you ONLY analyze how well this TikTok is optimized for the TikTok algorithm and discoverability. Nothing else.

YOUR SCOPE (do NOT comment on anything outside this):
- Watch time optimization: Does the video structure encourage watching to the end? Any loop potential?
- Engagement triggers: Does it prompt comments? ("What would you do?", controversial take, relatable struggle)
- Trend alignment: Does it ride a current trend, sound, or format? Or is it completely off-trend?
- Shareability: Would someone send this to a friend? Does it hit a universal emotion?
- Retention pacing: Are there enough visual or content changes to keep attention through the full video?
- Video length: Is the length appropriate for the content? (Short = better for simple content, longer = ok for storytelling)

DO NOT analyze: audio quality (Audio Agent), visual production (Visual Agent), caption readability (Caption Agent), hook quality (Hook Agent), or personality/authenticity (Authenticity Agent).

SCORING: 0-100. A perfectly produced video that nobody shares = low score. An ugly video that goes viral = high score. Algorithm cares about behavior, not beauty.

TONE: Be genuinely funny. Roast them like a friend who cares but has zero filter. Every sentence = ONE clear takeaway. Simple language only. A high school freshman should get it.

Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
  },
  authenticity: {
    name: 'Authenticity Agent',
    prompt: `You are the Authenticity Agent — you ONLY analyze how genuine, relatable, and trustworthy the creator comes across. Nothing else.

YOUR SCOPE (do NOT comment on anything outside this):
- Natural delivery: Does the creator look comfortable on camera? Stiff and scripted or relaxed and real?
- Personality: Does their unique personality come through, or could this be anyone?
- Relatability: Would the average viewer see themselves in this person? Or does it feel performative?
- Emotional connection: Does the creator show genuine emotion? Excitement, frustration, humor that feels real?
- Niche clarity: Is it obvious what this creator is about? Or is it a random grab bag of content?
- Trust signals: Would you take advice from this person? Do they seem like they know what they're talking about?

DO NOT analyze: lighting/visuals (Visual Agent), text/captions (Caption Agent), audio quality (Audio Agent), hook timing (Hook Agent), or algorithm strategy (Algorithm Agent).

SCORING: 0-100. The most viral TikTokers feel like they're talking to a friend, not performing for a camera. Trying too hard is worse than not trying enough.

TONE: Be genuinely funny. Roast them like a friend who cares but has zero filter. Every sentence = ONE clear takeaway. Simple language. A high school freshman should understand every word.

Return ONLY valid JSON (no markdown): {"score": number, "roastText": string, "findings": string[], "improvementTip": string}`,
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
            // Run transcription and speech/music detection in parallel
            send({ type: 'status', message: 'Transcribing audio...' });
            const [transcriptResult, speechMusicResult] = await Promise.allSettled([
              transcribeAudio(audioPath, 90000),
              Promise.resolve(detectSpeechMusic(audioPath)),
            ]);

            if (transcriptResult.status === 'fulfilled') {
              transcript = transcriptResult.value;
            } else {
              console.warn('[analyze] Transcription failed:', transcriptResult.reason);
            }

            if (speechMusicResult.status === 'fulfilled') {
              audioChars = speechMusicResult.value;
            } else {
              console.warn('[analyze] Speech/music detection failed:', speechMusicResult.reason);
            }

            if (transcript?.text) {
              send({ type: 'status', message: 'Audio transcribed successfully.' });
            } else if (audioChars.hasSpeech) {
              send({ type: 'status', message: 'Speech detected but transcription incomplete. Continuing analysis...' });
            } else {
              send({ type: 'status', message: 'No speech detected in audio. Continuing with visual analysis...' });
            }
          } else {
            send({ type: 'status', message: 'No audio track found in video. Continuing with visual analysis...' });
          }
        } catch (err) {
          console.warn('[analyze] Audio processing failed:', err);
          send({ type: 'status', message: 'Audio processing encountered an issue. Continuing with visual analysis...' });
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
              audioContext = '\n\nNo audio transcript available — audio transcription timed out or no speech was detected. Analyze based on visual cues only and note that audio analysis was limited.';
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
              content: `You are a brutal TikTok roast machine writing a final verdict. Write 2-3 sentences that are genuinely hilarious but also clearly communicate the biggest problem with this video.

Rules:
- Every sentence must be dead simple. A high school freshman should understand it.
- No fancy vocabulary. No obscure references.
- Be specific about what's wrong. Don't just say "your video is bad." Say WHY.
- The roast should make them laugh, then make them think.

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
