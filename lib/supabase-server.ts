import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://eayiazyiotnkggnsvhto.supabase.co';
// Fallback to a placeholder at build time so createClient doesn't throw during
// static page collection (the real key is set via env vars at runtime on Vercel).
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-build-key';

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
