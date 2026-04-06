import { readFileSync, existsSync, statSync } from 'fs';
import Anthropic from '@anthropic-ai/sdk';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  provider?: 'assemblyai' | 'whisper' | 'claude-audio';
  /** 0-1 confidence score: 1 = full confident transcript, <0.5 = partial/degraded */
  confidence: number;
}

/** Whisper API has a 25 MB file size limit. */
const WHISPER_MAX_FILE_BYTES = 25 * 1024 * 1024;

/** AssemblyAI allows larger files but cap at 100 MB for safety. */
const ASSEMBLYAI_MAX_FILE_BYTES = 100 * 1024 * 1024;

function normalizeSegments(
  segments: Array<{ start: number; end: number; text: string }>
): TranscriptionSegment[] {
  return segments
    .map((segment) => ({
      start: Number(segment.start.toFixed(2)),
      end: Number(segment.end.toFixed(2)),
      text: segment.text.trim(),
    }))
    .filter((segment) => segment.text.length > 0);
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  input: string,
  init: RequestInit,
  attempts: number = 3,
  baseDelayMs: number = 1200
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.ok || (response.status < 500 && response.status !== 429)) {
        return response;
      }

      const retryAfter = Number(response.headers.get('retry-after') ?? '0');
      if (attempt < attempts) {
        await wait(retryAfter > 0 ? retryAfter * 1000 : baseDelayMs * attempt);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await wait(baseDelayMs * attempt);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Network request failed');
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

/**
 * Compute a 0-1 confidence score for a transcript based on heuristics:
 * - Has text at all
 * - Has timed segments (vs just a blob of text)
 * - Segment coverage (gaps between segments suggest missed speech)
 * - Text length relative to expected speech density (~2.5 words/sec)
 */
function computeConfidence(text: string, segments: TranscriptionSegment[]): number {
  if (!text && segments.length === 0) return 0;

  let score = 0;

  // Base: we got text
  if (text.length > 0) score += 0.3;

  // Timed segments available
  if (segments.length > 0) score += 0.2;

  // Segment density: more segments = better coverage
  if (segments.length >= 3) score += 0.15;
  else if (segments.length >= 1) score += 0.05;

  // Word count heuristic: very short transcripts are suspicious
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 20) score += 0.2;
  else if (wordCount >= 5) score += 0.1;

  // Segment time coverage: check for large gaps
  if (segments.length >= 2) {
    const totalSpan = segments[segments.length - 1].end - segments[0].start;
    const coveredTime = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
    const coverage = totalSpan > 0 ? coveredTime / totalSpan : 0;
    score += coverage * 0.15;
  } else if (segments.length === 1) {
    score += 0.05;
  }

  return Math.min(1, Number(score.toFixed(2)));
}

// ---------------------------------------------------------------------------
// OpenAI Whisper API
// ---------------------------------------------------------------------------

async function transcribeWithWhisper(
  audioPath: string
): Promise<TranscriptionResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[transcribe] OPENAI_API_KEY not set — skipping Whisper');
    return null;
  }

  // Validate file size before sending to API
  const fileSize = statSync(audioPath).size;
  if (fileSize > WHISPER_MAX_FILE_BYTES) {
    console.warn(`[transcribe] Audio file too large for Whisper (${(fileSize / 1024 / 1024).toFixed(1)} MB > ${WHISPER_MAX_FILE_BYTES / 1024 / 1024} MB limit) — skipping`);
    return null;
  }

  const fileData = readFileSync(audioPath);
  const blob = new Blob([fileData], { type: 'audio/wav' });

  const form = new FormData();
  form.append('file', blob, 'audio.wav');
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');

  console.log('[transcribe] Calling OpenAI Whisper API…');
  const res = await fetchWithRetry('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(
      `[transcribe] Whisper API error ${res.status}: ${body.slice(0, 500)}`
    );
    return null;
  }

  let json: Record<string, unknown>;
  try {
    json = await res.json();
  } catch (parseErr) {
    console.error('[transcribe] Whisper returned non-JSON response:', parseErr);
    return null;
  }

  const text: string = typeof json.text === 'string' ? json.text : '';
  const segments = normalizeSegments((Array.isArray(json.segments) ? json.segments : []).map(
    (segment: { start: number; end: number; text: string }) => ({
      start: segment.start,
      end: segment.end,
      text: segment.text,
    })
  ));

  if (!text && segments.length === 0) {
    console.warn('[transcribe] Whisper returned empty transcript');
    return null;
  }

  console.log(
    `[transcribe] Whisper returned ${text.length} chars, ${segments.length} segments`
  );
  return { text, segments, provider: 'whisper', confidence: computeConfidence(text, segments) };
}

// ---------------------------------------------------------------------------
// AssemblyAI
// ---------------------------------------------------------------------------

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2';

