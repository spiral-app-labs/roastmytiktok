import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Track your viral score trends, dimension performance, and content improvements over time.',
  alternates: { canonical: '/analytics' },
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
