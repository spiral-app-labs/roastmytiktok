import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Content Calendar',
  description: 'Plan your TikTok content schedule with AI-informed posting recommendations.',
  alternates: { canonical: '/calendar' },
};

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
