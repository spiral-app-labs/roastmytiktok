import type { User } from '@supabase/supabase-js';
import type { SubscriptionSnapshot } from '@/lib/billing-shared';

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readMetadata(user: User): Record<string, unknown> {
  return (user.user_metadata ?? {}) as Record<string, unknown>;
}

export function buildAccountExport(user: User, options: {
  roastSessions: Array<Record<string, unknown>>;
  nicheProfile: Record<string, unknown> | null;
  nichePatterns: Array<Record<string, unknown>>;
  subscription: SubscriptionSnapshot;
}) {
  const metadata = readMetadata(user);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      debugLevel: readString(metadata.debug_level),
      nicheCategory: readString(metadata.niche_category),
      inspirationCreators: readArray(metadata.inspiration_creators),
      subscription: {
        plan: options.subscription.planLabel,
        status: options.subscription.status,
        renewalDate: options.subscription.renewalDate,
      },
    },
    roastSessions: options.roastSessions,
    nicheProfile: options.nicheProfile,
    nichePatterns: options.nichePatterns,
  };
}
