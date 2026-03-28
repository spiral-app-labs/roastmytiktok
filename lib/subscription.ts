'use client';

import { useState, useEffect } from 'react';

const PAID_KEY = 'rmt_paid';

export function isPaidUser(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PAID_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useIsPaid(): boolean {
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    setPaid(isPaidUser());
  }, []);

  return paid;
}
