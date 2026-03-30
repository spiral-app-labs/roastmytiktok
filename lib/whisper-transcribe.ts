import { readFileSync, existsSync, statSync } from 'fs';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
}

// ---------------------------------------------------------------------------
// OpenAI Whisper API (primary)
// ---------------------------------------------------------------------------

async function transcribeWithWhisper(
  audioPath: string
): Promise<TranscriptionResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[transcribe] OPENAI_API_KEY not set — skipping Whisper');
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
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
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

  const json = await res.json();
  const text: string = json.text ?? '';
  const segments: TranscriptionSegment[] = (json.segments ?? []).map(
    (s: { start: number; end: number; text: string }) => ({
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    })
  );

  console.log(
    `[transcribe] Whisper returned ${text.length} chars, ${segments.length} segments`
  );
  return { text, segments };
}

// ---------------------------------------------------------------------------
// AssemblyAI (fallback)
// ---------------------------------------------------------------------------

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2';

function assemblyHeaders(): Record<string, string> {
  return {
    authorization: process.env.ASSEMBLYAI_API_KEY!,
    'content-type': 'application/json',
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

  // Upload
  const data = readFileSync(audioPath);
  const uploadRes = await fetch(`${ASSEMBLYAI_BASE}/upload`, {
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

  // Create transcript
  const createRes = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
    method: 'POST',
    headers: assemblyHeaders(),
    body: JSON.stringify({ audio_url: upload_url, speaker_labels: true }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    console.error(
      `[transcribe] AssemblyAI create failed ${createRes.status}: ${body.slice(0, 500)}`
    );
    return null;
  }
  const { id } = await createRes.json();

  // Poll
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pollRes = await fetch(`${ASSEMBLYAI_BASE}/transcript/${id}`, {
      headers: assemblyHeaders(),
    });
    if (!pollRes.ok) {
      console.error(`[transcribe] AssemblyAI poll failed ${pollRes.status}`);
      return null;
    }
    const json = await pollRes.json();

    if (json.status === 'completed') {
      const segments: TranscriptionSegment[] = (json.words ?? []).map(
        (w: { start: number; end: number; text: string }) => ({
          start: w.start / 1000,
          end: w.end / 1000,
          text: w.text,
        })
      );
      console.log(
        `[transcribe] AssemblyAI returned ${(json.text ?? '').length} chars, ${segments.length} segments`
      );
      return { text: json.text ?? '', segments };
    }

    if (json.status === 'error') {
      console.error('[transcribe] AssemblyAI transcript error:', json.error);
      return null;
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  console.error('[transcribe] AssemblyAI polling timed out');
  return null;
}

// ---------------------------------------------------------------------------
// Public API — tries Whisper first, then AssemblyAI
// ---------------------------------------------------------------------------

/**
 * Transcribe audio using OpenAI Whisper (primary) or AssemblyAI (fallback).
 *
 * @param audioPath Path to an audio file (WAV, MP3, etc.)
 * @param timeoutMs Maximum time to wait for AssemblyAI polling (default 120s)
 */
export async function transcribeAudio(
  audioPath: string,
  timeoutMs: number = 120000
): Promise<TranscriptionResult | null> {
  // Validate input file
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

  // Try OpenAI Whisper first
  if (hasOpenAI) {
    try {
      const result = await transcribeWithWhisper(audioPath);
      if (result?.text) return result;
      console.warn('[transcribe] Whisper returned empty result, trying fallback…');
    } catch (err) {
      console.error('[transcribe] Whisper failed:', err);
    }
  }

  // Fallback to AssemblyAI
  if (hasAssemblyAI) {
    try {
      const result = await transcribeWithAssemblyAI(audioPath, timeoutMs);
      if (result?.text) return result;
      console.warn('[transcribe] AssemblyAI returned empty result');
    } catch (err) {
      console.error('[transcribe] AssemblyAI failed:', err);
    }
  }

  console.error(
    '[transcribe] All transcription methods failed. ' +
      `Providers attempted: ${[hasOpenAI && 'Whisper', hasAssemblyAI && 'AssemblyAI'].filter(Boolean).join(', ')}`
  );
  return null;
}
