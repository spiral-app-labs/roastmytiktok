import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Upload TikToks and get AI-powered roasts with hook rewrites, reshoot plans, and honest scores.',
  alternates: { canonical: '/dashboard' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
