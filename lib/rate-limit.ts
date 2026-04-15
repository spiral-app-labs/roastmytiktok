import type { NextRequest } from 'next/server';
import { createClient } from './supabase/server';
import { getSubscriptionSnapshotForUserId } from './entitlements';

export type UsagePlan = 'free' | 'paid';

export interface RequestEntitlement {
  plan: UsagePlan;
  userId: string | null;
}

export async function resolveRequestEntitlement(req: NextRequest): Promise<RequestEntitlement> {
  void req;
  let userId: string | null = null;
  let plan: UsagePlan = 'free';

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    if (userId) {
      const subscription = await getSubscriptionSnapshotForUserId(userId);
      plan = subscription.isSubscribed ? 'paid' : 'free';
    }
  } catch (error) {
    console.warn('[rate-limit] Failed to resolve auth user for usage checks:', error);
  }

  return {
    plan,
    userId,
  };
}
