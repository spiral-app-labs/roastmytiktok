import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://eayiazyiotnkggnsvhto.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
