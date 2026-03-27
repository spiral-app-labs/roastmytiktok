import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://eayiazyiotnkggnsvhto.supabase.co';
// Fallback to a placeholder at build time so createClient doesn't throw during
// static page collection (the real key is set via env vars at runtime on Vercel).
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-build-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export type RoastSession = {
  id: string;
  session_id: string;
  created_at: string;
  source: 'upload' | 'url';
  filename?: string;
  video_url?: string;
  tiktok_url?: string;
  overall_score: number;
  verdict: string;
  agent_scores: Record<string, number>;
  findings: Record<string, string[]>;
};
