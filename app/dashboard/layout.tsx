import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Find What Goes Viral',
  description: 'Upload TikToks and get AI-powered roasts with hook rewrites, reshoot plans, and honest scores.',
  alternates: { canonical: '/dashboard' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
