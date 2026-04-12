const DEFAULT_SUPABASE_URL = 'https://eayiazyiotnkggnsvhto.supabase.co';

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function decodeJwtPayload(token: string): string | null {
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return atob(padded);
  } catch {
    return null;
  }
}

function isServiceRoleJwt(value: string): boolean {
  const payload = decodeJwtPayload(value);
  if (!payload) {
    return false;
  }

  return payload.includes('"role":"service_role"') || payload.includes('"role":"supabase_admin"');
}

export function assertSafePublicSupabaseKey(value: string, envName: string): string {
  if (value.startsWith('sb_secret_') || isServiceRoleJwt(value)) {
    throw new Error(
      `${envName} is configured with a Supabase secret/service-role key. ` +
        'Use the public anon or publishable key instead.'
    );
  }

  return value;
}

export function getSupabasePublicEnv() {
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = assertSafePublicSupabaseKey(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );

  return { url, anonKey };
}

export function getSupabaseServiceEnv(options?: { allowPlaceholderServiceRole?: boolean }) {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    DEFAULT_SUPABASE_URL;

  const serviceRoleKey = options?.allowPlaceholderServiceRole
    ? process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || 'placeholder-build-key'
    : getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  return { url, serviceRoleKey };
}
