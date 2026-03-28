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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelineInstance: any = null;

async function getWhisperPipeline() {
  if (pipelineInstance) return pipelineInstance;

  // Dynamic import to avoid bundling issues with Next.js
  const { pipeline } = await import('@xenova/transformers');
  pipelineInstance = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
    quantized: true,
  });
  return pipelineInstance;
}

/**
 * Convert a WAV file (16kHz mono PCM) to a Float32Array of audio samples.
 */
function wavToFloat32(wavPath: string): Float32Array {
  const buffer = readFileSync(wavPath);

  // WAV header is 44 bytes for standard PCM
  const headerSize = 44;
  const dataBuffer = buffer.subarray(headerSize);

  // Convert Int16 PCM samples to Float32 [-1.0, 1.0]
  const samples = new Float32Array(dataBuffer.length / 2);
  for (let i = 0; i < samples.length; i++) {
    const int16 = dataBuffer.readInt16LE(i * 2);
    samples[i] = int16 / 32768.0;
  }

  return samples;
}

/**
 * Transcribe audio using local Whisper model via @xenova/transformers.
 * Returns transcript text and timestamped segments.
 *
 * @param audioPath Path to a 16kHz mono WAV file
 * @param timeoutMs Maximum time to wait for transcription (default 45s)
 */
export async function transcribeAudio(
  audioPath: string,
  timeoutMs: number = 45000
): Promise<TranscriptionResult | null> {
  try {
    const audioData = wavToFloat32(audioPath);

    const transcriber = await Promise.race([
      getWhisperPipeline(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Whisper model load timeout')), timeoutMs)
      ),
    ]);

    const result = await Promise.race([
      transcriber(audioData, {
        return_timestamps: true,
        chunk_length_s: 30,
        stride_length_s: 5,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Transcription timeout')), timeoutMs)
      ),
    ]);

    const text: string = result.text?.trim() ?? '';
    const segments: TranscriptionSegment[] = [];

    if (result.chunks && Array.isArray(result.chunks)) {
      for (const chunk of result.chunks) {
        segments.push({
          start: chunk.timestamp?.[0] ?? 0,
          end: chunk.timestamp?.[1] ?? 0,
          text: (chunk.text ?? '').trim(),
        });
      }
    }

    return { text, segments };
  } catch (err) {
    console.warn('[whisper-transcribe] Transcription failed:', err);
    return null;
  }
}
