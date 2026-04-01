import { GeneratedScript } from '@/app/api/generate-script/route';

export type ScriptSource = 'roast' | 'created' | 'improved';

export interface SavedScript {
  id: string;
  roastId: string;
  roastScore: number;
  tiktokUrl: string;
  script: GeneratedScript;
  generatedAt: string;
  source?: ScriptSource;
  topic?: string;
}

const STORAGE_KEY = 'rmt_script_history';

export function saveScript(entry: Omit<SavedScript, 'id'>): SavedScript {
  const saved: SavedScript = {
    ...entry,
    id: `${entry.roastId}_${Date.now()}`,
  };

  try {
    const existing = getScripts();
    // Keep the most recent per roastId + prepend new
    const deduped = [saved, ...existing.filter((s) => s.id !== saved.id)];
    // Cap at 50 entries
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deduped.slice(0, 50)));
  } catch {
    // localStorage unavailable
  }

  return saved;
}

export function getScripts(): SavedScript[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedScript[];
  } catch {
    return [];
  }
}

export function getScriptsForRoast(roastId: string): SavedScript[] {
  return getScripts().filter((s) => s.roastId === roastId);
}

export function deleteScript(id: string): void {
  try {
    const updated = getScripts().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
