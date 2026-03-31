import { readFileSync, existsSync, statSync } from 'fs';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  provider?: 'assemblyai' | 'whisper';
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
  return { text, segments, provider: 'whisper' };
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

  // AC3-fix: Wrap the upload in a per-step try/catch so a network-level
  // failure during upload doesn't crash the entire function.
  let upload_url: string;
  try {
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
    const uploadJson = await uploadRes.json();
    upload_url = uploadJson.upload_url;
  } catch (uploadErr) {
    console.error('[transcribe] AssemblyAI upload network error:', uploadErr instanceof Error ? uploadErr.message : uploadErr);
    return null;
  }

  const createRes = await fetchWithRetry(`${ASSEMBLYAI_BASE}/transcript`, {
    method: 'POST',
    headers: assemblyHeaders(),
    body: JSON.stringify({
      audio_url: upload_url,
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

  let consecutivePollFailures = 0;
  while (Date.now() < deadline) {
    try {
      const pollRes = await fetchWithRetry(`${ASSEMBLYAI_BASE}/transcript/${id}`, {
        headers: assemblyHeaders(),
      });
      if (!pollRes.ok) {
        const body = await pollRes.text();
        console.error(`[transcribe] AssemblyAI poll failed ${pollRes.status}: ${body.slice(0, 300)}`);
        // AC3-fix: Allow up to 3 consecutive poll failures before giving up
        // (transient network blips shouldn't kill the whole transcription).
        consecutivePollFailures++;
        if (consecutivePollFailures >= 3) {
          console.error('[transcribe] AssemblyAI poll failed 3 times consecutively — giving up');
          return null;
        }
        await wait(delayMs);
        delayMs = Math.min(delayMs + 1000, 5000);
        continue;
      }
      consecutivePollFailures = 0;
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
    } catch (pollErr) {
      console.warn('[transcribe] AssemblyAI poll network error:', pollErr instanceof Error ? pollErr.message : pollErr);
      consecutivePollFailures++;
      if (consecutivePollFailures >= 3) {
        console.error('[transcribe] AssemblyAI poll failed 3 times consecutively — giving up');
        return null;
      }
    }

    await wait(delayMs);
    delayMs = Math.min(delayMs + 1000, 5000);
  }

  console.error('[transcribe] AssemblyAI polling timed out');
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Transcribe audio using AssemblyAI (preferred when available for timed segments)
 * or OpenAI Whisper as a fallback.
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

  if (!hasOpenAI && !hasAssemblyAI) {
    console.error(
      '[transcribe] NO TRANSCRIPTION API KEY SET. Set OPENAI_API_KEY or ASSEMBLYAI_API_KEY to enable audio transcription.'
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

  console.error(
    '[transcribe] All transcription methods failed. ' +
      `Providers attempted: ${[hasAssemblyAI && 'AssemblyAI', hasOpenAI && 'Whisper'].filter(Boolean).join(', ')}`
  );

  // AC3-fix: Return a hardened fallback result instead of null so
  // downstream agents always receive structured context and can note
  // that audio analysis was attempted but unavailable.
  return {
    text: '',
    segments: [],
    provider: undefined,
  } as TranscriptionResult;
}
