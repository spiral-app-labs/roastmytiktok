/**
 * Structured logging for the analysis pipeline.
 * Emits JSON logs so failures are searchable and trackable.
 */

export type AnalysisStage =
  | 'frame-extraction'
  | 'audio-extraction'
  | 'transcription'
  | 'speech-music-detect'
  | 'caption-quality'
  | 'agent'
  | 'verdict'
  | 'supabase-save'
  | 'cleanup';

export interface AnalysisLogEntry {
  stage: AnalysisStage;
  sessionId: string;
  ok: boolean;
  durationMs?: number;
  error?: string;
  detail?: Record<string, unknown>;
}

function formatEntry(entry: AnalysisLogEntry): string {
  return JSON.stringify({
    ts: new Date().toISOString(),
    pipeline: 'rmt-analyze',
    ...entry,
  });
}

export function logSuccess(stage: AnalysisStage, sessionId: string, detail?: Record<string, unknown>, durationMs?: number): void {
  console.log(formatEntry({ stage, sessionId, ok: true, durationMs, detail }));
}

export function logFailure(stage: AnalysisStage, sessionId: string, error: unknown, detail?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(formatEntry({ stage, sessionId, ok: false, error: message, detail }));
}

/**
 * Time an async operation and log success/failure automatically.
 */
export async function withStageLog<T>(
  stage: AnalysisStage,
  sessionId: string,
  fn: () => Promise<T>,
  detail?: Record<string, unknown>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logSuccess(stage, sessionId, detail, Date.now() - start);
    return result;
  } catch (err) {
    logFailure(stage, sessionId, err, { ...detail, durationMs: Date.now() - start });
    throw err;
  }
}
