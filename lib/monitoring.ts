/*
 * Supabase table definition (for future migration):
 *
 * CREATE TABLE rmt_monitors (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   session_id text NOT NULL,
 *   video_url text,
 *   filename text,
 *   frequency text DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
 *   last_run_at timestamptz,
 *   next_run_at timestamptz,
 *   is_active boolean DEFAULT true,
 *   created_at timestamptz DEFAULT now()
 * );
 */

'use client';

const MONITORS_KEY = 'rmt_monitors';

export type Frequency = 'daily' | 'weekly' | 'monthly';
export type ScoreTrend = 'improving' | 'declining' | 'stable';

export interface MonitorEntry {
  id: string;
  filename: string;
  lastScore: number;
  previousScore: number | null;
  scoreHistory: number[];
  frequency: Frequency;
  isActive: boolean;
  createdAt: string;
  lastRunAt: string;
}

export function getMonitors(): MonitorEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MONITORS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMonitors(monitors: MonitorEntry[]): void {
  localStorage.setItem(MONITORS_KEY, JSON.stringify(monitors));
}

export function addMonitor(filename: string, score: number, frequency: Frequency = 'weekly'): MonitorEntry {
  const monitors = getMonitors();

  const entry: MonitorEntry = {
    id: `mon_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    filename,
    lastScore: score,
    previousScore: null,
    scoreHistory: [score],
    frequency,
    isActive: true,
    createdAt: new Date().toISOString(),
    lastRunAt: new Date().toISOString(),
  };

  monitors.unshift(entry);
  saveMonitors(monitors);
  return entry;
}

export function updateMonitor(id: string, score: number): MonitorEntry | null {
  const monitors = getMonitors();
  const monitor = monitors.find(m => m.id === id);
  if (!monitor) return null;

  monitor.previousScore = monitor.lastScore;
  monitor.lastScore = score;
  monitor.scoreHistory.push(score);
  monitor.lastRunAt = new Date().toISOString();

  saveMonitors(monitors);
  return monitor;
}

export function toggleMonitor(id: string): MonitorEntry | null {
  const monitors = getMonitors();
  const monitor = monitors.find(m => m.id === id);
  if (!monitor) return null;

  monitor.isActive = !monitor.isActive;
  saveMonitors(monitors);
  return monitor;
}

export function removeMonitor(id: string): void {
  const monitors = getMonitors().filter(m => m.id !== id);
  saveMonitors(monitors);
}

export function getScoreTrend(monitor: MonitorEntry): ScoreTrend {
  const { scoreHistory } = monitor;
  if (scoreHistory.length < 2) return 'stable';

  // Compare average of last 2 scores vs previous 2
  const recent = scoreHistory.slice(-2);
  const earlier = scoreHistory.slice(-4, -2);

  if (earlier.length === 0) {
    // Only 2 data points — compare directly
    const diff = recent[recent.length - 1] - recent[0];
    if (diff > 3) return 'improving';
    if (diff < -3) return 'declining';
    return 'stable';
  }

  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgEarlier = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const diff = avgRecent - avgEarlier;

  if (diff > 3) return 'improving';
  if (diff < -3) return 'declining';
  return 'stable';
}

export function getLetterGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#facc15';
  if (score >= 40) return '#fb923c';
  return '#f87171';
}
