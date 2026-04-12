import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceEnv } from '@/lib/supabase/env';

const { url, serviceRoleKey } = getSupabaseServiceEnv({ allowPlaceholderServiceRole: true });

export const supabaseServer = createClient(url, serviceRoleKey);
