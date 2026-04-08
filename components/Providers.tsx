'use client';

import { ToastProvider } from '@/components/ui/Toast';
import { CookieConsent } from '@/components/CookieConsent';
import { ThemeProvider } from '@/components/ThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
        <CookieConsent />
      </ToastProvider>
    </ThemeProvider>
  );
}
