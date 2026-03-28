import { readFileSync } from 'fs';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
}

const ASSEMBLYAI_BASE = 'https://api.assemblyai.com/v2';

function getApiKey(): string | null {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) return null;
  return key;
}

function headers(): Record<string, string> {
  return { authorization: getApiKey()!, 'content-type': 'application/json' };
}

async function uploadAudio(audioPath: string): Promise<string> {
  const data = readFileSync(audioPath);
  const res = await fetch(`${ASSEMBLYAI_BASE}/upload`, {
    method: 'POST',
    headers: { authorization: getApiKey()!, 'content-type': 'application/octet-stream' },
    body: data,
  });
  if (!res.ok) throw new Error(`AssemblyAI upload failed: ${res.status}`);
  const json = await res.json();
  return json.upload_url;
}

async function createTranscript(audioUrl: string): Promise<string> {
  const res = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ audio_url: audioUrl, speaker_labels: true }),
  });
  if (!res.ok) throw new Error(`AssemblyAI transcript create failed: ${res.status}`);
  const json = await res.json();
  return json.id;
}

async function pollTranscript(
  id: string,
  timeoutMs: number
): Promise<TranscriptionResult | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${ASSEMBLYAI_BASE}/transcript/${id}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`AssemblyAI poll failed: ${res.status}`);
    const json = await res.json();

    if (json.status === 'completed') {
      const segments: TranscriptionSegment[] = (json.words ?? []).map(
        (w: { start: number; end: number; text: string }) => ({
          start: w.start / 1000,
          end: w.end / 1000,
          text: w.text,
        })
      );
      return { text: json.text ?? '', segments };
    }

    if (json.status === 'error') {
      console.warn('[assemblyai-transcribe] Transcript error:', json.error);
      return null;
    }

    // Wait 3 seconds before polling again
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.warn('[assemblyai-transcribe] Polling timed out');
  return null;
}

/**
 * Transcribe audio using AssemblyAI REST API.
 * Returns transcript text and timestamped segments.
 *
 * @param audioPath Path to an audio file (WAV, MP3, etc.)
 * @param timeoutMs Maximum time to wait for transcription (default 120s)
 */
export async function transcribeAudio(
  audioPath: string,
  timeoutMs: number = 120000
): Promise<TranscriptionResult | null> {
  try {
    if (!getApiKey()) {
      console.warn('[assemblyai-transcribe] ASSEMBLYAI_API_KEY not set, skipping transcription');
      return null;
    }
    const uploadUrl = await uploadAudio(audioPath);
    const transcriptId = await createTranscript(uploadUrl);
    return await pollTranscript(transcriptId, timeoutMs);
  } catch (err) {
    console.warn('[assemblyai-transcribe] Transcription failed:', err);
    return null;
  }
}
