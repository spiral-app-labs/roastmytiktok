import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Roast History',
  description: 'Review your past TikTok roasts, track score trends, and spot recurring issues across your content.',
  alternates: { canonical: '/history' },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
