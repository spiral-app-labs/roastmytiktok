import type { NextRequest } from 'next/server';
import { createClient } from './supabase/server';

export type UsagePlan = 'free' | 'paid';

export interface RequestEntitlement {
  plan: UsagePlan;
  userId: string | null;
}

export function isPaidUser(req: NextRequest): boolean {
  return req.cookies.get('rmt_paid_bypass')?.value === '1';
}

export async function resolveRequestEntitlement(req: NextRequest): Promise<RequestEntitlement> {
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch (error) {
    console.warn('[rate-limit] Failed to resolve auth user for usage checks:', error);
  }

  return {
    plan: isPaidUser(req) ? 'paid' : 'free',
    userId,
  };
}
