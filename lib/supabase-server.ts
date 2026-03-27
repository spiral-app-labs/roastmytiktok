import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://eayiazyiotnkggnsvhto.supabase.co';

let _client: SupabaseClient | null = null;

export const supabaseServer: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_client) {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
      _client = createClient(SUPABASE_URL, key);
    }
    return Reflect.get(_client, prop, receiver);
  },
});
