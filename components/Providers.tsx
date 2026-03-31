'use client';

import { ToastProvider } from '@/components/ui/Toast';
import { CookieConsent } from '@/components/CookieConsent';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <CookieConsent />
    </ToastProvider>
  );
}
