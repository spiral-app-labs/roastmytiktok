import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicEnv } from './env'

const { url, anonKey } = getSupabasePublicEnv()

export function createClient() {
  return createBrowserClient(url, anonKey)
}
