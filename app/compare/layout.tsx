import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Compare Roasts',
  description: 'Compare roast scores side by side to track your TikTok improvement over time.',
  alternates: { canonical: '/compare' },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
