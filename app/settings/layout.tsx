import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your Go Viral account settings, preferences, and subscription.',
  alternates: { canonical: '/settings' },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
