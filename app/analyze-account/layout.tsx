import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Analysis',
  description: 'Get a full TikTok account audit - content patterns, growth blockers, and actionable strategy from AI agents.',
  alternates: { canonical: '/analyze-account' },
};

export default function AnalyzeAccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