function assemblyHeaders(contentType: string = 'application/json'): Record<string, string> {
  return {
    authorization: process.env.ASSEMBLYAI_API_KEY!,
    'content-type': contentType,
  };
}

function buildAssemblySegments(json: Record<string, unknown>): TranscriptionSegment[] {
  if (Array.isArray(json.utterances) && json.utterances.length > 0) {
    return normalizeSegments(json.utterances.map((utterance: { start: number; end: number; text: string }) => ({
      start: utterance.start / 1000,
      end: utterance.end / 1000,
      text: utterance.text,
    })));
  }

  if (Array.isArray(json.words) && json.words.length > 0) {
    return normalizeSegments(json.words.map((word: { start: number; end: number; text: string }) => ({
      start: word.start / 1000,
      end: word.end / 1000,
      text: word.text,
    })));
  }

  return [];
}

export function parseAssemblyTranscript(json: Record<string, unknown>): TranscriptionResult | null {
  const text = typeof json.text === 'string' ? json.text.trim() : '';
  const segments = buildAssemblySegments(json);
  if (!text && segments.length === 0) return null;
  return {
    text,
    segments,
    provider: 'assemblyai',
    confidence: computeConfidence(text, segments),
  };
}

async function transcribeWithAssemblyAI(
  audioPath: string,
  timeoutMs: number
): Promise<TranscriptionResult | null> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    console.warn('[transcribe] ASSEMBLYAI_API_KEY not set — skipping AssemblyAI');
    return null;
  }

  console.log('[transcribe] Calling AssemblyAI API…');

  // Validate file size before uploading
  const fileSize = statSync(audioPath).size;
  if (fileSize > ASSEMBLYAI_MAX_FILE_BYTES) {
    console.warn(`[transcribe] Audio file too large for AssemblyAI (${(fileSize / 1024 / 1024).toFixed(1)} MB > ${ASSEMBLYAI_MAX_FILE_BYTES / 1024 / 1024} MB limit) — skipping`);
    return null;
  }

  const data = readFileSync(audioPath);
  const uploadRes = await fetchWithRetry(`${ASSEMBLYAI_BASE}/upload`, {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/octet-stream' },
    body: data,
  });
  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    console.error(
      `[transcribe] AssemblyAI upload failed ${uploadRes.status}: ${body.slice(0, 500)}`
    );
    return null;
  }
  const { upload_url } = await uploadRes.json();

  const createRes = await fetchWithRetry(`${ASSEMBLYAI_BASE}/transcript`, {
    method: 'POST',
    headers: assemblyHeaders(),
    body: JSON.stringify({
      audio_url: upload_url,
      speech_models: ['universal-3-pro'],
      speaker_labels: true,
      auto_chapters: false,
      punctuate: true,
      format_text: true,
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    console.error(
      `[transcribe] AssemblyAI create failed ${createRes.status}: ${body.slice(0, 500)}`
    );
    return null;
  }
  const { id } = await createRes.json();

  const deadline = Date.now() + timeoutMs;
  let delayMs = 1500;

  while (Date.now() < deadline) {
    const pollRes = await fetchWithRetry(`${ASSEMBLYAI_BASE}/transcript/${id}`, {
      headers: assemblyHeaders(),
    });
    if (!pollRes.ok) {
      const body = await pollRes.text();
      console.error(`[transcribe] AssemblyAI poll failed ${pollRes.status}: ${body.slice(0, 300)}`);
      return null;
    }
    const json = await pollRes.json();

    if (json.status === 'completed') {
      const result = parseAssemblyTranscript(json);
      if (!result) {
        console.error('[transcribe] AssemblyAI completed without transcript text or segments');
        return null;
      }
      console.log(
        `[transcribe] AssemblyAI returned ${result.text.length} chars, ${result.segments.length} segments`
      );
      return result;
    }

    if (json.status === 'error') {
      console.error('[transcribe] AssemblyAI transcript error:', json.error);
      return null;
    }

    await wait(delayMs);
    delayMs = Math.min(delayMs + 1000, 5000);
  }

  console.error('[transcribe] AssemblyAI polling timed out');
  return null;
}

// ---------------------------------------------------------------------------
// Claude Audio fallback
// ---------------------------------------------------------------------------

/**
 * Fallback transcription using Claude's audio understanding.
 * Sends the audio file directly to Claude and asks it to transcribe.
 * Used when both AssemblyAI and Whisper fail.
 */
async function transcribeWithClaude(
  audioPath: string,
): Promise<TranscriptionResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[transcribe] ANTHROPIC_API_KEY not set — skipping Claude audio fallback');
    return null;
  }

  // Claude audio input supports up to ~25MB
  const fileSize = statSync(audioPath).size;
  if (fileSize > 25 * 1024 * 1024) {
    console.warn(`[transcribe] Audio file too large for Claude audio fallback (${(fileSize / 1024 / 1024).toFixed(1)} MB) — skipping`);
    return null;
  }

  console.log('[transcribe] Attempting Claude audio fallback…');

  const fileData = readFileSync(audioPath);
  const audioBase64 = fileData.toString('base64');

  // Determine media type from file extension
  const ext = audioPath.split('.').pop()?.toLowerCase();
  const mediaTypeMap: Record<string, string> = {
    wav: 'audio/wav',
    mp3: 'audio/mp3',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
  };
  const mediaType = mediaTypeMap[ext ?? ''] ?? 'audio/wav';

  try {
    const anthropic = new Anthropic({ apiKey });
    // The Anthropic API supports audio content blocks but the SDK types may lag behind.
    // Use a type assertion to pass the audio content block.
    const audioBlock = {
      type: 'audio',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: audioBase64,
      },
    };
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          audioBlock as unknown as Anthropic.Messages.ContentBlockParam,
          {
            type: 'text',
            text: `Transcribe all speech in this audio. Return ONLY valid JSON (no markdown):
{
  "text": "full transcript as a single string",
  "segments": [
    {"start": 0.0, "end": 2.5, "text": "segment text here"}
  ]
}
Rules:
- Transcribe every spoken word faithfully
- Estimate timestamps as best you can (seconds from start)
- If there is no speech, return {"text": "", "segments": []}
- Do not add commentary or explanation — only the JSON`,
          },
        ],
      }],
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    let jsonStr = responseText;
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);
    const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
    const segments = normalizeSegments(
      (Array.isArray(parsed.segments) ? parsed.segments : []).map(
        (s: { start: number; end: number; text: string }) => ({
          start: Number(s.start) || 0,
          end: Number(s.end) || 0,
          text: String(s.text || ''),
        })
      )
    );

    if (!text && segments.length === 0) {
      console.warn('[transcribe] Claude audio fallback returned empty transcript');
      return null;
    }

    // Claude audio fallback gets a lower base confidence since timestamps are estimated
    const baseConfidence = computeConfidence(text, segments);
    const adjustedConfidence = Math.min(0.35, Number((baseConfidence * 0.85).toFixed(2)));

    console.log(
      `[transcribe] Claude audio fallback returned ${text.length} chars, ${segments.length} segments (confidence: ${adjustedConfidence})`
    );
    return { text, segments, provider: 'claude-audio', confidence: adjustedConfidence };
  } catch (err) {
    console.error('[transcribe] Claude audio fallback failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Transcribe audio using AssemblyAI (preferred when available for timed segments),
 * OpenAI Whisper as first fallback, or Claude audio understanding as last resort.
 */
export async function transcribeAudio(
  audioPath: string,
  timeoutMs: number = 120000
): Promise<TranscriptionResult | null> {
  if (!existsSync(audioPath)) {
    console.error(`[transcribe] Audio file not found: ${audioPath}`);
    return null;
  }
  const size = statSync(audioPath).size;
  if (size === 0) {
    console.error(`[transcribe] Audio file is empty (0 bytes): ${audioPath}`);
    return null;
  }
  console.log(`[transcribe] Audio file: ${audioPath} (${(size / 1024).toFixed(1)} KB)`);

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAssemblyAI = !!process.env.ASSEMBLYAI_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;

  if (!hasOpenAI && !hasAssemblyAI && !hasClaude) {
    console.error(
      '[transcribe] NO TRANSCRIPTION API KEY SET. Set OPENAI_API_KEY, ASSEMBLYAI_API_KEY, or ANTHROPIC_API_KEY to enable audio transcription.'
    );
    return null;
  }

  const providers = [
    hasAssemblyAI ? () => transcribeWithAssemblyAI(audioPath, timeoutMs) : null,
    hasOpenAI ? () => transcribeWithWhisper(audioPath) : null,
  ].filter(Boolean) as Array<() => Promise<TranscriptionResult | null>>;

  for (const runProvider of providers) {
    try {
      const result = await runProvider();
      if (result?.text || result?.segments.length) return result;
    } catch (err) {
      console.error('[transcribe] Provider failed:', err);
    }
  }

  // Fallback: use Claude audio understanding if primary providers failed
  if (hasClaude) {
    console.log('[transcribe] Primary providers failed — trying Claude audio fallback');
    try {
      const claudeResult = await transcribeWithClaude(audioPath);
      if (claudeResult?.text || claudeResult?.segments.length) return claudeResult;
    } catch (err) {
      console.error('[transcribe] Claude audio fallback failed:', err);
    }
  }

  console.error(
    '[transcribe] All transcription methods failed. ' +
      `Providers attempted: ${[hasAssemblyAI && 'AssemblyAI', hasOpenAI && 'Whisper', hasClaude && 'Claude'].filter(Boolean).join(', ')}`
  );
  return null;
}
